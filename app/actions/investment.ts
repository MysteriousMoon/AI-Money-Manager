'use server';

import { prisma } from '@/lib/db';
import { Investment } from '@prisma/client';
import { getCurrentUser } from './auth';

export async function getInvestments() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const investments = await prisma.investment.findMany({
            where: {
                userId: user.id,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return { success: true, data: investments };
    } catch (error) {
        console.error('Failed to fetch investments:', error);
        return { success: false, error: 'Failed to fetch investments' };
    }
}

export async function addInvestment(investment: Omit<Investment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        // 1. Find or create "Investment" category
        let category = await prisma.category.findFirst({
            where: {
                userId: user.id,
                name: 'Investment',
                type: 'EXPENSE'
            }
        });

        if (!category) {
            category = await prisma.category.create({
                data: {
                    userId: user.id,
                    name: 'Investment',
                    icon: '📈',
                    type: 'EXPENSE',
                    isDefault: false
                }
            });
        }

        // 2. Create Investment and Transaction in a transaction
        const newInvestment = await prisma.$transaction(async (tx) => {
            // Create the investment first
            const createdInvestment = await tx.investment.create({
                data: {
                    ...investment,
                    userId: user.id,
                },
            });

            // Create the transaction with investmentId
            await tx.transaction.create({
                data: {
                    userId: user.id,
                    amount: investment.initialAmount,
                    currencyCode: investment.currencyCode,
                    categoryId: category.id,
                    date: investment.startDate,
                    type: 'EXPENSE',
                    source: 'MANUAL',
                    note: `Investment: ${investment.name}`,
                    merchant: 'Investment Portfolio',
                    investmentId: createdInvestment.id, // Link to investment
                    accountId: investment.accountId, // Deduct from this account
                }
            });

            return createdInvestment;
        });

        return { success: true, data: newInvestment };
    } catch (error) {
        console.error('Failed to add investment:', error);
        return { success: false, error: 'Failed to add investment' };
    }
}

export async function updateInvestment(id: string, updates: Partial<Investment>) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const existing = await prisma.investment.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== user.id) {
            return { success: false, error: 'Investment not found or unauthorized' };
        }

        const updatedInvestment = await prisma.investment.update({
            where: { id },
            data: updates,
        });
        return { success: true, data: updatedInvestment };
    } catch (error) {
        console.error('Failed to update investment:', error);
        return { success: false, error: 'Failed to update investment' };
    }
}

export async function deleteInvestment(id: string) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const existing = await prisma.investment.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== user.id) {
            return { success: false, error: 'Investment not found or unauthorized' };
        }

        // Use transaction to delete investment and related transactions atomically
        await prisma.$transaction(async (tx) => {
            // Delete related transactions using investmentId
            await tx.transaction.deleteMany({
                where: {
                    userId: user.id,
                    investmentId: id
                }
            });

            // Delete the investment
            await tx.investment.delete({
                where: { id },
            });
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to delete investment:', error);
        return { success: false, error: 'Failed to delete investment' };
    }
}

export async function closeInvestment(id: string, finalAmount: number, endDate: string, accountId?: string) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const existing = await prisma.investment.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== user.id) {
            return { success: false, error: 'Investment not found or unauthorized' };
        }

        if (existing.status === 'CLOSED') {
            return { success: false, error: 'Investment already closed' };
        }

        // 1. Find or create "Investment Return" category
        let category = await prisma.category.findFirst({
            where: {
                userId: user.id,
                name: 'Investment Return',
                type: 'INCOME'
            }
        });

        if (!category) {
            category = await prisma.category.create({
                data: {
                    userId: user.id,
                    name: 'Investment Return',
                    icon: '💰',
                    type: 'INCOME',
                    isDefault: false
                }
            });
        }

        // 2. Update Investment and Create Transaction with investmentId
        const updatedInvestment = await prisma.$transaction(async (tx) => {
            const updated = await tx.investment.update({
                where: { id },
                data: {
                    status: 'CLOSED',
                    currentAmount: finalAmount,
                    endDate
                }
            });

            await tx.transaction.create({
                data: {
                    userId: user.id,
                    amount: finalAmount,
                    currencyCode: existing.currencyCode,
                    categoryId: category.id,
                    date: endDate,
                    type: 'INCOME',
                    source: 'MANUAL',
                    note: `Investment Return: ${existing.name}`,
                    merchant: 'Investment Portfolio',
                    investmentId: id, // Link to investment
                    accountId: accountId, // Deposit to this account
                }
            });

            return updated;
        });

        return { success: true, data: updatedInvestment };
    } catch (error) {
        console.error('Failed to close investment:', error);
        return { success: false, error: 'Failed to close investment' };
    }
}
