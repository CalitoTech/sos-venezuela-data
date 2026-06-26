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
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

const (
	apiURL      = "https://ayudavenezuela.info/api/personas"
	statsURL    = "https://ayudavenezuela.info/api/stats"
	pageSize    = 50
	concurrency = 10
	outputFile  = "personas.csv"
)

// flexInt unmarshals JSON integers that the API sometimes sends as strings.
type flexInt struct{ v *int }

func (f *flexInt) UnmarshalJSON(b []byte) error {
	if string(b) == "null" {
		return nil
	}
	// try number first
	var n int
	if err := json.Unmarshal(b, &n); err == nil {
		f.v = &n
		return nil
	}
	// fall back to quoted string
	var s string
	if err := json.Unmarshal(b, &s); err != nil {
		return err
	}
	if s == "" {
		return nil
	}
	// strip non-numeric suffix (e.g. "45 años" → "45")
	raw := strings.Fields(s)[0]
	n, err := strconv.Atoi(raw)
	if err != nil {
		return err
	}
	f.v = &n
	return nil
}

type Person struct {
	ID                string  `json:"id"`
	Tipo              string  `json:"tipo"`
	Nombre            string  `json:"nombre"`
	Cedula            string  `json:"cedula"`
	Edad              flexInt `json:"edad"`
	EstadoPersona     string  `json:"estado_persona"`
	Estado            string  `json:"estado"`
	Municipio         string  `json:"municipio"`
	Descripcion       string  `json:"descripcion"`
	Nota              string  `json:"nota"`
	Autor             string  `json:"autor"`
	Contacto          string  `json:"contacto"`
	Timestamp         string  `json:"timestamp"`
	Verificado        bool    `json:"verificado"`
	Reportado         bool    `json:"reportado"`
	TieneFoto         bool    `json:"tiene_foto"`
	LocalizadoPor     string  `json:"localizadoPor"`
	LocalizadoContacto string `json:"localizadoContacto"`
}

type Stats struct {
	Total string `json:"personas_total"`
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

func getTotal(client *http.Client) (int, error) {
	resp, err := client.Get(statsURL)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	var s Stats
	if err := json.NewDecoder(resp.Body).Decode(&s); err != nil {
		return 0, err
	}
	return strconv.Atoi(s.Total)
}

func fetch(client *http.Client, offset int) ([]Person, error) {
	url := fmt.Sprintf("%s?limit=%d&offset=%d", apiURL, pageSize, offset)
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
		if resp.StatusCode != 200 {
			resp.Body.Close()
			lastErr = fmt.Errorf("status %d", resp.StatusCode)
			continue
		}
		var items []Person
		err = json.NewDecoder(resp.Body).Decode(&items)
		resp.Body.Close()
		if err != nil {
			return nil, err
		}
		return items, nil
	}
	return nil, lastErr
}

func intStr(f flexInt) string {
	if f.v == nil {
		return ""
	}
	return strconv.Itoa(*f.v)
}

func main() {
	start := time.Now()
	client := newClient()

	fmt.Println("Obteniendo total de registros...")
	total, err := getTotal(client)
	if err != nil {
		log.Fatalf("Error al obtener stats: %v", err)
	}
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
		"id", "tipo", "nombre", "cedula", "edad",
		"estado_persona", "estado", "municipio",
		"descripcion", "nota", "autor", "contacto",
		"timestamp", "verificado", "reportado", "tiene_foto",
		"localizado_por", "localizado_contacto",
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
				items, err := fetch(client, offset)
				if err != nil {
					log.Printf("SKIP offset=%d: %v", offset, err)
					continue
				}
				mu.Lock()
				for _, p := range items {
					_ = w.Write([]string{
						p.ID, p.Tipo, p.Nombre, p.Cedula, intStr(p.Edad),
						p.EstadoPersona, p.Estado, p.Municipio,
						p.Descripcion, p.Nota, p.Autor, p.Contacto,
						p.Timestamp, strconv.FormatBool(p.Verificado),
						strconv.FormatBool(p.Reportado), strconv.FormatBool(p.TieneFoto),
						p.LocalizadoPor, p.LocalizadoContacto,
					})
				}
				mu.Unlock()

				written.Add(int64(len(items)))
				done := processed.Add(1)
				fmt.Printf("\r  %d/%d páginas · %d personas", done, pages, written.Load())
			}
		}()
	}

	wg.Wait()
	fmt.Printf("\r  %d/%d páginas · %d personas\n", pages, pages, written.Load())
	fmt.Printf("Listo en %.1fs → %s\n", time.Since(start).Seconds(), outputFile)
}
