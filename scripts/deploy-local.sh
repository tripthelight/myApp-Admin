#!/usr/bin/env bash

set -Eeuo pipefail

IMAGE_TAG="${GITHUB_SHA:-local}"
IMAGE_NAME="${IMAGE_NAME:-myapp-admin}"

docker build -t "$IMAGE_NAME:$IMAGE_TAG" .
docker tag "$IMAGE_NAME:$IMAGE_TAG" "$IMAGE_NAME:latest"

echo "Admin image built: $IMAGE_NAME:$IMAGE_TAG"
