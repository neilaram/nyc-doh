export CSV_FILE=/tmp/doh.csv
export DB_PATH=/tmp/doh.db

server: *.go
	go build

run: server ${DB_PATH}
	./server --db-path ${DB_PATH}

# Pull the dataset if it is newer than the one on disk
${CSV_FILE}:
# TODO: A partial download will cause curl to return 304 even though the csv file isn't valid.
# We should save to a tmp file and copy to ${CSV_FILE} to prevent this.
	@echo "Retrieving inspection data..."; \
	if [ "`curl -w '%{http_code}\n' -o ${CSV_FILE} -z ${CSV_FILE} 'https://data.cityofnewyork.us/api/views/43nn-pn8j/rows.csv?accessType=DOWNLOAD'`" -eq "304" ]; then \
		echo "No updates"; \
	fi \

# Force csv re-download regrardless of file modtime.
reload_csv:
	@curl -w '%{http_code}\n' -o ${CSV_FILE} 'https://data.cityofnewyork.us/api/views/43nn-pn8j/rows.csv?accessType=DOWNLOAD'

# Reload the database if the CSV or schema files have changed.
${DB_PATH}: ${CSV_FILE} sql/init.sql
		@echo "CSV file or schema file has been updated. Re-initializing DB"; \
		echo "DROP TABLE IF EXISTS csvData; \n.mode csv \n.import ${CSV_FILE} csvData" | sqlite3 ${DB_PATH}; \
		sqlite3 ${DB_PATH} < sql/init.sql

# Print the contents of the stats tables
print_stats:
	@sqlite3 ${DB_PATH} < sql/stats.sql; \
	for table in Days_Between_Inspections_By_Grade Inspections_By_Day_Of_Week Days_Between_Inspections_By_Borough Fast_Food_Scores; do \
		echo $$table: | sed 's/_/ /g'; \
	  echo ".mode column\n.header on\nSELECT * from $$table" | sqlite3 ${DB_PATH}; \
		echo '\n\n'; \
	done
