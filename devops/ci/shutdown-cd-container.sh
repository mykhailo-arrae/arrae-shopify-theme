#!/bin/bash

set -Eeuo pipefail

docker compose ps
docker compose stop --timeout=30
docker network inspect "${COMPOSE_PROJECT_NAME}_cd"
docker compose down
