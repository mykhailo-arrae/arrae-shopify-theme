#!/usr/bin/env bash

set -Eeuo pipefail

case $(uname -s | tr '[:upper:]' '[:lower:]') in
  linux*)
    osname=linux
    ;;
  darwin*)
    osname=osx
    ;;
  *)
    osname=unknown
    ;;
esac

if [[ "$osname" != "linux" ]]; then
  echo "This script should be run on Linux systems only"
  exit 1
fi
