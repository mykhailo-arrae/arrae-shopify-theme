#!/usr/bin/env bash

set -Eeuo pipefail

echoerr() { printf "%s\n" "$*" >&2; }

RAW_OUTPUT_FOLDER='/tmp/webpack_raw_2becf6f6/'
COMPARE_OUTPUT_FOLDER='/tmp/webpack_compare_2becf6f6/'
MINIFIED_OUTPUT_FOLDER='/tmp/webpack_minified_2becf6f6/'
FINAL_OUTPUT_FOLDER="${THEMEDIR}/assets/"

mkdir -p $RAW_OUTPUT_FOLDER
mkdir -p $COMPARE_OUTPUT_FOLDER
mkdir -p $MINIFIED_OUTPUT_FOLDER

concurrency=$(parallel --number-of-threads)

echo "Concurrency: ${concurrency}"

rsync -rinc $RAW_OUTPUT_FOLDER $COMPARE_OUTPUT_FOLDER \
  | awk '!/^\.d/ {print $2}' \
  | awk '/\.js$/{print}' \
  | parallel --will-cite --jobs='100%' --halt='soon,fail=10%' --linebuffer --no-run-if-empty \
    "esbuild ${RAW_OUTPUT_FOLDER}{} --outfile=${MINIFIED_OUTPUT_FOLDER}{} --minify-whitespace --line-limit=240 --log-level=warning"

rsync -rinc $RAW_OUTPUT_FOLDER $COMPARE_OUTPUT_FOLDER \
  | awk '!/^\.d/ {print $2}' \
  | awk '/\.css$/{print}' \
  | parallel --will-cite --jobs='100%' --halt='soon,fail=10%' --linebuffer --no-run-if-empty \
    "esbuild ${RAW_OUTPUT_FOLDER}{} --outfile=${MINIFIED_OUTPUT_FOLDER}{} --minify-whitespace --line-limit=180 --log-level=warning"

echo 'Copying to assets'
rsync --no-whole-file --inplace -Dcr --no-o --no-g --no-perms $MINIFIED_OUTPUT_FOLDER $FINAL_OUTPUT_FOLDER

echo 'Setting baseline'
rsync --no-whole-file --inplace -Dcr --no-o --no-g --no-perms --delete $RAW_OUTPUT_FOLDER $COMPARE_OUTPUT_FOLDER

echo 'Minification complete'
