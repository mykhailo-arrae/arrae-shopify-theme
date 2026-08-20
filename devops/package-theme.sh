#!/bin/bash

set -Eeuo pipefail

rm -fv theme.zip

fdfind -t file . assets config layout locales sections snippets templates \
  | zip -r theme.zip -@

echo 'Theme packaged successfully'
