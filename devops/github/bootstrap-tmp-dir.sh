#!/usr/bin/env bash

set -Eeuo pipefail

./devops/assert-linux-os.sh

username=$(whoami)

TMP_DIR=/mnt/tmp

if [[ -d $TMP_DIR ]]; then
  echo "$TMP_DIR folder exists"
else
  sudo mkdir $TMP_DIR
fi

sudo chown -R "${username}:${username}" $TMP_DIR
