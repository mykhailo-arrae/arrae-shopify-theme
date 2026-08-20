#!/bin/bash

set -Eeuo pipefail

fdfind -t file -e diagram.ts --search-path _js \
  | parallel --halt='soon,fail=50%' --jobs='100%' 'echo '[Codegen] Running "{}"' && bun {}'
