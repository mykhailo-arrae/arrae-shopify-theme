#!/bin/bash

set -Eeuo pipefail

bb devops-prepare
node ./devops/lib/backup-theme/index.js
