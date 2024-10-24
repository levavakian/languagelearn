#!/bin/bash

# Set the image name
IMAGE_NAME="languagelearn"

# Get the current user's UID and GID
USER_ID=$(id -u)
GROUP_ID=$(id -g)

# Run the Docker container
docker run -itd \
    --name cll \
    -v "$(pwd)":/app \
    -e USER_ID=$USER_ID \
    -e GROUP_ID=$GROUP_ID \
    $IMAGE_NAME /bin/bash

# The container will now stay running and you'll be attached to it automatically
sleep 2

# Execute the exec.sh script to attach to the running container
./exec.sh

