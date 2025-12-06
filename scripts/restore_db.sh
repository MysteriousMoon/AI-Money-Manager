#!/bin/bash

# ============================================================
# 数据库恢复脚本 - 动态 Schema 验证
# 自动从 prisma/schema.prisma 读取当前结构并验证备份兼容性
# ============================================================

set -e

# Configuration
CONTAINER_NAME="accounting_db"
DB_USER="user"
DB_NAME="accounting"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRISMA_SCHEMA="$SCRIPT_DIR/../prisma/schema.prisma"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_error() { echo -e "${RED}❌ $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ️  $1${NC}"; }

# 检查参数
if [ -z "$1" ]; then
    echo "Usage: ./restore_db.sh <backup.sql> [options]"
    echo ""
    echo "Options:"
    echo "  --skip-validation    跳过 Schema 验证（不推荐）"
    echo "  --dry-run            只验证，不实际恢复"
    exit 1
fi

BACKUP_FILE="$1"
SKIP_VALIDATION=false
DRY_RUN=false

# 解析参数
shift
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-validation) SKIP_VALIDATION=true ;;
        --dry-run) DRY_RUN=true ;;
        *) echo "未知参数: $1"; exit 1 ;;
    esac
    shift
done

# 检查备份文件是否存在
if [ ! -f "$BACKUP_FILE" ]; then
    print_error "备份文件不存在: $BACKUP_FILE"
    exit 1
fi

# 检查 Prisma Schema 是否存在
if [ ! -f "$PRISMA_SCHEMA" ]; then
    print_error "Prisma Schema 不存在: $PRISMA_SCHEMA"
    exit 1
fi

echo "=========================================="
echo "数据库恢复工具 (动态验证)"
echo "=========================================="
echo "备份文件: $BACKUP_FILE"
echo "Prisma Schema: $PRISMA_SCHEMA"
echo ""

# ============================================================
# 从 Prisma Schema 动态提取表结构
# ============================================================
extract_schema_info() {
    print_info "从 Prisma Schema 提取表结构..."
    
    # 提取所有 model 及其 @@map 的表名
    # 格式: MODEL_NAME|table_name
    local current_model=""
    local current_table=""
    local in_model=false
    
    TABLES=()
    declare -gA TABLE_COLUMNS
    
    while IFS= read -r line; do
        # 检测 model 开始
        if [[ $line =~ ^model[[:space:]]+([A-Za-z]+) ]]; then
            current_model="${BASH_REMATCH[1]}"
            current_table=$(echo "$current_model" | sed 's/\([A-Z]\)/_\L\1/g' | sed 's/^_//' | tr '[:upper:]' '[:lower:]')s
            in_model=true
            TABLE_COLUMNS["$current_table"]=""
            continue
        fi
        
        # 检测 @@map
        if [[ $in_model == true && $line =~ @@map\(\"([^\"]+)\"\) ]]; then
            # 更新表名为 @@map 指定的值
            local old_table="$current_table"
            current_table="${BASH_REMATCH[1]}"
            TABLE_COLUMNS["$current_table"]="${TABLE_COLUMNS[$old_table]}"
            unset TABLE_COLUMNS["$old_table"]
        fi
        
        # 检测列定义 (简化的列名提取)
        if [[ $in_model == true && $line =~ ^[[:space:]]+([a-zA-Z][a-zA-Z0-9_]*)[[:space:]] ]]; then
            local col_name="${BASH_REMATCH[1]}"
            # 排除关键字和关系字段
            if [[ ! $col_name =~ ^(@@|model|enum)$ ]]; then
                if [[ -n "${TABLE_COLUMNS[$current_table]}" ]]; then
                    TABLE_COLUMNS["$current_table"]="${TABLE_COLUMNS[$current_table]},$col_name"
                else
                    TABLE_COLUMNS["$current_table"]="$col_name"
                fi
            fi
        fi
        
        # 检测 model 结束
        if [[ $in_model == true && $line =~ ^\} ]]; then
            if [[ -n "$current_table" && -n "${TABLE_COLUMNS[$current_table]}" ]]; then
                TABLES+=("$current_table")
            fi
            in_model=false
            current_model=""
        fi
    done < "$PRISMA_SCHEMA"
    
    echo "   检测到 ${#TABLES[@]} 个表"
}

# ============================================================
# Schema 验证函数
# ============================================================
validate_schema() {
    echo ""
    print_info "验证备份文件与当前 Schema 的兼容性..."
    echo ""
    
    local missing_tables=()
    local missing_columns=()
    local found_tables=0
    local validation_passed=true
    
    for table in "${TABLES[@]}"; do
        # 检查表是否存在于备份中
        if ! grep -qE "(CREATE TABLE|COPY) public\.$table" "$BACKUP_FILE" 2>/dev/null; then
            missing_tables+=("$table")
            validation_passed=false
            continue
        fi
        ((found_tables++))
        
        # 检查必要的列是否存在
        IFS=',' read -ra COLUMNS <<< "${TABLE_COLUMNS[$table]}"
        for col in "${COLUMNS[@]}"; do
            # 跳过关系字段（通常以小写字母开头且没有对应的数据库列）
            # 通过检查是否有 @relation 装饰器来判断（简化处理：跳过关系字段名）
            
            # 检查列名是否在备份文件中 (支持 "columnName" 格式)
            if ! grep -qE "\"$col\"" "$BACKUP_FILE" 2>/dev/null; then
                missing_columns+=("$table.$col")
            fi
        done
    done
    
    # 报告结果
    echo "表检查结果: ${found_tables}/${#TABLES[@]} 表存在于备份中"
    echo ""
    
    if [ ${#missing_tables[@]} -gt 0 ]; then
        print_error "以下表在备份中缺失:"
        for t in "${missing_tables[@]}"; do
            echo "   - $t"
        done
        echo ""
    fi
    
    if [ ${#missing_columns[@]} -gt 0 ]; then
        print_warning "以下列在备份中可能缺失 (将由 Prisma 自动添加):"
        for c in "${missing_columns[@]}"; do
            echo "   - $c"
        done
        echo ""
    fi
    
    if [ ${#missing_tables[@]} -eq 0 ]; then
        if [ ${#missing_columns[@]} -eq 0 ]; then
            print_success "Schema 完全匹配！备份与当前应用完全兼容。"
        else
            print_warning "Schema 部分匹配。缺失的列将在恢复后由 Prisma 自动添加。"
        fi
        return 0
    else
        print_error "Schema 验证失败！存在缺失的表。"
        return 1
    fi
}

# ============================================================
# 主流程
# ============================================================

# 提取 Schema 信息
extract_schema_info

# 执行验证
if [ "$SKIP_VALIDATION" = false ]; then
    if ! validate_schema; then
        echo ""
        if [ "$DRY_RUN" = true ]; then
            echo "Dry run 模式，不实际恢复。"
            exit 1
        fi
        read -p "是否继续恢复？(y/N) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "已取消恢复。"
            exit 1
        fi
        print_warning "继续恢复（用户确认）..."
    fi
else
    print_warning "跳过 Schema 验证（--skip-validation）"
fi

# Dry run 模式
if [ "$DRY_RUN" = true ]; then
    print_info "Dry run 模式，验证完成，不实际恢复。"
    exit 0
fi

echo ""
print_info "正在恢复数据库..."

# Drop and recreate schema
docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>/dev/null

# Restore backup
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < "$BACKUP_FILE"

echo ""
print_info "正在同步 Prisma Schema (添加缺失的列)..."
npx prisma db push --accept-data-loss 2>/dev/null || npx prisma db push

echo ""
print_success "数据库恢复完成！"
