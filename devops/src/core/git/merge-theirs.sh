#!/bin/bash

set -Eeuo pipefail

# The content of our branch is going to be identical to their branch after the merge
# even if our branch is ahead
#
# See:
# https://devblogs.microsoft.com/oldnewthing/20200928-00/
# https://stackoverflow.com/questions/173919/is-there-a-theirs-version-of-git-merge-s-ours/27338013#27338013

their_branch=$1
commit_message=$2

target_hash=$(git commit-tree ${their_branch}^{tree} -p HEAD -p ${their_branch} -m "${commit_message}")

git merge --ff-only ${target_hash}
