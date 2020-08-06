package main

import (
	"database/sql"
	"flag"
	"log"
	"net/http"

	_ "github.com/mattn/go-sqlite3"
)

var (
	dbPath = flag.String("db-path", "", "path to sqlite database file")
	port   = flag.String("port", "8888", "port to listen on")
)

func main() {
	flag.Parse()
	if *dbPath == "" {
		log.Fatalf("Database path not set")
	}
	database, _ := sql.Open("sqlite3", *dbPath)

	fs := http.FileServer(http.Dir("../static"))
	http.Handle("/", fs)

	srv := server{db: database}
	http.HandleFunc("/inspections", srv.getInspections)
	http.HandleFunc("/restaurantNames", srv.getRestaurantNames)

	log.Printf("Listening on port %s", *port)
	http.ListenAndServe(":"+*port, nil)
}
