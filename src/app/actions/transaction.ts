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

        // 将 Decimal 字段转换为数字以供前端使用
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

        // 同步账户余额
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
        // 删除前获取交易信息，以便知道需要更新哪些账户
        const existing = await prisma.transaction.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== userId) {
            throw new Error('Transaction not found or unauthorized');
        }

        // 删除交易
        await prisma.transaction.delete({
            where: { id },
        });

        // 同步账户余额
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
        // 获取现有交易以追踪账户变更
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
                // 显式处理 projectId：如果 updates 中存在该属性，则使用其值（若为空则设为 null）
                // 这确保我们可以同时设置和清除项目关联
                ...(updates.hasOwnProperty('projectId') ? { projectId: updates.projectId || null } : {}),
                excludeFromAnalytics: updates.excludeFromAnalytics,
                splitParentId: updates.splitParentId,
            },
        });

        // 收集所有受影响的账户（旧的和新的）
        const affectedAccountIds = new Set<string>();
        if (existing.accountId) affectedAccountIds.add(existing.accountId);
        if (existing.transferToAccountId) affectedAccountIds.add(existing.transferToAccountId);
        if (updated.accountId) affectedAccountIds.add(updated.accountId);
        if (updated.transferToAccountId) affectedAccountIds.add(updated.transferToAccountId);

        // 同步所有受影响的账户
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
                user: false, // 不需要用户详细信息
            },
            orderBy: {
                date: 'desc',
            },
        });

        // 获取类别以映射名称
        const categories = await prisma.category.findMany({
            where: { userId: userId },
        });
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));

        // 生成 CSV
        const headers = ['Date', 'Type', 'Category', 'Amount', 'Currency', 'Merchant', 'Note', 'Source'];
        const rows = transactions.map(t => {
            const categoryName = (t.categoryId ? categoryMap.get(t.categoryId) : undefined) || 'Unknown';
            return [
                t.date,
                t.type,
                `"${categoryName.replace(/"/g, '""')}"`, // 转义引号
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
 * v3.0:拆分交易为多个子交易
 * 用于将单笔支付拆分到不同类别/项目
 * 
 * @param parentId - 要拆分的交易 ID
 * @param splits - 包含金额、类别 ID、项目 ID 和备注的拆分定义数组
 */
export interface SplitDefinition {
    amount: number;
    categoryId?: string;
    projectId?: string;
    note?: string;
}

export async function splitTransaction(parentId: string, splits: SplitDefinition[]) {
    return withAuth(async (userId) => {
        // 1. 获取父交易
        const parent = await prisma.transaction.findUnique({
            where: { id: parentId },
        });

        if (!parent || parent.userId !== userId) {
            throw new Error('Transaction not found or unauthorized');
        }

        // 2. 验证拆分金额总和等于父交易金额
        const totalSplitAmount = splits.reduce((sum, s) => sum + s.amount, 0);
        const tolerance = 0.01; // 允许舍入误差
        if (Math.abs(totalSplitAmount - toNumber(parent.amount)) > tolerance) {
            throw new Error(`Split amounts (${totalSplitAmount}) must equal parent amount (${toNumber(parent.amount)})`);
        }

        // 3. 检查父交易是否已存在拆分
        const existingSplits = await prisma.transaction.count({
            where: { splitParentId: parentId }
        });
        if (existingSplits > 0) {
            throw new Error('Transaction already has splits. Delete existing splits first.');
        }

        // 4. 创建子交易
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

            // 5. 标记父交易为排除分析（现在追踪子交易）
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
 * v3.0: 获取交易的拆分子项
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
 * v3.0: 删除所有拆分子项并恢复父交易
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
            // 删除所有子项
            await tx.transaction.deleteMany({
                where: { splitParentId: parentId }
            });

            // 恢复父交易
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
