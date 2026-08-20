#!/usr/bin/env bash

set -Eeuo pipefail

SEARCH_PATH=${1:-$WORKDIR}
GLOB="${SEARCH_PATH}/**/*.scss"

finalize() {
  echo 'Finished linting styles'
}

trap finalize EXIT

echo "Linting styles in automatic fix mode in ${SEARCH_PATH:-working directory}"

stylelint --color --fix "${GLOB}"
