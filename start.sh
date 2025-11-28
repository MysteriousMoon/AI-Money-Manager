#!/bin/sh
set -e

# Run database migration using direct path
# node ./node_modules/prisma/build/index.js db push --skip-generate

# Start Next.js server
exec node server.js
