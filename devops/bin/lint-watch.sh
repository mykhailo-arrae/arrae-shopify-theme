#!/bin/bash

set -Eeuo pipefail

PWD=$(pwd)

mkdir ./tmp || true
touch ./tmp/placeholder.js

echo "Watching lintable files"
script -qec \
  "watchexec --exts js,jsx,ts,tsx --postpone --watch ./_js --project-origin ${PWD} -i '*.scss.ts' -i '**/node_modules/**' -i '**/tmp/**' -- bb lint-in-watch"
