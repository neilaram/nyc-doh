# NYC DOH inspection server

This repository contains a single-binary webserver which allows running simple queries on historical NYC Department of Health inspection data and view the results on a map.

## Dependencies

Building and running this binary will require that `golang` and `sqlite3` are installed.

## Running

To build and run the server, including fetching the upstream data, run `cd server && make run`

This project also generates some aggregate statistics about inspection frequency which can be generated and viewed with `make print_stats`
