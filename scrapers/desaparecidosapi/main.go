package main

import (
	"context"
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

	"golang.org/x/time/rate"
)

// FlexString deserializa strings, números y null como string.
type FlexString string

func (f *FlexString) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		*f = ""
		return nil
	}
	var s string
	if err := json.Unmarshal(data, &s); err == nil {
		*f = FlexString(s)
		return nil
	}
	*f = FlexString(strings.Trim(string(data), "\""))
	return nil
}

const (
	apiURL      = "https://desaparecidos-terremoto-api.theempire.tech/api/personas"
	pageSize    = 100
	concurrency = 5
	maxRetries  = 10
	outputFile  = "personas.csv"
)

type Person struct {
	ID                 string     `json:"id"`
	Nombre             string     `json:"nombre"`
	Edad               *int       `json:"edad"`
	Ubicacion          string     `json:"ubicacion"`
	Fecha              string     `json:"fecha"`
	Descripcion        string     `json:"descripcion"`
	Contacto           string     `json:"contacto"`
	Foto               string     `json:"foto"`
	Estado             string     `json:"estado"`
	LocalizadoPor      FlexString `json:"localizadoPor"`
	LocalizadoContacto FlexString `json:"localizadoContacto"`
	LocalizadoRelacion FlexString `json:"localizadoRelacion"`
	LocalizadoNota     FlexString `json:"localizadoNota"`
	Reportada          bool       `json:"reportada"`
	Reportes           int        `json:"reportes"`
	ReportadaAt        FlexString `json:"reportadaAt"`
	CreatedAt          FlexString `json:"createdAt"`
	UpdatedAt          FlexString `json:"updatedAt"`
}

type Response struct {
	Items      []Person `json:"items"`
	Total      int      `json:"total"`
	Page       int      `json:"page"`
	PageSize   int      `json:"pageSize"`
	TotalPages int      `json:"totalPages"`
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

func fetch(client *http.Client, limiter *rate.Limiter, page int) (*Response, error) {
	url := fmt.Sprintf("%s?page=%d&pageSize=%d", apiURL, page, pageSize)

	var lastErr error
	for attempt := 0; attempt < maxRetries; attempt++ {
		// Esperar token del rate limiter antes de cada intento
		if err := limiter.Wait(context.Background()); err != nil {
			return nil, err
		}

		req, _ := http.NewRequest("GET", url, nil)
		req.Header.Set("Accept", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			time.Sleep(2 * time.Second)
			continue
		}

		if resp.StatusCode == 429 {
			resp.Body.Close()
			wait := 30 * time.Second
			if ra := resp.Header.Get("Retry-After"); ra != "" {
				if secs, err := strconv.Atoi(ra); err == nil {
					wait = time.Duration(secs) * time.Second
				}
			}
			log.Printf("429 en página %d · esperando %s...", page, wait)
			time.Sleep(wait)
			lastErr = fmt.Errorf("429 rate limited")
			continue
		}

		if resp.StatusCode != 200 {
			resp.Body.Close()
			lastErr = fmt.Errorf("status %d", resp.StatusCode)
			time.Sleep(2 * time.Second)
			continue
		}

		var result Response
		err = json.NewDecoder(resp.Body).Decode(&result)
		resp.Body.Close()
		if err != nil {
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

func main() {
	start := time.Now()
	client := newClient()

	// 3 requests/segundo compartidos entre todos los workers
	limiter := rate.NewLimiter(rate.Every(333*time.Millisecond), 1)

	fmt.Println("Obteniendo total de registros...")
	first, err := fetch(client, limiter, 1)
	if err != nil {
		log.Fatalf("Error en primera petición: %v", err)
	}
	totalPages := first.TotalPages
	fmt.Printf("Total: %d personas · %d páginas\n", first.Total, totalPages)

	_, src, _, _ := runtime.Caller(0)
	f, err := os.Create(filepath.Join(filepath.Dir(src), outputFile))
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()

	w := csv.NewWriter(f)
	defer w.Flush()
	_ = w.Write([]string{
		"id", "nombre", "edad", "ubicacion", "fecha", "descripcion",
		"contacto", "foto", "estado",
		"localizado_por", "localizado_contacto", "localizado_relacion", "localizado_nota",
		"reportada", "reportes", "reportada_at", "created_at", "updated_at",
	})

	pages := make(chan int, totalPages)
	for p := 1; p <= totalPages; p++ {
		pages <- p
	}
	close(pages)

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
			for page := range pages {
				result, err := fetch(client, limiter, page)
				if err != nil {
					log.Printf("SKIP página %d: %v", page, err)
					continue
				}
				mu.Lock()
				for _, p := range result.Items {
					_ = w.Write([]string{
						p.ID, p.Nombre, intStr(p.Edad), p.Ubicacion,
						p.Fecha, p.Descripcion, p.Contacto, p.Foto, p.Estado,
						string(p.LocalizadoPor), string(p.LocalizadoContacto),
						string(p.LocalizadoRelacion), string(p.LocalizadoNota),
						strconv.FormatBool(p.Reportada), strconv.Itoa(p.Reportes),
						string(p.ReportadaAt), string(p.CreatedAt), string(p.UpdatedAt),
					})
				}
				mu.Unlock()

				written.Add(int64(len(result.Items)))
				done := processed.Add(1)
				fmt.Printf("\r  %d/%d páginas · %d personas", done, totalPages, written.Load())
			}
		}()
	}

	wg.Wait()
	fmt.Printf("\r  %d/%d páginas · %d personas\n", totalPages, totalPages, written.Load())
	fmt.Printf("Listo en %.1fs → %s\n", time.Since(start).Seconds(), outputFile)
}
