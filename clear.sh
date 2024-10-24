#!/bin/bash

# Set the container name
CONTAINER_NAME="cll"

# Check if the container exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    # Stop the container if it's running
    echo "Stopping container $CONTAINER_NAME..."
    docker stop $CONTAINER_NAME >/dev/null 2>&1 || true

    # Remove the container
    echo "Removing container $CONTAINER_NAME..."
    docker rm $CONTAINER_NAME >/dev/null 2>&1 || true

    echo "Cleanup complete."
else
    echo "Container $CONTAINER_NAME does not exist. No cleanup needed."
fi
