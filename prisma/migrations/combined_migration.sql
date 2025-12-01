-- Combined Migration Script: Multi-Account Support + Transfer Enhancements
-- Execute this in Docker: docker exec -i accounting_db psql -U postgres -d accounting < combined_migration.sql
-- Or use Prisma: npx prisma db execute --file ./prisma/migrations/combined_migration.sql --schema ./prisma/schema.prisma

-- ============================================================================
-- PART 1: Multi-Account Support (add_accounts.sql)
-- ============================================================================

-- Step 1: Create accounts table
CREATE TABLE IF NOT EXISTS "accounts" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    "initialBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'CNY',
    color TEXT,
    icon TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Step 2: Create index on userId for accounts
CREATE INDEX IF NOT EXISTS "accounts_userId_idx" ON "accounts"("userId");

-- Step 3: Add accountId column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "accountId" TEXT;

-- Step 4: Add transfer-related columns to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "transferToAccountId" TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "targetAmount" DOUBLE PRECISION;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "targetCurrencyCode" TEXT;

-- Step 5: Create indexes for the new transaction columns
CREATE INDEX IF NOT EXISTS "transactions_accountId_idx" ON transactions("accountId");

-- Step 6: Add accountId column to recurring_rules table
ALTER TABLE recurring_rules ADD COLUMN IF NOT EXISTS "accountId" TEXT;

-- Step 7: Create index for recurring_rules accountId
CREATE INDEX IF NOT EXISTS "recurring_rules_accountId_idx" ON recurring_rules("accountId");

-- Step 8: Create a default "General Account" for each existing user
INSERT INTO "accounts" (id, "userId", name, type, "initialBalance", "currencyCode", icon, "isDefault", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    u.id,
    'General Account',
    'CASH',
    0,
    'CNY',
    '💰',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM accounts a WHERE a."userId" = u.id AND a."isDefault" = true
);

-- Step 9: Link all existing transactions to the default account for each user
UPDATE transactions t
SET "accountId" = a.id
FROM accounts a
WHERE t."userId" = a."userId" 
  AND a."isDefault" = true
  AND t."accountId" IS NULL;

-- Step 10: Link all existing recurring rules to the default account for each user
UPDATE recurring_rules r
SET "accountId" = a.id
FROM accounts a
WHERE r."userId" = a."userId"
  AND a."isDefault" = true
  AND r."accountId" IS NULL;

-- ============================================================================
-- PART 2: Transfer Fee Support (add_fee.sql)
-- ============================================================================

-- Add fee column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "fee" DOUBLE PRECISION;

-- ============================================================================
-- PART 3: Fee Currency Support (add_fee_currency.sql)
-- ============================================================================

-- Add feeCurrencyCode column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "feeCurrencyCode" TEXT;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Summary of changes:
-- 1. Created 'accounts' table with multi-currency support
-- 2. Added account relationships to transactions and recurring_rules
-- 3. Added transfer support (transferToAccountId, targetAmount, targetCurrencyCode)
-- 4. Added transaction fee support (fee, feeCurrencyCode)
-- 5. Created default accounts for existing users
-- 6. Linked existing data to default accounts
