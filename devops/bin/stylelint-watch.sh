#!/usr/bin/env bash

set -Eeuo pipefail

echo "Watching lintable style files"
script -qec \
  "watchexec --postpone --shell=none --exts scss --watch ./_js --watch ./_sass --project-origin ${WORKDIR} -- ./devops/bin/stylelint.sh"
