#!/bin/bash

set -Eeuo pipefail

bb devops-prepare
node ./devops/lib/track-theme/index.js
