'use server';

import { prisma } from '@/lib/db';
import { Investment } from '@prisma/client';
import { getCurrentUser, withAuth } from './auth';

export async function getInvestments() {
    return withAuth(async (userId) => {
        return await prisma.investment.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }, 'Failed to fetch investments');
}

export async function addInvestment(investment: Omit<Investment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    return withAuth(async (userId) => {
        // 1. Find or create "Investment" category (still needed for ASSET expenses)
        let category = await prisma.category.findFirst({
            where: {
                userId: userId,
                name: 'Investment',
                type: 'EXPENSE'
            }
        });

        if (!category) {
            category = await prisma.category.create({
                data: {
                    userId: userId,
                    name: 'Investment',
                    icon: '📈',
                    type: 'EXPENSE',
                    isDefault: false
                }
            });
        }

        // 2. Find or create "Investment Portfolio" account (for financial investments)
        let investmentAccount = await prisma.account.findFirst({
            where: {
                userId: userId,
                type: 'INVESTMENT',
                name: 'Investment Portfolio'
            }
        });

        if (!investmentAccount) {
            investmentAccount = await prisma.account.create({
                data: {
                    userId: userId,
                    name: 'Investment Portfolio',
                    type: 'INVESTMENT',
                    initialBalance: 0,
                    currencyCode: investment.currencyCode,
                    icon: '💼',
                    color: '#8884d8'
                }
            });
        }

        // 3. Validate Source Account for Financial Investments
        if (investment.type !== 'ASSET' && !investment.accountId) {
            throw new Error('Source account is required for financial investments');
        }

        const newInvestment = await prisma.$transaction(async (tx) => {
            // Create the investment first
            const createdInvestment = await tx.investment.create({
                data: {
                    ...investment,
                    userId: userId,
                    lastDepreciationDate: investment.startDate, // Initialize with start date
                    projectId: investment.projectId,
                },
            });

            if (investment.type === 'ASSET') {
                // ASSETs are now Transfers (Capitalization)
                // From: Selected Account (Bank) -> To: Fixed Assets Account

                // Find or create "Fixed Assets" account
                let fixedAssetsAccount = await tx.account.findFirst({
                    where: { userId: userId, name: 'Fixed Assets', type: 'ASSET' }
                });

                if (!fixedAssetsAccount) {
                    fixedAssetsAccount = await tx.account.create({
                        data: {
                            userId: userId,
                            name: 'Fixed Assets',
                            type: 'ASSET',
                            initialBalance: 0,
                            currencyCode: investment.currencyCode,
                            icon: '💻',
                            color: '#82ca9d'
                        }
                    });
                }

                const transactionAmount = investment.purchasePrice || investment.initialAmount;

                // Only create transfer if source account is provided (optional for Assets?)
                // If accountId is provided, we transfer from it.
                // If not, maybe we should just create the asset without reducing cash? 
                // But usually you pay for assets.
                // Let's assume if accountId is present, we transfer.
                if (investment.accountId) {
                    await tx.transaction.create({
                        data: {
                            userId: userId,
                            amount: transactionAmount,
                            currencyCode: investment.currencyCode,
                            date: investment.startDate,
                            type: 'TRANSFER',
                            source: 'MANUAL',
                            note: `Asset Acquisition: ${investment.name}`,
                            merchant: 'Fixed Assets',
                            investmentId: createdInvestment.id,
                            accountId: investment.accountId, // From selected account
                            transferToAccountId: fixedAssetsAccount.id, // To Fixed Assets
                            projectId: investment.projectId,
                        }
                    });
                }
            } else {
                // Stocks, Deposits, Funds are Transfers (Asset Transfer)
                // From: Selected Account (Bank) -> To: Investment Portfolio Account

                await tx.transaction.create({
                    data: {
                        userId: userId,
                        amount: investment.initialAmount,
                        currencyCode: investment.currencyCode,
                        date: investment.startDate,
                        type: 'TRANSFER',
                        source: 'MANUAL',
                        note: `Investment: ${investment.name}`,
                        merchant: 'Investment Portfolio',
                        investmentId: createdInvestment.id,
                        accountId: investment.accountId!, // Enforced above
                        transferToAccountId: investmentAccount.id, // To Investment Portfolio
                        projectId: investment.projectId,
                    }
                });
            }

            return createdInvestment;
        });

        return newInvestment;
    }, 'Failed to add investment');
}


