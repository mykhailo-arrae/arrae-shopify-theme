#!/bin/bash

set -Eeuo pipefail

docker compose exec main_cd ./docker-entrypoint.sh "$@"
