'use server';

import { prisma } from '@/lib/db';
import { Transaction } from '@/types';
import { getCurrentUser, withAuth } from './auth';

export async function getTransactions() {
    return withAuth(async (userId) => {
        return await prisma.transaction.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                date: 'desc',
            },
        });
    }, 'Failed to fetch transactions');
}

export async function addTransaction(transaction: Transaction) {
    return withAuth(async (userId) => {
        return await prisma.transaction.create({
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
            },
        });
    }, 'Failed to add transaction');
}

export async function deleteTransaction(id: string) {
    return withAuth(async (userId) => {
        // Verify ownership before deleting
        await prisma.transaction.delete({
            where: {
                id,
                userId: userId,
            },
        });
    }, 'Failed to delete transaction');
}

export async function updateTransaction(id: string, updates: Partial<Transaction>) {
    return withAuth(async (userId) => {
        // Verify ownership before updating
        const existing = await prisma.transaction.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== userId) {
            throw new Error('Transaction not found or unauthorized');
        }

        return await prisma.transaction.update({
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
            },
        });
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
                t.amount.toFixed(2),
                t.currencyCode,
                `"${(t.merchant || '').replace(/"/g, '""')}"`,
                `"${(t.note || '').replace(/"/g, '""')}"`,
                t.source
            ].join(',');
        });

        return [headers.join(','), ...rows].join('\n');
    }, 'Failed to export transactions');
}
