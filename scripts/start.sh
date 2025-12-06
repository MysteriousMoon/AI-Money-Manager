#!/bin/sh
set -e

# Run database migration using direct path
# Commented out due to missing valibot dependency in production
# Manual migration: docker exec accounting_app npx prisma db push --accept-data-loss

# Start Next.js server
exec node server.js
