//go:build ignore

package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"strings"
)

type Assay struct {
	ID                  string `json:"id"`
	Assay               string `json:"assay"`
	URL                 string `json:"url"`
	ExperimentAccession string `json:"experimentAccession"`
	FileAccession       string `json:"fileAccession"`
}

type Track struct {
	Name        string  `json:"name"`
	Core        bool    `json:"core,omitempty"`
	Ontology    string  `json:"ontology"`
	LifeStage   string  `json:"lifeStage"`
	SampleType  string  `json:"sampleType"`
	DisplayName string  `json:"displayName"`
	Assays      []Assay `json:"assays"`
}

type BiosampleData struct {
	Tracks []Track `json:"tracks"`
}

// CoreSample represents a sample to be marked as core, with donor ID and display name
type CoreSample struct {
	DonorID     string
	DisplayName string
}

func main() {
	// Extract core samples from test.txt (donor ID + display name pairs)
	coreSamples, err := extractCoreSamples("test.txt")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading test.txt: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Found %d core samples to mark\n", len(coreSamples))

	// Load human.json
	data, err := os.ReadFile("human.json")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading human.json: %v\n", err)
		os.Exit(1)
	}

	var biosampleData BiosampleData
	if err := json.Unmarshal(data, &biosampleData); err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing human.json: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Loaded %d tracks\n", len(biosampleData.Tracks))

	// Mark tracks as core if they match both donor ID and display name
	markedCount := 0
	alreadyCore := 0
	for i := range biosampleData.Tracks {
		track := &biosampleData.Tracks[i]
		for _, sample := range coreSamples {
			// Check if track name ends with the donor ID AND display name matches (case-insensitive)
			if strings.HasSuffix(track.Name, "_"+sample.DonorID) &&
				strings.EqualFold(track.DisplayName, sample.DisplayName) {
				if track.Core {
					alreadyCore++
				} else {
					track.Core = true
					markedCount++
				}
				break
			}
		}
	}
	fmt.Printf("Marked %d tracks as core (already core: %d)\n", markedCount, alreadyCore)

	// Write to temp file
	output, err := json.MarshalIndent(biosampleData, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling JSON: %v\n", err)
		os.Exit(1)
	}

	if err := os.WriteFile("human_updated.json", output, 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing human_updated.json: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("Wrote updated data to human_updated.json")
}

// extractCoreSamples parses test.txt and extracts donor ID + display name pairs
// Format: "Organ \t Type \t ENCDO... \t DisplayName: (1) cCREs \t Data format"
func extractCoreSamples(filename string) ([]CoreSample, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var samples []CoreSample
	donorRe := regexp.MustCompile(`ENCDO\w+`)

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.TrimSpace(line) == "" {
			continue
		}

		// Find the donor ID
		donorMatch := donorRe.FindString(line)
		if donorMatch == "" {
			continue
		}

		// Extract display name: it's after the donor ID, before ": (1)"
		// Split by donor ID to get the part after it
		parts := strings.SplitN(line, donorMatch, 2)
		if len(parts) < 2 {
			continue
		}

		afterDonor := parts[1]
		// Remove leading tab/whitespace
		afterDonor = strings.TrimLeft(afterDonor, " \t")

		// Extract the display name (before ": (1)" or ":(1)")
		displayName := afterDonor
		if idx := strings.Index(afterDonor, ": ("); idx != -1 {
			displayName = afterDonor[:idx]
		} else if idx := strings.Index(afterDonor, ":("); idx != -1 {
			displayName = afterDonor[:idx]
		}

		displayName = strings.TrimSpace(displayName)
		if displayName != "" {
			samples = append(samples, CoreSample{
				DonorID:     donorMatch,
				DisplayName: displayName,
			})
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return samples, nil
}
