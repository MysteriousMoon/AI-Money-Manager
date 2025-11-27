'use server';

import { prisma } from '@/lib/db';
import { Transaction } from '@/types';

export async function getTransactions() {
    try {
        const transactions = await prisma.transaction.findMany({
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
        const newTransaction = await prisma.transaction.create({
            data: {
                id: transaction.id,
                amount: transaction.amount,
                currencyCode: transaction.currencyCode,
                categoryId: transaction.categoryId,
                date: transaction.date,
                note: transaction.note,
                merchant: transaction.merchant,
                type: transaction.type,
                source: transaction.source,
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
        await prisma.transaction.delete({
            where: { id },
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to delete transaction:', error);
        return { success: false, error: 'Failed to delete transaction' };
    }
}
