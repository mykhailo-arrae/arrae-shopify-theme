#!/bin/bash

set -Eeuo pipefail

# The swc cli doesn't parse nested paths correctly,
# e.g., `swc --out-dir devops/lib devops/src`
# produces nested src folder in the lib folder.
# To work around the issue, we change the working directory of the script
# and use simple folder names

project_root=$(dirname $(dirname $(dirname $(realpath $0))))

cd "${project_root}/devops"

swc --quiet --copy-files --include-dotfiles \
  --config-file ./devops.swcrc \
  --delete-dir-on-start \
  --strip-leading-paths \
  --out-dir lib src
