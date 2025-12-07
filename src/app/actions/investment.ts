'use server';

import { prisma } from '@/lib/db';
import { Investment } from '@prisma/client';
import { getCurrentUser, withAuth } from './auth';
import { toNumber } from '@/lib/decimal';
import { recalculateAccountBalance } from './account';

export async function getInvestments() {
    return withAuth(async (userId) => {
        const investments = await prisma.investment.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // 将 Decimal 字段转换为数字以供前端使用
        return investments.map(inv => ({
            ...inv,
            initialAmount: toNumber(inv.initialAmount),
            currentAmount: inv.currentAmount ? toNumber(inv.currentAmount) : null,
            interestRate: inv.interestRate ? toNumber(inv.interestRate) : null,
            salvageValue: inv.salvageValue ? toNumber(inv.salvageValue) : null,
            purchasePrice: inv.purchasePrice ? toNumber(inv.purchasePrice) : null,
        }));
    }, 'Failed to fetch investments');
}

// 兼容前端的投资创建输入类型
export interface InvestmentCreateInput {
    name: string;
    type: string;
    initialAmount: number;
    currentAmount?: number | null;
    currencyCode: string;
    interestRate?: number | null;
    accountId?: string | null;
    startDate: string;
    endDate?: string | null;
    status: string;
    note?: string | null;
    projectId?: string | null;
    // Asset specific
    purchasePrice?: number | null;
    usefulLife?: number | null;
    salvageValue?: number | null;
    depreciationType?: string | null;
    lastDepreciationDate?: string | null;
}

export async function addInvestment(investment: InvestmentCreateInput) {
    return withAuth(async (userId) => {
        // 1. 查找或创建 "Investment" 类别（用于资产支出）
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

        // 2. 查找或创建 "Investment Portfolio" 账户（用于金融投资）
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

        // 3. 验证金融投资的来源账户
        if (investment.type !== 'ASSET' && !investment.accountId) {
            throw new Error('Source account is required for financial investments');
        }

        const newInvestment = await prisma.$transaction(async (tx) => {
            // 首先创建投资
            const createdInvestment = await tx.investment.create({
                data: {
                    ...investment,
                    userId: userId,
                    lastDepreciationDate: investment.startDate, // 初始为开始日期
                    projectId: investment.projectId,
                },
            });

            if (investment.type === 'ASSET') {
                // 固定资产（ASSET）现在视为转账（资本化）
                // 从：选中账户（银行） -> 到：固定资产账户

                // 查找或创建 "Fixed Assets" 账户
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

                // 仅在提供来源账户时创建转账
                // 如果 accountId 存在，我们进行转账。
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
                            accountId: investment.accountId, // 来源：由于选中账户
                            transferToAccountId: fixedAssetsAccount.id, // 目标：固定资产账户
                            projectId: investment.projectId,
                        }
                    });
                }
            } else {
                // 股票、存款、基金视为转账（资产转移）
                // 从：选中账户（银行） -> 到：投资组合账户

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
                        accountId: investment.accountId!, // 强制要求
                        transferToAccountId: investmentAccount.id, // 到投资组合账户
                        projectId: investment.projectId,
                    }
                });
            }

            return createdInvestment;
        });

        // 创建转账后同步账户余额
        if (investment.accountId) {
            await recalculateAccountBalance(investment.accountId);
        }

        // 重新计算目标账户余额
        if (investment.type === 'ASSET') {
            // 查找固定资产账户并重新计算
            const fixedAssetsAccount = await prisma.account.findFirst({
                where: { userId: userId, name: 'Fixed Assets', type: 'ASSET' }
            });
            if (fixedAssetsAccount) {
                await recalculateAccountBalance(fixedAssetsAccount.id);
            }
        } else {
            // 重新计算投资组合账户
            if (investmentAccount) {
                await recalculateAccountBalance(investmentAccount.id);
            }
        }

        return newInvestment;
    }, 'Failed to add investment');
}


export async function recordDepreciation(id: string, amount: number, date: string) {
    return withAuth(async (userId) => {
        // 验证所有权
        const existing = await prisma.investment.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== userId) {
            throw new Error('Investment not found or unauthorized');
        }

        // 更新投资当前价值
        // 正确计算新的 currentAmount
        const currentValue = toNumber(existing.currentAmount) || toNumber(existing.purchasePrice) || toNumber(existing.initialAmount);
        const newValue = Math.max(currentValue - amount, toNumber(existing.salvageValue));

        const updatedInvestment = await prisma.investment.update({
            where: { id },
            data: {
                currentAmount: newValue,
                lastDepreciationDate: date
            }
        });

        // 创建折旧交易（支出）
        // 查找或创建 "Depreciation" 类别
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

        // 查找固定资产账户
        const fixedAssetsAccount = await prisma.account.findFirst({
            where: {
                userId: userId,
                name: 'Fixed Assets',
                type: 'ASSET'
            }
        });

        // 创建交易
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
                accountId: fixedAssetsAccount?.id, // 关联到固定资产账户
            },
        });

        return updatedInvestment;
    }, 'Failed to record depreciation');
}


