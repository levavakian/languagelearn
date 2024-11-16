#!/bin/bash

# Exit on error
set -e
# Exit on pipe failure
set -o pipefail

# Initialize PostgreSQL data directory if it doesn't exist
DATA_DIR="/app/dbdata/postgres"
if [ ! -d "$DATA_DIR" ]; then
    mkdir -p "$DATA_DIR"
    pg_ctl initdb -D "$DATA_DIR" -U "$USER"
    
    # Configure PostgreSQL to listen on all interfaces
    echo "listen_addresses = '*'" >> "$DATA_DIR/postgresql.conf"
    echo "unix_socket_directories = '/app/dbdata/postgres'" >> "$DATA_DIR/postgresql.conf"
    echo "host all all 0.0.0.0/0 md5" >> "$DATA_DIR/pg_hba.conf"
fi

# Remove any stale PID file
rm -f "$DATA_DIR/postmaster.pid"

# Start postgres in foreground
echo "Starting PostgreSQL in foreground. Press Ctrl+C to stop."
exec postgres -D "$DATA_DIR" -k /app/dbdata/postgres 