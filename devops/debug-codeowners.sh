#!/usr/bin/env bash

set -Eeuo pipefail

# USAGE:
# cat CODEOWNERS | ./debug-codeowners.sh <paths>

# Extract all non-commented file patterns from CODEOWNERS
# Remove the first line because it's a catch-all rule usually
# Reverse the order of the patterns to ensure the most specific ones are checked first
# and save them temporarily to .gitignore
awk 'NR>1 && $1 !~ /^#/ {print $1}' - | tac > .gitignore

# Check the supplied paths against the patterns
# Restore the original .gitignore file regardless of the exit code
git check-ignore -v --no-index $@ ; git checkout -- .gitignore
