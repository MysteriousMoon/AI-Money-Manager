'use server';

import { prisma } from '@/lib/db';
import { Transaction } from '@/types';
import { getCurrentUser, withAuth } from './auth';
import { recalculateAccountBalance } from './account';
import { toNumber } from '@/lib/decimal';

export async function getTransactions() {
    return withAuth(async (userId) => {
        const transactions = await prisma.transaction.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                date: 'desc',
            },
        });

        // Convert Decimal fields to numbers for frontend consumption
        return transactions.map(tx => ({
            ...tx,
            amount: toNumber(tx.amount),
            targetAmount: tx.targetAmount ? toNumber(tx.targetAmount) : null,
            fee: tx.fee ? toNumber(tx.fee) : null,
        }));
    }, 'Failed to fetch transactions');
}

export async function addTransaction(transaction: Transaction) {
    return withAuth(async (userId) => {
        const created = await prisma.transaction.create({
            data: {
                id: transaction.id,
                userId: userId,
                amount: transaction.amount,
                currencyCode: transaction.currencyCode,
                categoryId: transaction.categoryId,
                date: transaction.date,
                note: transaction.note,
                merchant: transaction.merchant,
                type: transaction.type,
                source: transaction.source,
                accountId: transaction.accountId,
                transferToAccountId: transaction.transferToAccountId,
                targetAmount: transaction.targetAmount,
                targetCurrencyCode: transaction.targetCurrencyCode,
                fee: transaction.fee,
                feeCurrencyCode: transaction.feeCurrencyCode,
                projectId: transaction.projectId,
                excludeFromAnalytics: transaction.excludeFromAnalytics,
                splitParentId: transaction.splitParentId,
            },
        });

        // Sync account balances
        if (transaction.accountId) {
            await recalculateAccountBalance(transaction.accountId);
        }
        if (transaction.transferToAccountId) {
            await recalculateAccountBalance(transaction.transferToAccountId);
        }

        return created;
    }, 'Failed to add transaction');
}

export async function deleteTransaction(id: string) {
    return withAuth(async (userId) => {
        // Get transaction before deleting to know which accounts to update
        const existing = await prisma.transaction.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== userId) {
            throw new Error('Transaction not found or unauthorized');
        }

        // Delete the transaction
        await prisma.transaction.delete({
            where: { id },
        });

        // Sync account balances
        if (existing.accountId) {
            await recalculateAccountBalance(existing.accountId);
        }
        if (existing.transferToAccountId) {
            await recalculateAccountBalance(existing.transferToAccountId);
        }
    }, 'Failed to delete transaction');
}

export async function updateTransaction(id: string, updates: Partial<Transaction>) {
    return withAuth(async (userId) => {
        // Get existing transaction to track account changes
        const existing = await prisma.transaction.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== userId) {
            throw new Error('Transaction not found or unauthorized');
        }

        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                amount: updates.amount,
                currencyCode: updates.currencyCode,
                categoryId: updates.categoryId,
                date: updates.date,
                note: updates.note,
                merchant: updates.merchant,
                type: updates.type,
                accountId: updates.accountId,
                transferToAccountId: updates.transferToAccountId,
                targetAmount: updates.targetAmount,
                targetCurrencyCode: updates.targetCurrencyCode,
                fee: updates.fee,
                feeCurrencyCode: updates.feeCurrencyCode,
                projectId: updates.projectId,
                excludeFromAnalytics: updates.excludeFromAnalytics,
                splitParentId: updates.splitParentId,
            },
        });

        // Collect all affected accounts (old and new)
        const affectedAccountIds = new Set<string>();
        if (existing.accountId) affectedAccountIds.add(existing.accountId);
        if (existing.transferToAccountId) affectedAccountIds.add(existing.transferToAccountId);
        if (updated.accountId) affectedAccountIds.add(updated.accountId);
        if (updated.transferToAccountId) affectedAccountIds.add(updated.transferToAccountId);

        // Sync all affected accounts
        for (const accountId of affectedAccountIds) {
            await recalculateAccountBalance(accountId);
        }

        return updated;
    }, 'Failed to update transaction');
}

