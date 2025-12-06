#!/bin/bash
set -e

# ==========================================
# 1. 硬编码配置区域 (请根据实际情况修改)
# ==========================================
CONTAINER_NAME="accounting_db"
DB_USER="user"
DB_PASSWORD="password"  # 这里写死数据库密码
DB_NAME="accounting"
DB_PORT="5432"          # Docker 映射到宿主机的端口，通常是 5432
# ==========================================

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# 检查参数
if [ -z "$1" ]; then
    echo "Usage: ./restore_db.sh <backup.sql>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    print_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Starting database restore from: $BACKUP_FILE"

# ==========================================
# 2. 验证函数 (保留了改进后的逻辑)
# ==========================================
validate_backup() {
    local backup_file="$1"
    # 核心表检查
    local required_tables=("transactions" "categories" "recurring_rules" "settings" "users")
    # 新版本关键字段检查 (用于判断 schema 是否过旧)
    local required_columns=("projectId") 

    echo "Validating backup compatibility..."

    local missing_tables=()
    local file_content_cmd="cat"
    
    # Check if file is gzipped
    if [[ "$backup_file" == *.gz ]]; then
        file_content_cmd="gunzip -c"
    fi

    for table in "${required_tables[@]}"; do
        # 宽容匹配：支持 "table", table, public.table, public."table"
        # 使用 $file_content_cmd 读取文件流
        if ! $file_content_cmd "$backup_file" | grep -qE "(public\.)?\"?$table\"?"; then
            missing_tables+=("$table")
        fi
    done

    if [ ${#missing_tables[@]} -ne 0 ]; then
        print_error "Validation Failed! Missing tables:"
        for table in "${missing_tables[@]}"; do
            echo " - $table"
        done
        # 交互式确认，防止误操作
        read -p "Backup implies incompatible version. Continue? (y/N) " -n 1 -r
        echo
        [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
    fi

    # 简单的列检查
    local missing_columns=()
    for col in "${required_columns[@]}"; do
        if ! $file_content_cmd "$backup_file" | grep -q "$col"; then
             missing_columns+=("$col")
        fi
    done

    if [ ${#missing_columns[@]} -ne 0 ]; then
         print_warning "Warning! New fields (like $missing_columns) seem to be missing."
         echo "Prisma will auto-fill them as NULL/Default in Step 3."
    fi

    print_success "Validation passed."
}

# 执行验证
validate_backup "$BACKUP_FILE"

echo ""
echo "WARNING: This will WIPE current data in '$CONTAINER_NAME'."
read -p "Are you sure? (y/N) " -n 1 -r
echo
[[ ! $REPLY =~ ^[Yy]$ ]] && exit 1

# ==========================================
# 3. 执行恢复
# ==========================================

# Step 1: Reset Schema
echo "Step 1: Resetting database schema..."
if ! docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" > /dev/null; then
    print_error "Failed to reset schema. Check if container is running."
    exit 1
fi

# Step 2: Import Data
echo "Step 2: Importing data..."

if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "Detected compressed backup. Decompressing on the fly..."
    # 使用 gunzip 解压并管道传输给 psql
    if gunzip -c "$BACKUP_FILE" | docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME > /dev/null; then
        print_success "Data imported successfully."
    else
        print_error "Data import failed during decompression stream."
        exit 1
    fi
else
    # 普通 SQL 文件直接重定向
    if docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < "$BACKUP_FILE" > /dev/null; then
        print_success "Data imported successfully."
    else
        print_error "Data import failed."
        exit 1
    fi
fi

# Step 3: Prisma Sync
echo "Step 3: Syncing Prisma schema..."

# 构造 URL (使用顶部硬编码的变量)
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}?schema=public"

echo "Connecting to: postgresql://${DB_USER}:****@localhost:${DB_PORT}/${DB_NAME}..."

# 执行 Push
if npx prisma db push --accept-data-loss; then
    print_success "Prisma schema synced."
else
    print_error "Prisma sync failed."
    echo "Check if DB_PASSWORD in script matches your docker container."
    exit 1
fi

print_success "Restore completed successfully!"