#!/bin/bash

# Set the image name
IMAGE_NAME="languagelearn"

# Get the current user's UID and GID
USER_ID=$(id -u)
GROUP_ID=$(id -g)

# Get the container ID of the running container
CONTAINER_ID=$(docker ps -qf "ancestor=$IMAGE_NAME")

if [ -z "$CONTAINER_ID" ]; then
    echo "No running container found for $IMAGE_NAME"
    exit 1
fi

# Execute an interactive bash session in the running container
docker exec -it \
    -e USER_ID=$USER_ID \
    -e GROUP_ID=$GROUP_ID \
    $CONTAINER_ID /bin/bash -c "sudo -u user /bin/bash"
