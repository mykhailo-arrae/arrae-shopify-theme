#!/bin/bash

set -Eeuxo pipefail

# Change portable style entrypoint name from 'style.module.scss' to 'styles.scss'

fdfind -t file -e style.module.scss.ts . _js --exec rm -fv

fdfind -t file -e scss --exact-depth 2 'style.module' _js/sections _js/snippets --exec mv -fv '{}' '{//}/styles.scss'

fdfind -t file -e ts -e tsx -e js -e jsx . _js \
  | parallel --halt='soon,fail=20%' --jobs='100%' 'perl -p -i -e s/style.module.scss.js/styles.scss.js/g {}'
