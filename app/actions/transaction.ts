'use server';

import { prisma } from '@/lib/db';
import { Transaction } from '@/types';
import { getCurrentUser } from './auth';

export async function getTransactions() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const transactions = await prisma.transaction.findMany({
            where: {
                userId: user.id,
            },
            orderBy: {
                date: 'desc',
            },
        });
        return { success: true, data: transactions };
    } catch (error) {
        console.error('Failed to fetch transactions:', error);
        return { success: false, error: 'Failed to fetch transactions' };
    }
}

export async function addTransaction(transaction: Transaction) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const newTransaction = await prisma.transaction.create({
            data: {
                id: transaction.id,
                userId: user.id,
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
        return { success: true, data: newTransaction };
    } catch (error) {
        console.error('Failed to add transaction:', error);
        return { success: false, error: 'Failed to add transaction' };
    }
}

export async function deleteTransaction(id: string) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        // Verify ownership before deleting
        await prisma.transaction.delete({
            where: {
                id,
                userId: user.id,
            },
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to delete transaction:', error);
        return { success: false, error: 'Failed to delete transaction' };
    }
}

export async function updateTransaction(id: string, updates: Partial<Transaction>) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        // Verify ownership before updating
        const existing = await prisma.transaction.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== user.id) {
            return { success: false, error: 'Transaction not found or unauthorized' };
        }

        const updatedTransaction = await prisma.transaction.update({
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
        return { success: true, data: updatedTransaction };
    } catch (error) {
        console.error('Failed to update transaction:', error);
        return { success: false, error: 'Failed to update transaction' };
    }
}

export async function exportTransactions() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const transactions = await prisma.transaction.findMany({
            where: {
                userId: user.id,
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
            where: { userId: user.id },
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

        const csvContent = [headers.join(','), ...rows].join('\n');
        return { success: true, data: csvContent };
    } catch (error) {
        console.error('Failed to export transactions:', error);
        return { success: false, error: 'Failed to export transactions' };
    }
}
