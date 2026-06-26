package main

import (
	"encoding/csv"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/PuerkitoBio/goquery"
)

const (
	baseURL     = "https://venezuelareporta.org"
	concurrency = 30
	maxRetries  = 3
	outputFile  = "personas.csv"
)

var pageRe = regexp.MustCompile(`Página \d+ de (\d+)`)

type Person struct {
	ID       string
	Name     string
	Status   string
	Location string
	PhotoURL string
	URL      string
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

func fetchPage(client *http.Client, page int) (*goquery.Document, error) {
	url := fmt.Sprintf("%s/buscar?vista=cuadricula&page=%d", baseURL, page)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; SOSVenezuela/1.0)")
	req.Header.Set("Accept-Language", "es-VE,es;q=0.9")

	var lastErr error
	for attempt := 0; attempt < maxRetries; attempt++ {
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
		doc, err := goquery.NewDocumentFromReader(resp.Body)
		if err != nil {
			return nil, err
		}
		return doc, nil
	}
	return nil, lastErr
}

func getTotalPages(client *http.Client) (int, error) {
	doc, err := fetchPage(client, 1)
	if err != nil {
		return 0, err
	}
	text := doc.Find("body").Text()
	m := pageRe.FindStringSubmatch(text)
	if len(m) < 2 {
		return 0, fmt.Errorf("no se encontró el total de páginas")
	}
	var total int
	fmt.Sscanf(m[1], "%d", &total)
	return total, nil
}

func parsePage(doc *goquery.Document) []Person {
	var persons []Person
	doc.Find("a.card").Each(func(_ int, s *goquery.Selection) {
		href, _ := s.Attr("href")
		id := strings.TrimPrefix(href, "/reporte/")

		name := strings.TrimSpace(s.Find("h3").Text())
		status := strings.TrimSpace(s.Find(".chip").Text())
		location := strings.TrimSpace(s.Find("p").First().Text())
		photoURL, _ := s.Find("img").Attr("src")

		if name == "" {
			return
		}
		persons = append(persons, Person{
			ID:       id,
			Name:     name,
			Status:   status,
			Location: location,
			PhotoURL: photoURL,
			URL:      baseURL + href,
		})
	})
	return persons
}

func main() {
	start := time.Now()
	client := newClient()

	fmt.Println("Obteniendo total de páginas...")
	totalPages, err := getTotalPages(client)
	if err != nil {
		log.Fatalf("Error al obtener páginas: %v", err)
	}
	fmt.Printf("Total de páginas: %d\n", totalPages)

	_, src, _, _ := runtime.Caller(0)
	f, err := os.Create(filepath.Join(filepath.Dir(src), outputFile))
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()

	w := csv.NewWriter(f)
	defer w.Flush()
	_ = w.Write([]string{"id", "nombre", "estado", "ubicacion", "foto_url", "url"})

	pageCh := make(chan int, totalPages)
	for p := 1; p <= totalPages; p++ {
		pageCh <- p
	}
	close(pageCh)

	var (
		mu        sync.Mutex
		wg        sync.WaitGroup
		processed atomic.Int64
		total     atomic.Int64
	)

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for page := range pageCh {
				doc, err := fetchPage(client, page)
				if err != nil {
					log.Printf("SKIP página %d: %v", page, err)
					continue
				}
				persons := parsePage(doc)
				mu.Lock()
				for _, p := range persons {
					_ = w.Write([]string{p.ID, p.Name, p.Status, p.Location, p.PhotoURL, p.URL})
				}
				mu.Unlock()

				total.Add(int64(len(persons)))
				done := processed.Add(1)
				if done%50 == 0 {
					fmt.Printf("\r  %d/%d páginas · %d personas", done, totalPages, total.Load())
				}
			}
		}()
	}

	wg.Wait()
	fmt.Printf("\r  %d/%d páginas · %d personas\n", totalPages, totalPages, total.Load())
	fmt.Printf("Listo en %.1fs → %s\n", time.Since(start).Seconds(), outputFile)
}
