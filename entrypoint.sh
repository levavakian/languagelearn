#!/bin/bash

# Get the host user's UID and GID
HOST_UID=$(stat -c %u /app)
HOST_GID=$(stat -c %g /app)

# Update the 'user' to match the host user's UID and GID
sudo usermod -u $HOST_UID user
sudo groupmod -g $HOST_GID user

# Change ownership of the user's home directory and /app directory
sudo chown -R $HOST_UID:$HOST_GID /home/user /app

# Ensure the user has write permissions to /app
sudo chmod -R u+w /app

# Create a file to store environment variables
env_file="/home/user/.env_vars"
echo "export OPENAI_SECRET_KEY='$OPENAI_SECRET_KEY'" > "$env_file"
echo "export GOOGLE_API_SECRET='$GOOGLE_API_SECRET'" >> "$env_file"

# Set correct permissions for the env_file
chown $HOST_UID:$HOST_GID "$env_file"
chmod 600 "$env_file"

# Source the environment variables in the user's .bashrc
echo "source $env_file" >> /home/user/.bashrc

# Execute the command passed to docker run
exec sudo -E -H -u user bash -c "$@"
