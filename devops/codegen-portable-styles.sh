#!/usr/bin/env bash

set -Eeuo pipefail

fdfind -t file -e scss 'styles.scss' _js/sections _js/snippets \
  | parallel --will-cite --jobs='100%' --halt='soon,fail=10%' --no-run-if-empty --xargs --max-args=20  \
      bun ./devops/src/codegen/portable-styles/index.ts {}
