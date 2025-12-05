
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { toNumber } from './lib/decimal';

// Manually load .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            let val = value.trim();
            if (key.trim() === 'DATABASE_URL') {
                val = val.replace('localhost', '127.0.0.1');
            }
            process.env[key.trim()] = val;
        }
    });
    console.log('Loaded .env file');
}

const prisma = new PrismaClient();

async function debugCapital() {
    const userId = await prisma.user.findFirst().then(u => u?.id);
    if (!userId) {
        console.log('No user found');
        return;
    }
    console.log('User ID:', userId);

    // 1. Analyze Investments by Type
    const investments = await prisma.investment.findMany({
        where: { userId, status: 'ACTIVE' }
    });

    console.log('\n--- Investments by Type ---');
    const invGroups: Record<string, number> = {};
    investments.forEach(inv => {
        const amount = toNumber(inv.currentAmount) ?? toNumber(inv.initialAmount) ?? 0;
        invGroups[inv.type] = (invGroups[inv.type] || 0) + amount;
        console.log(`[${inv.type}] ${inv.name}: ${amount} ${inv.currencyCode}`);
    });
    console.table(invGroups);

    // 2. Analyze Accounts by Type
    const accounts = await prisma.account.findMany({
        where: { userId }
    });
    const allTx = await prisma.transaction.findMany({ where: { userId } });

    console.log('\n--- Accounts by Type ---');
    const accGroups: Record<string, number> = {};

    for (const acc of accounts) {
        let balance = toNumber(acc.initialBalance);
        // Re-calculate balance
        const accTx = allTx.filter(t => t.accountId === acc.id || t.transferToAccountId === acc.id);
        accTx.forEach(t => {
            const txAmount = toNumber(t.amount);
            const txTargetAmount = t.targetAmount ? toNumber(t.targetAmount) : null;

            if (t.accountId === acc.id) {
                if (t.type === 'EXPENSE') balance -= txAmount;
                if (t.type === 'INCOME') balance += txAmount;
                if (t.type === 'TRANSFER') balance -= txAmount;
            }
            if (t.transferToAccountId === acc.id) {
                if (t.type === 'TRANSFER') {
                    balance += (txTargetAmount ?? txAmount);
                }
            }
        });

        accGroups[acc.type] = (accGroups[acc.type] || 0) + balance;
        console.log(`[${acc.type}] ${acc.name}: ${balance} ${acc.currencyCode}`);
    }
    console.table(accGroups);

    // 3. Search for the magic number
    const target = 19974.41;
    const margin = 1.0; // +/- 1.0

    console.log(`\n--- Searching for ~${target} ---`);

    // Check Investments
    investments.forEach(inv => {
        const val = toNumber(inv.currentAmount) ?? toNumber(inv.initialAmount) ?? 0;
        if (Math.abs(val - target) < margin) {
            console.log(`MATCH FOUND (Investment): ${inv.name} (${inv.type}) = ${val} ${inv.currencyCode}`);
        }
    });

    // Check Accounts
    for (const acc of accounts) {
        let balance = toNumber(acc.initialBalance);
        const accTx = allTx.filter(t => t.accountId === acc.id || t.transferToAccountId === acc.id);
        accTx.forEach(t => {
            const txAmount = toNumber(t.amount);
            const txTargetAmount = t.targetAmount ? toNumber(t.targetAmount) : null;
            if (t.accountId === acc.id) {
                if (t.type === 'EXPENSE') balance -= txAmount;
                if (t.type === 'INCOME') balance += txAmount;
                if (t.type === 'TRANSFER') balance -= txAmount;
            }
            if (t.transferToAccountId === acc.id) {
                if (t.type === 'TRANSFER') {
                    balance += (txTargetAmount ?? txAmount);
                }
            }
        });
        if (Math.abs(balance - target) < margin) {
            console.log(`MATCH FOUND (Account): ${acc.name} (${acc.type}) = ${balance} ${acc.currencyCode}`);
        }
    }

    // Check Transactions
    allTx.forEach(t => {
        const txAmount = toNumber(t.amount);
        if (Math.abs(txAmount - target) < margin) {
            console.log(`MATCH FOUND (Transaction): ${t.date} ${t.type} ${txAmount} ${t.currencyCode} - ${t.note || ''}`);
        }
    });

}

debugCapital()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
