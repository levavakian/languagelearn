#!/bin/bash

set -e  # Exit immediately if a command exits with a non-zero status

# Build the client
echo "Building client..."
cd client || exit 1
REACT_APP_SQUARE_LOCATION_ID=${SQUARE_LOCATION_ID} REACT_APP_SQUARE_APP_ID=${SQUARE_APP_ID} npm run build || { echo "Client build failed"; exit 1; }
cd ..

# Build the server
echo "Building server..."
cd server || exit 1
go build -o server || { echo "Server build failed"; exit 1; }
cd ..

# Start the server
echo "Starting server..."
(cd server && DB_PATH="postgresql://user@localhost:5432/postgres?sslmode=disable" ./server) || { echo "Server failed to start"; exit 1; }