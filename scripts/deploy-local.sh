#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="${MYAPP_INFRA_DIR:-$HOME/myApp-Infra}"
IMAGE_TAG="${GITHUB_SHA:-local}"
IMAGE_NAME="${IMAGE_NAME:-myapp-admin}"

cd "$PROJECT_DIR"

echo "Admin image build: $IMAGE_NAME:$IMAGE_TAG"

echo "[1/3] Install dependencies and build Admin"
npm ci
npm run build

echo "[2/3] Build Docker image"
docker build -t "$IMAGE_NAME:$IMAGE_TAG" .
docker tag "$IMAGE_NAME:$IMAGE_TAG" "$IMAGE_NAME:latest"

echo "[3/3] Deploy through Infra admin switcher"
cd "$INFRA_DIR"
IMAGE_OVERRIDE="$IMAGE_NAME:$IMAGE_TAG" ./scripts/deploy-admin.sh
