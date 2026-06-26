package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"sync"
	"sync/atomic"
	"time"
)

const (
	apiURL      = "https://encuentralos.tecnosoft.dev/api/personas"
	pageSize    = 1000
	concurrency = 30
	outputFile  = "personas.csv"
)

type Person struct {
	ID              string   `json:"id"`
	Nombre          string   `json:"nombre"`
	Edad            *int     `json:"edad"`
	Sexo            string   `json:"sexo"`
	Descripcion     string   `json:"descripcion"`
	Foto            string   `json:"foto"`
	UltimaUbicacion string   `json:"ultima_ubicacion"`
	UltimaLat       *float64 `json:"ultima_lat"`
	UltimaLng       *float64 `json:"ultima_lng"`
	UltimaVez       string   `json:"ultima_vez"`
	ReportaContacto string   `json:"reporta_contacto"`
	Estado          string   `json:"estado"`
	Creado          string   `json:"creado"`
	Cedula          string   `json:"cedula"`
}

type Response struct {
	Items []Person `json:"items"`
	Total int      `json:"total"`
}

func newClient() *http.Client {
	return &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			MaxIdleConnsPerHost: concurrency,
			IdleConnTimeout:     90 * time.Second,
		},
	}
}

func fetch(client *http.Client, limit, offset int) (*Response, error) {
	url := fmt.Sprintf("%s?limit=%d&offset=%d", apiURL, limit, offset)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Accept", "application/json")

	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(attempt) * 2 * time.Second)
		}
		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		defer resp.Body.Close()
		if resp.StatusCode != 200 {
			lastErr = fmt.Errorf("status %d", resp.StatusCode)
			continue
		}
		var result Response
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			return nil, err
		}
		return &result, nil
	}
	return nil, lastErr
}

func intStr(p *int) string {
	if p == nil {
		return ""
	}
	return strconv.Itoa(*p)
}

func floatStr(p *float64) string {
	if p == nil {
		return ""
	}
	return strconv.FormatFloat(*p, 'f', 6, 64)
}

func main() {
	start := time.Now()
	client := newClient()

	fmt.Println("Obteniendo total de registros...")
	first, err := fetch(client, 1, 0)
	if err != nil {
		log.Fatalf("Error en primera petición: %v", err)
	}
	total := first.Total
	pages := (total + pageSize - 1) / pageSize
	fmt.Printf("Total: %d personas · %d páginas\n", total, pages)

	_, src, _, _ := runtime.Caller(0)
	f, err := os.Create(filepath.Join(filepath.Dir(src), outputFile))
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()

	w := csv.NewWriter(f)
	defer w.Flush()
	_ = w.Write([]string{
		"id", "nombre", "edad", "sexo", "descripcion", "foto",
		"ultima_ubicacion", "ultima_lat", "ultima_lng", "ultima_vez",
		"reporta_contacto", "estado", "creado", "cedula",
	})

	offsets := make(chan int, pages)
	for o := 0; o < total; o += pageSize {
		offsets <- o
	}
	close(offsets)

	var (
		mu        sync.Mutex
		wg        sync.WaitGroup
		processed atomic.Int64
		written   atomic.Int64
	)

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for offset := range offsets {
				result, err := fetch(client, pageSize, offset)
				if err != nil {
					log.Printf("SKIP offset=%d: %v", offset, err)
					continue
				}
				mu.Lock()
				for _, p := range result.Items {
					_ = w.Write([]string{
						p.ID, p.Nombre, intStr(p.Edad), p.Sexo,
						p.Descripcion, p.Foto, p.UltimaUbicacion,
						floatStr(p.UltimaLat), floatStr(p.UltimaLng),
						p.UltimaVez, p.ReportaContacto, p.Estado,
						p.Creado, p.Cedula,
					})
				}
				mu.Unlock()

				written.Add(int64(len(result.Items)))
				done := processed.Add(1)
				if done%5 == 0 || done == int64(pages) {
					fmt.Printf("\r  %d/%d páginas · %d personas", done, pages, written.Load())
				}
			}
		}()
	}

	wg.Wait()
	fmt.Printf("\r  %d/%d páginas · %d personas\n", pages, pages, written.Load())
	fmt.Printf("Listo en %.1fs → %s\n", time.Since(start).Seconds(), outputFile)
}
