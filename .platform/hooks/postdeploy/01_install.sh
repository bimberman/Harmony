#!/bin/bash
# Use server-only package.json for deployment
cp package-server.json package.json
npm install --production

