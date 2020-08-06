package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	_ "github.com/mattn/go-sqlite3"
)

type server struct {
	db *sql.DB
}

type restaurant struct {
	Camis       string
	DBA         string
	Lat         string
	Lon         string
	Inspections []inspection
}

type inspection struct {
	Camis      string
	DBA        string
	Lat        string
	Lon        string
	Date       string
	Type       string
	Score      string
	Action     string
	Grade      string
	Violations []string
}

type inspectionsRequest struct {
	Restaurant string
	After      string
	Before     string
	MinPoints  string
	MaxPoints  string
}

func (s *server) getInspections(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		w.WriteHeader(http.StatusBadRequest)
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")

	var req inspectionsRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	inspections, err := s.inspections(req.Restaurant, req.After, req.Before, req.MinPoints, req.MaxPoints)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	resp, err := json.Marshal(inspections)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Write(resp)
}

func (s *server) getRestaurantNames(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	restaurants, err := s.restaurantNames()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		io.WriteString(w, fmt.Sprintf("Failed to query restaurant names: %v", err))
		return
	}

	resp, err := json.Marshal(restaurants)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		io.WriteString(w, fmt.Sprintf("Failed to marshal json: %v", err))
		return
	}
	w.Write(resp)
}
