#!/bin/bash

# Configuration
CONTAINER_NAME="accounting_db"
DB_USER="user"
DB_NAME="accounting"

if [ -z "$1" ]; then
    echo "Usage: ./restore_db.sh <backup.sql>"
    exit 1
fi

echo "Restoring database from $1..."

# Drop and recreate schema
docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Restore backup
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < "$1"

echo "Done!"