export async function recordDepreciation(id: string, amount: number, date: string) {
    return withAuth(async (userId) => {
        // Verify ownership
        const existing = await prisma.investment.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== userId) {
            throw new Error('Investment not found or unauthorized');
        }

        // Update investment current value
        // Calculate new currentAmount properly (don't use decrement on null)
        const currentValue = existing.currentAmount ?? existing.purchasePrice ?? existing.initialAmount;
        const newValue = Math.max(currentValue - amount, existing.salvageValue ?? 0);

        const updatedInvestment = await prisma.investment.update({
            where: { id },
            data: {
                currentAmount: newValue,
                lastDepreciationDate: date
            }
        });

        // Create a depreciation transaction (Expense)
        // Find or create Depreciation category
        let category = await prisma.category.findFirst({
            where: {
                userId: userId,
                name: 'Depreciation',
            },
        });

        if (!category) {
            category = await prisma.category.create({
                data: {
                    userId: userId,
                    name: 'Depreciation',
                    type: 'EXPENSE',
                    icon: 'trending-down',
                    isDefault: false,
                },
            });
        }

        // Find Fixed Assets account
        const fixedAssetsAccount = await prisma.account.findFirst({
            where: {
                userId: userId,
                name: 'Fixed Assets',
                type: 'ASSET'
            }
        });

        // Create transaction
        await prisma.transaction.create({
            data: {
                userId: userId,
                amount: amount,
                currencyCode: existing.currencyCode,
                categoryId: category.id,
                date: date,
                type: 'EXPENSE',
                source: 'MANUAL',
                note: `Depreciation: ${existing.name}`,
                merchant: 'System',
                investmentId: existing.id,
                accountId: fixedAssetsAccount?.id, // Link to Fixed Assets account
            },
        });

        return updatedInvestment;
    }, 'Failed to record depreciation');
}


