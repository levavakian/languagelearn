#!/bin/bash

# Set the image name
IMAGE_NAME="languagelearn"

# Build the Docker image
docker build -t $IMAGE_NAME .
