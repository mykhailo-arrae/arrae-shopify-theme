#!/bin/bash

set -Eeuo pipefail

echo "Clearing sentinel"
rm -f _js-dist/.swc-ready

echo "Clearing target folder"
rm -rf _js-dist

echo "Compiling Typescript files"
swc --quiet --copy-files --include-dotfiles \
  --config-file ./main.swcrc \
  --strip-leading-paths \
  --out-dir _js-dist _js

echo "Adding sentinel"
touch _js-dist/.swc-ready

echo "Watching Typescript files"
swc --quiet --copy-files --include-dotfiles \
  --config-file ./main.swcrc \
  --strip-leading-paths \
  --log-watch-compilation \
  --watch \
  --out-dir _js-dist _js
