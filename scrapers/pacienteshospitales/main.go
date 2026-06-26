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
	"time"
)

const (
	supabaseURL = "https://isvgkrgdvhhbuznwgxlt.supabase.co/rest/v1"
	anonKey     = "sb_publishable_RA6UKM1XFORLMkRnglxuVQ_34u2bxYT"
	pageSize    = 1000
	outputFile  = "pacientes.csv"
)

type Hospital struct {
	Name  string `json:"name"`
	City  string `json:"city"`
	State string `json:"state"`
}

type Person struct {
	ID         string    `json:"id"`
	HospitalID string    `json:"hospital_id"`
	FullName   string    `json:"full_name"`
	Age        *int      `json:"age"`
	Status     string    `json:"status"`
	Notes      string    `json:"notes"`
	ReportedBy *string   `json:"reported_by"`
	CreatedAt  string    `json:"created_at"`
	UpdatedAt  string    `json:"updated_at"`
	Hospital   *Hospital `json:"hospitals"`
}

func newClient() *http.Client {
	return &http.Client{Timeout: 30 * time.Second}
}

func fetch(client *http.Client, offset int) ([]Person, int, error) {
	url := fmt.Sprintf(
		"%s/people?select=*,hospitals(name,city,state)&limit=%d&offset=%d",
		supabaseURL, pageSize, offset,
	)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("apikey", anonKey)
	req.Header.Set("Authorization", "Bearer "+anonKey)
	req.Header.Set("Prefer", "count=exact")

	resp, err := client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, 0, fmt.Errorf("status %d", resp.StatusCode)
	}

	// Parse total from Content-Range: 0-999/1713
	total := 0
	if cr := resp.Header.Get("Content-Range"); cr != "" {
		if _, err := fmt.Sscanf(cr, "%*d-%*d/%d", &total); err != nil {
			// ignore parse error, total stays 0
		}
	}

	var items []Person
	if err := json.NewDecoder(resp.Body).Decode(&items); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func main() {
	start := time.Now()
	client := newClient()

	_, src, _, _ := runtime.Caller(0)
	f, err := os.Create(filepath.Join(filepath.Dir(src), outputFile))
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()

	w := csv.NewWriter(f)
	defer w.Flush()
	_ = w.Write([]string{
		"id", "nombre", "edad", "estado", "notas", "reportado_por",
		"hospital", "ciudad", "estado_hospital",
		"hospital_id", "created_at", "updated_at",
	})

	var written int
	for offset := 0; ; offset += pageSize {
		items, total, err := fetch(client, offset)
		if err != nil {
			log.Fatalf("Error en offset=%d: %v", offset, err)
		}
		if offset == 0 {
			fmt.Printf("Total: %d pacientes\n", total)
		}

		for _, p := range items {
			hospital, city, state := "", "", ""
			if p.Hospital != nil {
				hospital = p.Hospital.Name
				city = p.Hospital.City
				state = p.Hospital.State
			}
			age := ""
			if p.Age != nil {
				age = strconv.Itoa(*p.Age)
			}
			rep := ""
			if p.ReportedBy != nil {
				rep = *p.ReportedBy
			}
			_ = w.Write([]string{
				p.ID, p.FullName, age, p.Status, p.Notes, rep,
				hospital, city, state,
				p.HospitalID, p.CreatedAt, p.UpdatedAt,
			})
		}

		written += len(items)
		fmt.Printf("\r  %d pacientes escritos", written)

		if len(items) < pageSize {
			break
		}
	}

	fmt.Printf("\r  %d pacientes escritos\n", written)
	fmt.Printf("Listo en %.1fs → %s\n", time.Since(start).Seconds(), outputFile)
}
