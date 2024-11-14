#!/bin/bash

# Set the image name
IMAGE_NAME="languagelearn"

# Get the current user's UID and GID
USER_ID=$(id -u)
GROUP_ID=$(id -g)

# Check if OPENAI_SECRET_KEY is set
if [ -z "$OPENAI_SECRET_KEY" ]; then
    echo "Error: OPENAI_SECRET_KEY environment variable is not set."
    exit 1
fi

# Run the Docker container with network passthrough
docker run -itd \
    --name cll \
    --network host \
    -v "$(pwd)":/app \
    -e USER_ID=$USER_ID \
    -e GROUP_ID=$GROUP_ID \
    -e OPENAI_SECRET_KEY="$OPENAI_SECRET_KEY" \
    -e GOOGLE_API_SECRET="$GOOGLE_API_SECRET" \
    -e SQUARE_APP_ID="$SQUARE_APP_ID" \
    -e SQUARE_LOCATION_ID="$SQUARE_LOCATION_ID" \
    -e SQUARE_ACCESS_TOKEN="$SQUARE_ACCESS_TOKEN" \
    $IMAGE_NAME /bin/bash

# The container will now stay running and you'll be attached to it automatically
sleep 2

# Execute the exec.sh script to attach to the running container
./exec.sh
