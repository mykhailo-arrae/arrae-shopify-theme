#!/bin/bash

set -Eeuo pipefail

git fetch --all

touch .env \

docker compose build \
  --build-arg GROUP_ID=$(id -g) --build-arg USER_ID=$(id -u) \
  --progress=plain main_cd

docker compose up -d main_cd
