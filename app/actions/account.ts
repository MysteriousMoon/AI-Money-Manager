'use server';

import { prisma } from '@/lib/db';
import { getCurrentUser } from './auth';

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

    let balance = account.initialBalance;

    // Add income and subtract expenses from this account
    for (const tx of account.transactions) {
        if (tx.type === 'INCOME') {
            balance += tx.amount;
        } else if (tx.type === 'EXPENSE') {
            balance -= tx.amount;
        } else if (tx.type === 'TRANSFER') {
            // Money leaving this account
            balance -= tx.amount;
        }
    }

    // Add transfers TO this account
    for (const tx of account.transfersTo) {
        if (tx.type === 'TRANSFER') {
            balance += tx.amount;
        }
    }

    return balance;
}

export async function getAccounts() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const accounts = await prisma.account.findMany({
            where: {
                userId: user.id,
            },
            orderBy: [
                { isDefault: 'desc' },
                { createdAt: 'asc' },
            ],
        });

        // Calculate balance for each account
        const accountsWithBalance: AccountWithBalance[] = await Promise.all(
            accounts.map(async (account) => ({
                ...account,
                currentBalance: await calculateAccountBalance(account.id),
            }))
        );

        return { success: true, data: accountsWithBalance };
    } catch (error) {
        console.error('Failed to fetch accounts:', error);
        return { success: false, error: 'Failed to fetch accounts' };
    }
}

export async function createAccount(account: Omit<Account, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        // If this is the first account or explicitly marked as default, set it as default
        const existingAccountsCount = await prisma.account.count({
            where: { userId: user.id },
        });

        const isDefault = account.isDefault || existingAccountsCount === 0;

        // If setting as default, unset other defaults
        if (isDefault) {
            await prisma.account.updateMany({
                where: { userId: user.id, isDefault: true },
                data: { isDefault: false },
            });
        }

        const newAccount = await prisma.account.create({
            data: {
                userId: user.id,
                name: account.name,
                type: account.type,
                initialBalance: account.initialBalance,
                currencyCode: account.currencyCode,
                color: account.color,
                icon: account.icon,
                isDefault,
            },
        });

        return { success: true, data: newAccount };
    } catch (error) {
        console.error('Failed to create account:', error);
        return { success: false, error: 'Failed to create account' };
    }
}

export async function updateAccount(id: string, updates: Partial<Omit<Account, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        // Verify ownership
        const existing = await prisma.account.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== user.id) {
            return { success: false, error: 'Account not found or unauthorized' };
        }

        // If setting as default, unset other defaults first
        if (updates.isDefault === true) {
            await prisma.account.updateMany({
                where: { userId: user.id, isDefault: true, id: { not: id } },
                data: { isDefault: false },
            });
        }

        const updatedAccount = await prisma.account.update({
            where: { id },
            data: updates,
        });

        return { success: true, data: updatedAccount };
    } catch (error) {
        console.error('Failed to update account:', error);
        return { success: false, error: 'Failed to update account' };
    }
}

export async function deleteAccount(id: string) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        // Verify ownership
        const existing = await prisma.account.findUnique({
            where: { id },
            include: {
                transactions: true,
                transfersTo: true,
                recurringRules: true,
            },
        });

        if (!existing || existing.userId !== user.id) {
            return { success: false, error: 'Account not found or unauthorized' };
        }

        // Check if account has transactions
        const hasTransactions = existing.transactions.length > 0 || existing.transfersTo.length > 0;
        const hasRecurringRules = existing.recurringRules.length > 0;

        if (hasTransactions || hasRecurringRules) {
            return {
                success: false,
                error: 'Cannot delete account with existing transactions or recurring rules. Please move or delete them first.',
            };
        }

        await prisma.account.delete({
            where: { id },
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to delete account:', error);
        return { success: false, error: 'Failed to delete account' };
    }
}

export async function getDefaultAccount() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const defaultAccount = await prisma.account.findFirst({
            where: {
                userId: user.id,
                isDefault: true,
            },
        });

        if (!defaultAccount) {
            // If no default account exists, return the first account
            const firstAccount = await prisma.account.findFirst({
                where: { userId: user.id },
                orderBy: { createdAt: 'asc' },
            });

            return { success: true, data: firstAccount };
        }

        return { success: true, data: defaultAccount };
    } catch (error) {
        console.error('Failed to fetch default account:', error);
        return { success: false, error: 'Failed to fetch default account' };
    }
}
