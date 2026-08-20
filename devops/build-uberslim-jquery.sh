#!/bin/bash

set -Eeuxo pipefail

JQUERY_VERSION=3.6.3

workfolder="${TMP_DIR}/jquery"

rm -rf $workfolder
git clone --depth 1 --branch $JQUERY_VERSION https://github.com/jquery/jquery.git $workfolder
cd $workfolder

npm install

# Build uberslim jQuery
rm -rf ./dist
npx grunt custom:-ajax,-css/showHide,-deprecated,-effects,-core/ready,-deferred,-exports/global,-exports/amd

# Remove unused files
rm -rf ./src
rm -rf ./external

# Use minified jQuery by default
mv -fv package.json package-original.json
cat package-original.json | jq 'setpath(["main"]; "dist/jquery.min.js")' > package.json
rm package-original.json

# Create tarball package
pnpm pack
mv -fv ./jquery-${JQUERY_VERSION}.tgz ${WORKDIR}/devops/packages/uberslim-jquery.tgz
