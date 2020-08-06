package main

import (
	"database/sql"
	"log"
	"strings"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

func (s *server) restaurantNames() ([]string, error) {
	var restaurants []string
	err := s.query("restaurant_names", `SELECT DISTINCT dba FROM restaurants ORDER BY dba`, nil, func(r *sql.Rows) error {
		var rest string
		if err := r.Scan(&rest); err != nil {
			return err
		}
		restaurants = append(restaurants, rest)
		return nil
	})
	return restaurants, err
}

func (s *server) inspections(name, after, before, minPoints, maxPoints string) ([]inspection, error) {
	q := `		
    SELECT r.camis, r.dba, i.date, i.type, i.score, i.grade, i.action, r.latitude, r.longitude, GROUP_CONCAT(v.type, x'0a')
    FROM
      inspections i
    LEFT JOIN restaurants r USING (camis)
    LEFT JOIN violations v USING (camis, date)
    WHERE i.dba LIKE ?  ||'%' AND i.date != '1900-01-01'`
	args := []interface{}{name}
	if after != "" {
		q += `AND i.date >= ?`
		args = append(args, after)
	}
	if before != "" {
		q += `AND i.date <= ?`
		args = append(args, before)
	}
	if minPoints != "" {
		q += `AND i.score >= ?`
		args = append(args, minPoints)
	}
	if maxPoints != "" {
		q += `AND i.score <= ?`
		args = append(args, maxPoints)
	}
	q += `GROUP BY r.camis, i.date ORDER BY i.date LIMIT 10000`
	var inspections []inspection
	err := s.query("inspections", q, args, func(r *sql.Rows) error {
		var i inspection
		var violations string
		if err := r.Scan(&i.Camis, &i.DBA, &i.Date, &i.Type, &i.Score, &i.Grade, &i.Action, &i.Lat, &i.Lon, &violations); err != nil {
			return err
		}
		i.Violations = strings.Split(violations, "\n")
		inspections = append(inspections, i)
		return nil
	})
	return inspections, err
}

// Wrap db.Query to do profiling. Note that this function calls rows.Next() so callers should not.
func (s *server) query(desc, query string, args []interface{}, f func(*sql.Rows) error) error {
	st := time.Now()
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return err
	}
	i := 0
	for rows.Next() {
		i++
		if err := f(rows); err != nil {
			return err
		}
	}
	log.Printf("Query %s with args %v took %v and returned %d rows", desc, args, time.Since(st), i)
	return rows.Err()
}
