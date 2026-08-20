#!/bin/bash

set -Eeuo pipefail

# Helper function to print dim cyan messages to stderr
echoerr() {
  {
    if [ -t 2 ] && [ "${NO_COLOR:-}" != "1" ]; then
      printf '\033[2;36m%s\033[0m\n' "$*"
    else
      printf '%s\n' "$*"
    fi
  } >&2 || true  # Never fail
}

# Setting up git user

git config --global user.email "engineering@vaangroup.com"
git config --global user.name "Autobot"

# Committing codegen artefacts

themedir="${THEMEDIR:-.}"

find _js devops/ci "${themedir}/blocks" "${themedir}/snippets" "${themedir}/sections" -type f -exec grep -l 'build-fingerprint:codegen' {} \; | xargs -r git add --

git add .aiderignore .cursorignore .gitattributes .repomixignore || echo 'Could not commit ignore files'

if [[ -n $(git diff --staged --name-only) ]]; then
  git commit --quiet --author='Autobot <engineering@vaangroup.com>' --message='Codegen'
else
  echoerr 'Codegen artifacts unchanged since last build'
fi

# Committing build assets

find _js "${themedir}/assets" "${themedir}/blocks" "${themedir}/snippets" "${themedir}/sections" -type f -exec grep -l 'build-fingerprint:assets' {} \; | xargs -r git add --

if [[ -n $(git diff --staged --name-only) ]]; then
  git commit --quiet --author='Autobot <engineering@vaangroup.com>' --message='Build assets'
else
  echoerr 'Build assets already up-to-date (0 files changed)'
fi
