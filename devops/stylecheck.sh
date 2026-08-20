#!/usr/bin/env bash

set -Eeuo pipefail

searchpath=${1:-_js}

fdfind -t file -e scss --print0 --search-path "${searchpath}" -- '.' \
  | parallel -0 --line-buffer --halt='soon,fail=20%' \
      'node ./devops/lib/stylecheck.js {}'