// 兼容前端的输入类型，接受 number 而非 Decimal
export interface InvestmentUpdateInput {
    name?: string;
    type?: string;
    initialAmount?: number;
    currentAmount?: number | null;
    currencyCode?: string;
    interestRate?: number | null;
    accountId?: string | null;
    startDate?: string;
    endDate?: string | null;
    status?: string;
    note?: string | null;
    writtenOffDate?: string | null;
    writtenOffReason?: string | null;
    depreciationType?: string | null;
    usefulLife?: number | null;
    salvageValue?: number | null;
    purchasePrice?: number | null;
    lastDepreciationDate?: string | null;
    projectId?: string | null;
}

export async function updateInvestment(id: string, updates: InvestmentUpdateInput) {
    return withAuth(async (userId) => {
        // 验证所有权
        const existing = await prisma.investment.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== userId) {
            throw new Error('Investment not found or unauthorized');
        }

        // 使用事务同时更新投资和相关交易
        return await prisma.$transaction(async (tx) => {
            const updatedInvestment = await tx.investment.update({
                where: { id },
                data: updates,
            });

            // 如果初始金额或购买价格改变，更新关联的转账交易
            if (updates.initialAmount !== undefined || updates.purchasePrice !== undefined) {
                const newAmount = updates.purchasePrice ?? updates.initialAmount;

                if (newAmount !== undefined) {
                    // 查找原始创建交易（TRANSFER）
                    const creationTx = await tx.transaction.findFirst({
                        where: {
                            investmentId: id,
                            type: 'TRANSFER',
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

        // 0. 收集受影响的账户 ID，以便在删除后重新计算余额
        const accountIdsToUpdate = new Set<string>();

        // 查找直接关联的交易
        const relatedTransactions = await prisma.transaction.findMany({
            where: {
                userId: user.id,
                investmentId: id
            },
            select: { accountId: true, transferToAccountId: true }
        });

        relatedTransactions.forEach(tx => {
            if (tx.accountId) accountIdsToUpdate.add(tx.accountId);
            if (tx.transferToAccountId) accountIdsToUpdate.add(tx.transferToAccountId);
        });

        // 查找可能存在的未关联交易（遗留逻辑）
        if (existing.initialAmount) {
            const unlinkedTransactions = await prisma.transaction.findMany({
                where: {
                    userId: user.id,
                    investmentId: null, // 仅删除未关联的
                    amount: existing.initialAmount, // 匹配金额
                    OR: [
                        { note: { contains: existing.name } },
                        { note: `Investment: ${existing.name}` },
                        { note: `Asset Acquisition: ${existing.name}` }
                    ]
                },
                select: { accountId: true, transferToAccountId: true }
            });

            unlinkedTransactions.forEach(tx => {
                if (tx.accountId) accountIdsToUpdate.add(tx.accountId);
                if (tx.transferToAccountId) accountIdsToUpdate.add(tx.transferToAccountId);
            });
        }

        // 使用事务原子性地删除投资和相关交易
        await prisma.$transaction(async (tx) => {
            // 1. 删除明确关联的交易
            await tx.transaction.deleteMany({
                where: {
                    userId: user.id,
                    investmentId: id
                }
            });

            // 2. 尝试查找并删除未关联的交易（遗留数据或错误数据）
            if (existing.initialAmount) {
                await tx.transaction.deleteMany({
                    where: {
                        userId: user.id,
                        investmentId: null, // 仅删除未关联的
                        amount: existing.initialAmount, // 匹配金额
                        OR: [
                            { note: { contains: existing.name } },
                            { note: `Investment: ${existing.name}` },
                            { note: `Asset Acquisition: ${existing.name}` }
                        ]
                    }
                });
            }

            // 删除投资
            await tx.investment.delete({
                where: { id },
            });
        });

        // 3. 重新计算受影响账户的余额
        // 注意：这是在事务之外进行的，因为我们需要在余额更新可见之前让删除提交
        // 虽然理论上在事务内也可以，但在事务结束时计算更安全，确保数据一致性
        for (const accountId of accountIdsToUpdate) {
            await recalculateAccountBalance(accountId);
        }

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

        // 查找投资组合账户
        const investmentAccount = await prisma.account.findFirst({
            where: {
                userId: user.id,
                type: 'INVESTMENT',
                name: 'Investment Portfolio'
            }
        });

        if (!investmentAccount && existing.type !== 'ASSET') {
            // 如果不存在，可能需要创建或优雅处理
            // 目前假设如果不是固定资产，我们需要它。
        }

        // 2. 更新投资并创建交易
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
                // 资产处理逻辑：出售资产
                // 创建转账：从 固定资产 -> 用户账户（银行）
                // 这将减少固定资产余额并增加用户账户余额

                // 查找固定资产账户
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
                            accountId: fixedAssetsAccount.id, // 来源：固定资产
                            transferToAccountId: accountId,   // 目标：用户账户
                        }
                    });
                } else {
                    // 如果未选择账户或找不到固定资产账户，回退到收入（INCOME）
                    // （尽管固定资产账户应该存在）
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
                // 金融工具（股票、基金、存款）
                // 1. 本金返还（转账）
                // 2. 实现盈亏（收入/支出）

                const principal = toNumber(existing.initialAmount);
                const profit = finalAmount - principal;

                // 1. 本金转回
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
                            accountId: investmentAccount.id, // 来源：投资组合账户
                            transferToAccountId: accountId, // 目标：用户账户
                        }
                    });
                }

                // 2. 记录盈亏
                if (Math.abs(profit) > 0.01) { // 忽略微小差异
                    if (profit > 0) {
                        // 盈利 -> 收入
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
                                accountId: accountId, // 将利润存入用户账户
                            }
                        });
                    } else {
                        // 亏损 -> 支出
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
                                accountId: accountId, // 从用户账户扣除亏损（概念上，或仅记录）

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

/**
 * v3.0: 资产报废（报告为全额损失）
 * 用于资产损坏、丢失或过时且无残值的情况
 */
export async function writeOffInvestment(id: string, writeOffDate: string, reason: string) {
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

        if (existing.status !== 'ACTIVE') {
            return { success: false, error: 'Only active assets can be written off' };
        }

        if (existing.type !== 'ASSET') {
            return { success: false, error: 'Write-off is only available for fixed assets' };
        }

        // 计算剩余账面价值（我们将报销的部分）
        const purchasePrice = toNumber(existing.purchasePrice) || toNumber(existing.initialAmount);
        const salvageValue = toNumber(existing.salvageValue);
        const usefulLifeDays = (existing.usefulLife || 3) * 365;

        const startDate = new Date(existing.startDate);
        const writeOffDateObj = new Date(writeOffDate);
        const daysOwned = Math.max(0, (writeOffDateObj.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        // 计算累计折旧
        const accumulatedDepreciation = Math.min(
            (purchasePrice - salvageValue) * (daysOwned / usefulLifeDays),
            purchasePrice - salvageValue
        );

        // 剩余账面价值 = 购买价格 - 累计折旧
        const remainingBookValue = Math.max(purchasePrice - accumulatedDepreciation, salvageValue);

        const updatedInvestment = await prisma.$transaction(async (tx) => {
            // 1. 更新投资状态为 WRITTEN_OFF
            const updated = await tx.investment.update({
                where: { id },
                data: {
                    status: 'WRITTEN_OFF',
                    currentAmount: 0,
                    endDate: writeOffDate,
                    writtenOffDate: writeOffDate,
                    writtenOffReason: reason,
                }
            });

            // 2. 为损失创建支出交易（剩余账面价值）
            // 查找或创建 "Asset Write-off" 类别
            let category = await tx.category.findFirst({
                where: { userId: user.id, name: 'Asset Write-off', type: 'EXPENSE' }
            });
            if (!category) {
                category = await tx.category.create({
                    data: {
                        userId: user.id,
                        name: 'Asset Write-off',
                        icon: '⚠️',
                        type: 'EXPENSE',
                        isDefault: false
                    }
                });
            }

            // 查找固定资产账户
            const fixedAssetsAccount = await tx.account.findFirst({
                where: { userId: user.id, name: 'Fixed Assets', type: 'ASSET' }
            });

            // 记录损失为支出
            await tx.transaction.create({
                data: {
                    userId: user.id,
                    amount: remainingBookValue,
                    currencyCode: existing.currencyCode,
                    categoryId: category.id,
                    date: writeOffDate,
                    type: 'EXPENSE',
                    source: 'MANUAL',
                    note: `Asset Write-off: ${existing.name} (${reason})`,
                    merchant: 'System Write-off',
                    investmentId: id,
                    accountId: fixedAssetsAccount?.id,
                    projectId: existing.projectId, // 保留项目归属
                }
            });

            return updated;
        });

        return {
            success: true,
            data: updatedInvestment,
            lossAmount: remainingBookValue
        };
    } catch (error) {
        console.error('Failed to write off investment:', error);
        return { success: false, error: 'Failed to write off investment' };
    }
}
