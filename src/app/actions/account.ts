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
 * 计算账户当前余额
 * 余额 = 初始余额 + 收入 - 支出 - 转出 + 转入
 * 此函数仅供内部重新计算使用。
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

    // 加上收入，减去支出
    for (const tx of account.transactions) {
        const amount = toNumber(tx.amount);
        if (tx.type === 'INCOME') {
            balance += amount;
        } else if (tx.type === 'EXPENSE') {
            balance -= amount;
        } else if (tx.type === 'TRANSFER') {
            // 转出资金减去
            balance -= amount;
        }
    }

    // 加上转入资金
    for (const tx of account.transfersTo) {
        if (tx.type === 'TRANSFER') {
            // 如果有目标金额（跨币种转账），使用目标金额，否则使用原金额
            balance += toNumber(tx.targetAmount) || toNumber(tx.amount);
        }
    }

    return balance;
}

/**
 * 重新计算并更新账户的 currentBalance 字段。
 * 在对该账户进行任何影响余额的交易增删改操作后调用此函数。
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

        // 将 Decimal 字段转换为数字以供前端使用
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
        // 如果这是第一个账户或明确标记为默认，则将其设为默认
        const existingAccountsCount = await prisma.account.count({
            where: { userId: userId },
        });

        const isDefault = account.isDefault || existingAccountsCount === 0;

        // 如果设为默认，取消其他账户的默认状态
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
                currentBalance: account.initialBalance, // 初始化为初始余额
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
        // 验证所有权
        const existing = await prisma.account.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== userId) {
            throw new Error('Account not found or unauthorized');
        }

        // 如果设为默认，先取消其他账户的默认状态
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
        // 验证所有权
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

        // 检查账户是否有交易
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
            // 如果没有默认账户，返回第一个账户
            const firstAccount = await prisma.account.findFirst({
                where: { userId: userId },
                orderBy: { createdAt: 'asc' },
            });

            return firstAccount;
        }

        return defaultAccount;
    }, 'Failed to fetch default account');
}
