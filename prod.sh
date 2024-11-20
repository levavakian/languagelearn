#!/bin/bash

# Setup trap for Ctrl+C
trap 'kill $(jobs -p); exit' INT

# Start the first process
PATH="/usr/lib/postgresql/16/bin:${PATH}" ./db.sh &

# Start the second process
(cd server && DB_PATH="postgresql://user@localhost:5432/postgres?sslmode=disable" ./server) &

# Wait for all processes to complete
wait -n

# Exit with status of process that exited first
exit $?