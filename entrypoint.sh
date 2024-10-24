#!/bin/bash

# Get the host user's UID and GID
HOST_UID=$(stat -c %u /app)
HOST_GID=$(stat -c %g /app)

# Update the 'user' to match the host user's UID and GID
sudo usermod -u $HOST_UID user
sudo groupmod -g $HOST_GID user

# Change ownership of the user's home directory
sudo chown -R $HOST_UID:$HOST_GID /home/user

# Execute the command passed to docker run
exec sudo -E -H -u user bash -c "$@"
