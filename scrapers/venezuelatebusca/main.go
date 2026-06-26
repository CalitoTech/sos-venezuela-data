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
	apiURL    = "https://venezuelatebusca.com/api/persons"
	statsURL  = "https://venezuelatebusca.com/api/stats"
	pageSize  = 250
	outputFile = "personas.csv"
)

type Person struct {
	ID               string  `json:"id"`
	FirstName        string  `json:"first_name"`
	LastName         string  `json:"last_name"`
	NationalID       *string `json:"national_id"`
	Age              *int    `json:"age"`
	Gender           *string `json:"gender"`
	LastSeenLocation *string `json:"last_seen_location"`
	Description      *string `json:"description"`
	Status           string  `json:"status"`
	PhotoKey         *string `json:"photo_key"`
	ReporterName     string  `json:"reporter_name"`
	ReporterPhone    string  `json:"reporter_phone"`
	ReporterEmail    string  `json:"reporter_email"`
	FoundNotes       *string `json:"found_notes"`
	FoundAt          *string `json:"found_at"`
	HospitalName     *string `json:"hospital_name"`
	HospitalStatus   *string `json:"hospital_status"`
	HiddenAt         *string `json:"hidden_at"`
	DeletedAt        *string `json:"deleted_at"`
	CreatedAt        string  `json:"created_at"`
	UpdatedAt        string  `json:"updated_at"`
}

type Response struct {
	Persons []Person `json:"persons"`
}

type Stats struct {
	Stats struct {
		Total int `json:"total"`
	} `json:"stats"`
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
	return s.Stats.Total, nil
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func derefInt(n *int) string {
	if n == nil {
		return ""
	}
	return strconv.Itoa(*n)
}

func newClient() *http.Client {
	return &http.Client{
		Timeout: 30 * time.Second,
	}
}

func fetch(client *http.Client, after string) (*Response, error) {
	url := fmt.Sprintf("%s?limit=%d", apiURL, pageSize)
	if after != "" {
		url += "&after=" + after
	}
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

func main() {
	start := time.Now()
	client := newClient()

	fmt.Println("Obteniendo total de registros...")
	expectedTotal, err := getTotal(client)
	if err != nil {
		log.Fatalf("Error al obtener stats: %v", err)
	}

	_, src, _, _ := runtime.Caller(0)
	f, err := os.Create(filepath.Join(filepath.Dir(src), outputFile))
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()

	w := csv.NewWriter(f)
	defer w.Flush()
	_ = w.Write([]string{
		"id", "first_name", "last_name", "national_id", "age", "gender",
		"last_seen_location", "description", "status", "photo_key",
		"reporter_name", "reporter_phone", "reporter_email",
		"found_notes", "found_at", "hospital_name", "hospital_status",
		"hidden_at", "deleted_at", "created_at", "updated_at",
	})
	fmt.Printf("Total: %d personas\n", expectedTotal)

	var (
		cursor  string
		written int
		page    int
	)

	for written < expectedTotal {
		page++
		result, err := fetch(client, cursor)
		if err != nil {
			log.Fatalf("Error en página %d: %v", page, err)
		}
		if len(result.Persons) == 0 {
			break
		}

		for _, p := range result.Persons {
			_ = w.Write([]string{
				p.ID, p.FirstName, p.LastName, deref(p.NationalID), derefInt(p.Age), deref(p.Gender),
				deref(p.LastSeenLocation), deref(p.Description), p.Status, deref(p.PhotoKey),
				p.ReporterName, p.ReporterPhone, p.ReporterEmail,
				deref(p.FoundNotes), deref(p.FoundAt), deref(p.HospitalName), deref(p.HospitalStatus),
				deref(p.HiddenAt), deref(p.DeletedAt), p.CreatedAt, p.UpdatedAt,
			})
		}

		written += len(result.Persons)
		fmt.Printf("\r  Página %d · %d/%d personas", page, written, expectedTotal)

		if len(result.Persons) < pageSize {
			break
		}
		cursor = result.Persons[len(result.Persons)-1].ID
	}

	fmt.Printf("\r  %d páginas · %d personas\n", page, written)
	fmt.Printf("Listo en %.1fs → %s\n", time.Since(start).Seconds(), outputFile)
}
