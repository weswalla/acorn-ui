#!/bin/bash

# crash on error, don't continue
set -e

yarn workspace acorn-ui build
yarn run zip-ui

cd we-applet
hc web-app pack .