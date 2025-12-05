/**
 * Migration script to populate currentBalance for all existing accounts
 * Run with: npx tsx scripts/seed-balance.ts
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Manually load .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const eqIndex = line.indexOf('=');
        if (eqIndex === -1) return;
        const key = line.slice(0, eqIndex).trim();
        let val = line.slice(eqIndex + 1).trim();
        if (key === 'DATABASE_URL') {
            val = val.replace('localhost', '127.0.0.1');
        }
        if (key) {
            process.env[key] = val;
        }
    });
    console.log('Loaded .env file');
}

const prisma = new PrismaClient();

import { toNumber } from '../lib/decimal';

// ...

async function calculateAccountBalance(accountId: string): Promise<number> {
    const account = await prisma.account.findUnique({
        where: { id: accountId },
        include: {
            transactions: true,
            transfersTo: true,
        },
    });

    if (!account) return 0;

    let balance = toNumber(account.initialBalance);

    // Add income and subtract expenses from this account
    for (const tx of account.transactions) {
        const amount = toNumber(tx.amount);
        if (tx.type === 'INCOME') {
            balance += amount;
        } else if (tx.type === 'EXPENSE') {
            balance -= amount;
        } else if (tx.type === 'TRANSFER') {
            // Money leaving this account
            balance -= amount;
        }
    }

    // Add transfers TO this account
    for (const tx of account.transfersTo) {
        if (tx.type === 'TRANSFER') {
            // Use targetAmount if available (for cross-currency transfers), otherwise use amount
            const targetAmount = tx.targetAmount ? toNumber(tx.targetAmount) : null;
            balance += targetAmount ?? toNumber(tx.amount);
        }
    }

    return balance;
}

async function main() {
    console.log('Starting balance migration...\n');

    const accounts = await prisma.account.findMany({
        orderBy: { createdAt: 'asc' },
    });

    console.log(`Found ${accounts.length} accounts to process.\n`);

    let updated = 0;
    let skipped = 0;

    for (const account of accounts) {
        const calculatedBalance = await calculateAccountBalance(account.id);
        const currentBalance = toNumber(account.currentBalance);

        // Check if balance needs update
        if (Math.abs(currentBalance - calculatedBalance) > 0.01) {
            await prisma.account.update({
                where: { id: account.id },
                data: { currentBalance: calculatedBalance },
            });
            console.log(`✓ Updated: ${account.name} (${account.type})`);
            console.log(`  Initial: ${toNumber(account.initialBalance)} ${account.currencyCode}`);
            console.log(`  Old Balance: ${currentBalance}`);
            console.log(`  New Balance: ${calculatedBalance}\n`);
            updated++;
        } else {
            console.log(`○ Skipped (already correct): ${account.name}`);
            skipped++;
        }
    }

    console.log('\n--- Summary ---');
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Total: ${accounts.length}`);
}

main()
    .catch((e) => {
        console.error('Migration failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
