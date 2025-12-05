'use server';

import { prisma } from '@/lib/db';
import { getCurrentUser, withAuth } from './auth';
import { toNumber } from '@/lib/decimal';

export interface Account {
    id: string;
    userId: string;
    name: string;
    type: string;
    initialBalance: number;
    currencyCode: string;
    color: string | null;
    icon: string | null;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface AccountWithBalance extends Account {
    currentBalance: number;
}

/**
 * Calculate the current balance for an account
 * Balance = initialBalance + income - expenses - transfersOut + transfersIn
 * This is used internally for recalculation.
 */
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
            balance += toNumber(tx.targetAmount) || toNumber(tx.amount);
        }
    }

    return balance;
}

/**
 * Recalculate and update the currentBalance field for an account.
 * Call this after any transaction CRUD operation that affects the account.
 */
export async function recalculateAccountBalance(accountId: string): Promise<void> {
    const newBalance = await calculateAccountBalance(accountId);
    await prisma.account.update({
        where: { id: accountId },
        data: { currentBalance: newBalance },
    });
}

export async function getAccounts() {
    return withAuth(async (userId) => {
        const accounts = await prisma.account.findMany({
            where: {
                userId: userId,
            },
            orderBy: [
                { isDefault: 'desc' },
                { createdAt: 'asc' },
            ],
        });

        // Convert Decimal fields to numbers for frontend consumption
        const accountsWithBalance: AccountWithBalance[] = accounts.map((account) => ({
            ...account,
            initialBalance: toNumber(account.initialBalance),
            currentBalance: toNumber(account.currentBalance),
        }));

        return accountsWithBalance;
    }, 'Failed to fetch accounts');
}

export async function createAccount(account: Omit<Account, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    return withAuth(async (userId) => {
        // If this is the first account or explicitly marked as default, set it as default
        const existingAccountsCount = await prisma.account.count({
            where: { userId: userId },
        });

        const isDefault = account.isDefault || existingAccountsCount === 0;

        // If setting as default, unset other defaults
        if (isDefault) {
            await prisma.account.updateMany({
                where: { userId: userId, isDefault: true },
                data: { isDefault: false },
            });
        }

        return await prisma.account.create({
            data: {
                userId: userId,
                name: account.name,
                type: account.type,
                initialBalance: account.initialBalance,
                currentBalance: account.initialBalance, // Initialize to initial balance
                currencyCode: account.currencyCode,
                color: account.color,
                icon: account.icon,
                isDefault,
            },
        });
    }, 'Failed to create account');
}

export async function updateAccount(id: string, updates: Partial<Omit<Account, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) {
    return withAuth(async (userId) => {
        // Verify ownership
        const existing = await prisma.account.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== userId) {
            throw new Error('Account not found or unauthorized');
        }

        // If setting as default, unset other defaults first
        if (updates.isDefault === true) {
            await prisma.account.updateMany({
                where: { userId: userId, isDefault: true, id: { not: id } },
                data: { isDefault: false },
            });
        }

        return await prisma.account.update({
            where: { id },
            data: updates,
        });
    }, 'Failed to update account');
}

export async function deleteAccount(id: string) {
    return withAuth(async (userId) => {
        // Verify ownership
        const existing = await prisma.account.findUnique({
            where: { id },
            include: {
                transactions: true,
                transfersTo: true,
                recurringRules: true,
            },
        });

        if (!existing || existing.userId !== userId) {
            throw new Error('Account not found or unauthorized');
        }

        // Check if account has transactions
        const hasTransactions = existing.transactions.length > 0 || existing.transfersTo.length > 0;
        const hasRecurringRules = existing.recurringRules.length > 0;

        if (hasTransactions || hasRecurringRules) {
            throw new Error('Cannot delete account with existing transactions or recurring rules. Please move or delete them first.');
        }

        await prisma.account.delete({
            where: { id },
        });
    }, 'Failed to delete account');
}

export async function getDefaultAccount() {
    return withAuth(async (userId) => {
        const defaultAccount = await prisma.account.findFirst({
            where: {
                userId: userId,
                isDefault: true,
            },
        });

        if (!defaultAccount) {
            // If no default account exists, return the first account
            const firstAccount = await prisma.account.findFirst({
                where: { userId: userId },
                orderBy: { createdAt: 'asc' },
            });

            return firstAccount;
        }

        return defaultAccount;
    }, 'Failed to fetch default account');
}
