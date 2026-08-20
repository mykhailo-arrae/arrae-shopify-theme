#!/bin/bash

set -Eeuxo pipefail

usage='Usage: copy-files-out-of-container.sh <container_name> <dest_folder>'

container_name=${1:?"${usage}"}
dest_folder=${2:?"${usage}"}

if [ ! -d "${dest_folder}" ]; then
  echo "Error: ${dest_folder} is not a directory."
  exit 1
fi

container_id=$(docker compose ps -q "${container_name}")

if [ -z "${container_id}" ]; then
  echo "Error: Container '${container_name}' is not running."
  exit 1
fi

# We copy all files from /app folder in the container into the destination folder
# We use tar stream instead of `docker container cp` to gracefully handle nested node_modules
# We exclude .git (already exists on host) and node_modules (pnpm symlinks are broken outside container)
# We suppress "file changed as we read it" warnings (exit code 1) - only fail on fatal errors (exit code 2)
set +e
docker exec "${container_id}" tar -cf - --directory=/app \
  --warning=no-file-changed \
  --exclude='.git' --exclude='node_modules' \
  . | tar -xf - --directory="${dest_folder}"
tar_exit=$?
set -e
if [ ${tar_exit} -gt 1 ]; then
  echo "Error: tar failed with exit code ${tar_exit}"
  exit 1
fi

chown -R $(id -u):$(id -g) "${dest_folder}/"
