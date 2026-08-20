#!/usr/bin/env bash

set -Eeuo pipefail

COMPUTED_COMMON_PATH=$(bun ./devops/src/core/fs/commondir/cli.js ${WATCHEXEC_CREATED_PATH:-} ${WATCHEXEC_RENAMED_PATH:-} ${WATCHEXEC_WRITTEN_PATH:-} ${WATCHEXEC_META_CHANGED_PATH:-})
COMMON_PATH=${WATCHEXEC_COMMON_PATH:-$COMPUTED_COMMON_PATH}
TARGET_PATH=${COMMON_PATH:-$WORKDIR}
SEARCH_PATH=${1:-$TARGET_PATH}

GLOB="${SEARCH_PATH}/**/*.scss"

finalize() {
  echo 'Finished linting styles'

  if [[ -n "${COMMON_PATH}" ]]; then
    # Always exit with success code in watch mode
    exit 0
  fi
}

trap finalize EXIT


echo "Linting styles in ${SEARCH_PATH:-working directory}"

stylelint --color --cache --cache-location="${TMP_DIR}" --cache-strategy=content "${GLOB}"
