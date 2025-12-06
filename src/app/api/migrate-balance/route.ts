import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/app/actions/auth';
import { toNumber } from '@/lib/decimal';

/**
 * One-time migration endpoint to populate currentBalance for all accounts
 * DELETE THIS FILE after running the migration successfully
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

export async function POST() {
    try {
        // 需要管理员权限
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const accounts = await prisma.account.findMany({
            orderBy: { createdAt: 'asc' },
        });

        const results: Array<{
            name: string;
            type: string;
            oldBalance: number;
            newBalance: number;
            updated: boolean;
        }> = [];

        for (const account of accounts) {
            const calculatedBalance = await calculateAccountBalance(account.id);

            // 检查余额是否需要更新
            if (Math.abs(toNumber(account.currentBalance) - calculatedBalance) > 0.01) {
                await prisma.account.update({
                    where: { id: account.id },
                    data: { currentBalance: calculatedBalance },
                });
                results.push({
                    name: account.name,
                    type: account.type,
                    oldBalance: toNumber(account.currentBalance),
                    newBalance: calculatedBalance,
                    updated: true,
                });
            } else {
                results.push({
                    name: account.name,
                    type: account.type,
                    oldBalance: toNumber(account.currentBalance),
                    newBalance: calculatedBalance,
                    updated: false,
                });
            }
        }

        const updated = results.filter(r => r.updated).length;
        const skipped = results.filter(r => !r.updated).length;

        return NextResponse.json({
            success: true,
            summary: {
                total: accounts.length,
                updated,
                skipped,
            },
            results,
        });
    } catch (error) {
        console.error('Migration failed:', error);
        return NextResponse.json(
            { error: 'Migration failed', details: String(error) },
            { status: 500 }
        );
    }
}
