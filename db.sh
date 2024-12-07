#!/bin/bash

# Exit on error
set -e
# Exit on pipe failure
set -o pipefail

# Initialize PostgreSQL data directory if it doesn't exist
DATA_DIR="${DB_PATH:-/app/dbdata/postgres}"
mkdir -p "$DATA_DIR"

# Remove any stale PID file
rm -f "$DATA_DIR/postmaster.pid"
rm -f "$DATA_DIR/postgres/*.lock"

# Configure PostgreSQL if postgresql.conf doesn't exist
if [ ! -f "$DATA_DIR/postgresql.conf" ]; then
    # Configure PostgreSQL to listen on all interfaces
    pg_ctl initdb -D "$DATA_DIR" -U "$USER"
    mkdir -p "$DATA_DIR/postgres"
    # First remove any existing port configuration that initdb might have created
    sed -i '/^port = /d' "$DATA_DIR/postgresql.conf"
    # Now add our configurations
    echo "listen_addresses = '*'" >> "$DATA_DIR/postgresql.conf"
    echo "port = 5394" >> "$DATA_DIR/postgresql.conf"
    echo "unix_socket_directories = '$DATA_DIR/postgres'" >> "$DATA_DIR/postgresql.conf"
    echo "host all all 0.0.0.0/0 md5" >> "$DATA_DIR/pg_hba.conf"
fi

# Remove any stale PID file
rm -f "$DATA_DIR/postmaster.pid"
rm -f "$DATA_DIR/postgres/*.lock"

# Start postgres in foreground
echo "Starting PostgreSQL in foreground. Press Ctrl+C to stop."
exec postgres -D "$DATA_DIR" -k "$DATA_DIR/postgres" 