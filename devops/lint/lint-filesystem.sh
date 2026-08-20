#!/usr/bin/env bash

set -Eeuo pipefail

echoerr() { printf "%s\n" "$*" >&2; }

SCRIPT_DIR=$(realpath "$(dirname "${BASH_SOURCE[0]}")")

root=$(pwd)

found_utils=$(fdfind --type=directory --ignore-case -1 'util' _js/core)

if [ -n "$found_utils" ]; then
  echoerr "ERROR: 'utils' folder name is not allowed in core: ${found_utils}"
  exit 1
fi

biome lint --only=style/useFilenamingConvention "${root}"