export async function exportTransactions() {
    return withAuth(async (userId) => {
        const transactions = await prisma.transaction.findMany({
            where: {
                userId: userId,
            },
            include: {
                user: false, // Don't need user details
            },
            orderBy: {
                date: 'desc',
            },
        });

        // Get categories to map names
        const categories = await prisma.category.findMany({
            where: { userId: userId },
        });
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));

        // Generate CSV
        const headers = ['Date', 'Type', 'Category', 'Amount', 'Currency', 'Merchant', 'Note', 'Source'];
        const rows = transactions.map(t => {
            const categoryName = (t.categoryId ? categoryMap.get(t.categoryId) : undefined) || 'Unknown';
            return [
                t.date,
                t.type,
                `"${categoryName.replace(/"/g, '""')}"`, // Escape quotes
                toNumber(t.amount).toFixed(2),
                t.currencyCode,
                `"${(t.merchant || '').replace(/"/g, '""')}"`,
                `"${(t.note || '').replace(/"/g, '""')}"`,
                t.source
            ].join(',');
        });

        return [headers.join(','), ...rows].join('\n');
    }, 'Failed to export transactions');
}

/**
 * v3.0: Split a transaction into multiple child transactions
 * Useful for splitting a single payment across different categories/projects
 * 
 * @param parentId - The ID of the transaction to split
 * @param splits - Array of split definitions with amount, categoryId, projectId, and note
 */
export interface SplitDefinition {
    amount: number;
    categoryId?: string;
    projectId?: string;
    note?: string;
}

export async function splitTransaction(parentId: string, splits: SplitDefinition[]) {
    return withAuth(async (userId) => {
        // 1. Get the parent transaction
        const parent = await prisma.transaction.findUnique({
            where: { id: parentId },
        });

        if (!parent || parent.userId !== userId) {
            throw new Error('Transaction not found or unauthorized');
        }

        // 2. Validate split amounts sum to parent amount
        const totalSplitAmount = splits.reduce((sum, s) => sum + s.amount, 0);
        const tolerance = 0.01; // Allow for rounding errors
        if (Math.abs(totalSplitAmount - toNumber(parent.amount)) > tolerance) {
            throw new Error(`Split amounts (${totalSplitAmount}) must equal parent amount (${toNumber(parent.amount)})`);
        }

        // 3. Check if parent already has splits
        const existingSplits = await prisma.transaction.count({
            where: { splitParentId: parentId }
        });
        if (existingSplits > 0) {
            throw new Error('Transaction already has splits. Delete existing splits first.');
        }

        // 4. Create child transactions
        const childTransactions = await prisma.$transaction(async (tx) => {
            const children = [];
            for (let i = 0; i < splits.length; i++) {
                const split = splits[i];
                const child = await tx.transaction.create({
                    data: {
                        userId: userId,
                        amount: split.amount,
                        currencyCode: parent.currencyCode,
                        categoryId: split.categoryId || parent.categoryId,
                        date: parent.date,
                        type: parent.type,
                        source: 'SPLIT',
                        note: split.note || `Split ${i + 1} of ${parent.merchant || parent.note || 'transaction'}`,
                        merchant: parent.merchant,
                        accountId: parent.accountId,
                        projectId: split.projectId || null,
                        splitParentId: parentId,
                        excludeFromAnalytics: parent.excludeFromAnalytics,
                    }
                });
                children.push(child);
            }

            // 5. Mark parent as excluded from analytics (children are now tracked)
            await tx.transaction.update({
                where: { id: parentId },
                data: {
                    excludeFromAnalytics: true,
                    note: parent.note ? `${parent.note} [SPLIT]` : '[SPLIT - see child transactions]'
                }
            });

            return children;
        });

        return childTransactions;
    }, 'Failed to split transaction');
}

/**
 * v3.0: Get split children of a transaction
 */
export async function getSplitChildren(parentId: string) {
    return withAuth(async (userId) => {
        const children = await prisma.transaction.findMany({
            where: {
                splitParentId: parentId,
                userId: userId,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
        return children;
    }, 'Failed to get split children');
}

/**
 * v3.0: Delete all split children and restore parent
 */
export async function unsplitTransaction(parentId: string) {
    return withAuth(async (userId) => {
        const parent = await prisma.transaction.findUnique({
            where: { id: parentId },
        });

        if (!parent || parent.userId !== userId) {
            throw new Error('Transaction not found or unauthorized');
        }

        await prisma.$transaction(async (tx) => {
            // Delete all children
            await tx.transaction.deleteMany({
                where: { splitParentId: parentId }
            });

            // Restore parent
            await tx.transaction.update({
                where: { id: parentId },
                data: {
                    excludeFromAnalytics: false,
                    note: parent.note?.replace(' [SPLIT]', '').replace('[SPLIT - see child transactions]', '') || null
                }
            });
        });

        return { success: true };
    }, 'Failed to unsplit transaction');
}