export async function updateInvestment(id: string, updates: Partial<Investment>) {
    return withAuth(async (userId) => {
        // Verify ownership
        const existing = await prisma.investment.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== userId) {
            throw new Error('Investment not found or unauthorized');
        }

        // Use transaction to update both investment and related transaction
        return await prisma.$transaction(async (tx) => {
            const updatedInvestment = await tx.investment.update({
                where: { id },
                data: updates,
            });

            // If initialAmount or purchasePrice changed, update the associated TRANSFER transaction
            if (updates.initialAmount !== undefined || updates.purchasePrice !== undefined) {
                const newAmount = updates.purchasePrice ?? updates.initialAmount;

                if (newAmount !== undefined) {
                    // Find the original creation transaction (TRANSFER)
                    const creationTx = await tx.transaction.findFirst({
                        where: {
                            investmentId: id,
                            type: 'TRANSFER',
                            // Usually the first one is the creation one
                        },
                        orderBy: {
                            createdAt: 'asc'
                        }
                    });

                    if (creationTx) {
                        await tx.transaction.update({
                            where: { id: creationTx.id },
                            data: {
                                amount: newAmount
                            }
                        });
                    }
                }
            }

            return updatedInvestment;
        });
    }, 'Failed to update investment');
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
            // 1. Delete explicitly linked transactions
            await tx.transaction.deleteMany({
                where: {
                    userId: user.id,
                    investmentId: id
                }
            });

            // 2. Attempt to find and delete unlinked transactions (legacy or bugged)
            // This specifically targets the initial creation transaction
            if (existing.initialAmount) {
                await tx.transaction.deleteMany({
                    where: {
                        userId: user.id,
                        investmentId: null, // Only delete if not linked
                        amount: existing.initialAmount, // Match amount
                        date: existing.startDate, // Match date
                        OR: [
                            { note: { contains: existing.name } },
                            { note: `Investment: ${existing.name}` },
                            { note: `Asset Acquisition: ${existing.name}` }
                        ]
                    }
                });
            }

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

        // Find Investment Portfolio account
        const investmentAccount = await prisma.account.findFirst({
            where: {
                userId: user.id,
                type: 'INVESTMENT',
                name: 'Investment Portfolio'
            }
        });

        if (!investmentAccount && existing.type !== 'ASSET') {
            // Should exist if created via new logic, but might not for old data
            // If not found, we might need to create it or handle gracefully
            // For now, let's assume if it's not ASSET, we need it.
        }

        // 2. Update Investment and Create Transactions
        const updatedInvestment = await prisma.$transaction(async (tx) => {
            const updated = await tx.investment.update({
                where: { id },
                data: {
                    status: 'CLOSED',
                    currentAmount: finalAmount,
                    endDate
                }
            });

            if (existing.type === 'ASSET') {
                // ASSET logic: Sell the asset
                // Create a TRANSFER from Fixed Assets -> User Account (Bank)
                // This reduces Fixed Assets balance and increases User Account balance

                // Find Fixed Assets account
                const fixedAssetsAccount = await tx.account.findFirst({
                    where: { userId: user.id, name: 'Fixed Assets', type: 'ASSET' }
                });

                if (fixedAssetsAccount && accountId) {
                    await tx.transaction.create({
                        data: {
                            userId: user.id,
                            amount: finalAmount,
                            currencyCode: existing.currencyCode,
                            date: endDate,
                            type: 'TRANSFER',
                            source: 'MANUAL',
                            note: `Asset Sold: ${existing.name}`,
                            merchant: 'Second-hand Market',
                            investmentId: id,
                            accountId: fixedAssetsAccount.id, // From Fixed Assets
                            transferToAccountId: accountId,   // To User Account
                        }
                    });
                } else {
                    // Fallback to INCOME if no account selected or Fixed Assets not found
                    // (Though Fixed Assets should exist)
                    let category = await prisma.category.findFirst({
                        where: { userId: user.id, name: 'Investment Return', type: 'INCOME' }
                    });
                    if (!category) {
                        category = await prisma.category.create({
                            data: { userId: user.id, name: 'Investment Return', icon: '💰', type: 'INCOME', isDefault: false }
                        });
                    }

                    await tx.transaction.create({
                        data: {
                            userId: user.id,
                            amount: finalAmount,
                            currencyCode: existing.currencyCode,
                            categoryId: category.id,
                            date: endDate,
                            type: 'INCOME',
                            source: 'MANUAL',
                            note: `Asset Sold: ${existing.name}`,
                            merchant: 'Second-hand Market',
                            investmentId: id,
                            accountId: accountId,
                        }
                    });
                }

            } else {
                // Financial Instruments (Stock, Fund, Deposit)
                // 1. Return Principal (Transfer)
                // 2. Realized Gain/Loss (Income/Expense)

                const principal = existing.initialAmount;
                const profit = finalAmount - principal;

                // 1. Transfer Principal back
                if (investmentAccount && accountId) {
                    await tx.transaction.create({
                        data: {
                            userId: user.id,
                            amount: principal,
                            currencyCode: existing.currencyCode,
                            date: endDate,
                            type: 'TRANSFER',
                            source: 'MANUAL',
                            note: `Investment Principal Return: ${existing.name}`,
                            merchant: 'Investment Portfolio',
                            investmentId: id,
                            accountId: investmentAccount.id, // From Investment Portfolio
                            transferToAccountId: accountId, // To User Account
                        }
                    });
                }

                // 2. Record Profit/Loss
                if (Math.abs(profit) > 0.01) { // Ignore negligible differences
                    if (profit > 0) {
                        // Gain -> Income
                        let category = await prisma.category.findFirst({
                            where: { userId: user.id, name: 'Investment Return', type: 'INCOME' }
                        });
                        if (!category) {
                            category = await prisma.category.create({
                                data: { userId: user.id, name: 'Investment Return', icon: '💰', type: 'INCOME', isDefault: false }
                            });
                        }

                        await tx.transaction.create({
                            data: {
                                userId: user.id,
                                amount: profit,
                                currencyCode: existing.currencyCode,
                                categoryId: category.id,
                                date: endDate,
                                type: 'INCOME',
                                source: 'MANUAL',
                                note: `Investment Gain: ${existing.name}`,
                                merchant: 'Investment Portfolio',
                                investmentId: id,
                                accountId: accountId, // Deposit profit to user account
                            }
                        });
                    } else {
                        // Loss -> Expense
                        let category = await prisma.category.findFirst({
                            where: { userId: user.id, name: 'Investment Loss', type: 'EXPENSE' }
                        });
                        if (!category) {
                            category = await prisma.category.create({
                                data: { userId: user.id, name: 'Investment Loss', icon: '📉', type: 'EXPENSE', isDefault: false }
                            });
                        }

                        await tx.transaction.create({
                            data: {
                                userId: user.id,
                                amount: Math.abs(profit),
                                currencyCode: existing.currencyCode,
                                categoryId: category.id,
                                date: endDate,
                                type: 'EXPENSE',
                                source: 'MANUAL',
                                note: `Investment Loss: ${existing.name}`,
                                merchant: 'Investment Portfolio',
                                investmentId: id,
                                accountId: accountId, // Deduct loss from user account (conceptually, or just record it)

                            }
                        });

                    }
                }
            }
            return updated;
        });

        return { success: true, data: updatedInvestment };
    } catch (error) {
        console.error('Failed to close investment:', error);
        return { success: false, error: 'Failed to close investment' };
    }
}
