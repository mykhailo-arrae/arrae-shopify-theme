#!/bin/bash

set -Eeuo pipefail

folders=(.shopify blocks devops/ci config layout locales sections snippets templates)
cpu_count=$(nproc)

bb devops-prepare

echo 'Sorting JSON file contents'
echo "Processing files in batches of ${cpu_count}"
fdfind --type file --print0 \
  --extension json \
  . ${folders[@]} \
  | parallel -0 --xargs --max-args=${cpu_count} --line-buffer \
      --halt='soon,fail=20%' --jobs='50%' \
      'node ./devops/lib/format/normalize-json/index.js {}'

echo 'Prettifying JSON files'
fdfind --type file --extension json . \
  ${folders[@]} \
  --exec-batch biome format --write
