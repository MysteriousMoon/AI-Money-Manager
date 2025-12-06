#!/bin/bash

# Configuration
CONTAINER_NAME="accounting_db"
DB_USER="user"
DB_NAME="accounting"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if container is running
if [ ! "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    echo "Error: Container $CONTAINER_NAME is not running."
    exit 1
fi

echo "Starting backup for database '$DB_NAME' from container '$CONTAINER_NAME'..."

# Perform backup
# We use docker exec to run pg_dump inside the container
# We pipe the output directly to gzip to save space
docker exec -t $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup successful!"
    echo "File saved to: $BACKUP_FILE"
    echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"
    
    # Optional: Delete backups older than 30 days
    # find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete
else
    echo "Error: Backup failed."
    rm -f "$BACKUP_FILE"
    exit 1
fi
