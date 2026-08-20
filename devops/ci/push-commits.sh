#!/bin/bash

set -Eeuo pipefail

git_status=$(git status -u --porcelain | grep -c '^'; exit 0)
commit_message=${1:-'Auto-save changes'}

if [ $git_status -gt 0 ]; then
  echo 'Uncommitted changes found:'
  git status -u --porcelain \
    && git add -vA \
    && git commit -m "${commit_message}"
else
  echo 'Nothing to commit'
fi

# Check if local branch is ahead of remote
if git rev-list HEAD@{upstream}..HEAD | grep -q .; then
  echo 'Local branch is ahead of remote, pushing changes...'
  git push
else
  echo 'Local branch is not ahead of remote, nothing to push'
fi
