#!/usr/bin/env bash

set -Eeuo pipefail

shopify theme check --output=json | node devops/lib/themecheck/reporter.js
