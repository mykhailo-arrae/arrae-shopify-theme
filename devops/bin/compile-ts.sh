#!/bin/bash

set -Eeuo pipefail

swc --quiet --copy-files --include-dotfiles \
  --config-file ./main.swcrc \
  --strip-leading-paths \
  --out-dir _js-dist _js
