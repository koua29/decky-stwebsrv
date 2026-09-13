#!/bin/sh
# Builds the frontend and packages the plugin as out/STWebSRV.zip.
set -e
cd "$(dirname "$0")"
npm run build
rm -rf out/STWebSRV out/STWebSRV.zip
mkdir -p out/STWebSRV
cp -R dist web main.py plugin.json package.json LICENSE README.md out/STWebSRV/
rm -f out/STWebSRV/dist/index.js.map
(cd out && zip -qr -X STWebSRV.zip STWebSRV -x '*.DS_Store')
shasum -a 256 out/STWebSRV.zip
