#!/bin/bash

set -Eeuo pipefail

# Change portable Liquid tag syntax from '<%/%>' to '{#/#}'

fdfind -t file -e liquid . _js/ \
  | parallel --halt='soon,fail=20%' --jobs='100%' perl -p -i -e 's:\<\%:{#:g' {}

fdfind -t file -e liquid . _js/ \
  | parallel --halt='soon,fail=20%' --jobs='100%' perl -p -i -e 's:\%\>:#}:g' {}

# Change portable Liquid tag syntax from '<$/$>' to '{::/::}'

fdfind -t file -e liquid . _js/ --exec sed -i 's/<\$/{::/g'
fdfind -t file -e liquid . _js/ --exec sed -i 's/\$>/::}/g'
