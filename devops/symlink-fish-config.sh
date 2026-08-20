#!/bin/bash

set -Eeuo pipefail

EDITABLE_FISH_CONFIG="${WORKDIR}/devops/fish"
FISH_CONFIG="${HOME}/.config/fish"

if [[ -h $FISH_CONFIG ]]; then
  echo "Symbolic link to $EDITABLE_FISH_CONFIG already exists"
else
  rm -rfv $FISH_CONFIG
  ln -fsv $EDITABLE_FISH_CONFIG "${HOME}/.config"
fi
