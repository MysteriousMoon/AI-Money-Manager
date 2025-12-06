#!/bin/bash

# =================配置区域=================
CONTAINER_NAME="accounting_db"
DB_USER="user"
DB_NAME="accounting"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql.gz"

# 开启 pipefail：只要管道中有一个命令失败，整个管道就算失败
set -o pipefail
# =========================================

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if container is running
if [ ! "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    echo "Error: Container $CONTAINER_NAME is not running."
    exit 1
fi

echo "Starting backup for database '$DB_NAME' from container '$CONTAINER_NAME'..."

# Perform backup
# 1. 去掉了 -t 参数 (关键修复)
# 2. 这里的 pg_dump 直接输出到 stdout，然后 gzip
if docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_FILE"; then
    echo "✅ Backup successful!"
    echo "File saved to: $BACKUP_FILE"
    echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"
    
    # Optional: Delete backups older than 30 days
    # find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete
else
    echo "❌ Error: Backup failed."
    # 既然失败了，生成的可能是个半成品或空文件，删掉它以免混淆
    rm -f "$BACKUP_FILE"
    exit 1
fi