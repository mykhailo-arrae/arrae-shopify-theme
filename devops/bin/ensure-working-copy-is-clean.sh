#!/usr/bin/env bash

set -Eeuo pipefail

echoerr() { printf "%s\n" "$*" >&2; }

(git diff --quiet && git diff --cached --quiet && test -z "$(git ls-files --others --exclude-standard)") \
  || (echoerr 'Git working copy is not clean. Commit or stash your changes.' && exit 1)
