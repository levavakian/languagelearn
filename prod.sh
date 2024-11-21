#!/bin/bash
mkdir -p /home/postgres
mkdir -p ${DB_PATH}
chown -R postgres:postgres ${DB_PATH}
chown -R postgres:postgres /app/server/server
chown -R postgres:postgres /app/client/build
chmod -R 700 ${DB_PATH}

env_file="/home/postgres/.env_vars"
echo "export OPENAI_SECRET_KEY='$OPENAI_SECRET_KEY'" > "$env_file"
echo "export GOOGLE_API_SECRET='$GOOGLE_API_SECRET'" >> "$env_file"
echo "export SQUARE_ACCESS_TOKEN='$SQUARE_ACCESS_TOKEN'" >> "$env_file"
echo "export SQUARE_APP_ID='$SQUARE_APP_ID'" >> "$env_file"
echo "export SQUARE_LOCATION_ID='$SQUARE_LOCATION_ID'" >> "$env_file"
echo "export DB_PATH='$DB_PATH'" >> "$env_file"
chown postgres:postgres "$env_file"
chmod 600 "$env_file"
cp -r /app /home/postgres/app
echo "source $env_file" >> /home/postgres/.bashrc


# Create a new script to run as postgres
cat << 'EOF' > /home/postgres/run_services.sh
#!/bin/bash
source /home/postgres/.env_vars
cd /home/postgres/app

# Setup trap for Ctrl+C
trap 'kill $(jobs -p); exit' INT

# Start the first process
PATH="/usr/lib/postgresql/16/bin:${PATH}" ./db.sh &

# Start the second process
(cd server && DB_PATH="postgresql://postgres@0.0.0.0:5432/postgres?sslmode=disable" ./server) &

# Wait for all processes to complete
wait -n

# Exit with status of process that exited first
exit $?
EOF

# Make the new script executable
chmod +x /home/postgres/run_services.sh
chown postgres:postgres /home/postgres/run_services.sh

# Run the new script as postgres
exec runuser -l postgres -c '/home/postgres/run_services.sh'