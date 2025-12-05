
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/decimal';

export async function GET() {
    try {
        const userId = await prisma.user.findFirst().then(u => u?.id);
        if (!userId) {
            return NextResponse.json({ error: 'No user found' });
        }

        const matches: string[] = [];

        // 1. Analyze Investments (All Types)
        const investments = await prisma.investment.findMany({
            where: { userId }
        });

        const invDetails: any[] = [];
        investments.forEach(inv => {
            const amount = toNumber(inv.currentAmount) || toNumber(inv.initialAmount);
            invDetails.push({
                name: inv.name,
                type: inv.type,
                status: inv.status,
                amount,
                currency: inv.currencyCode
            });
        });

        // 2. Analyze Accounts (All Types)
        const accounts = await prisma.account.findMany({
            where: { userId }
        });
        const allTx = await prisma.transaction.findMany({ where: { userId } });

        const accDetails: any[] = [];

        for (const acc of accounts) {
            let balance = toNumber(acc.initialBalance);
            const accTx = allTx.filter(t => t.accountId === acc.id || t.transferToAccountId === acc.id);
            accTx.forEach(t => {
                const amount = toNumber(t.amount);
                if (t.accountId === acc.id) {
                    if (t.type === 'EXPENSE') balance -= amount;
                    if (t.type === 'INCOME') balance += amount;
                    if (t.type === 'TRANSFER') balance -= amount;
                }
                if (t.transferToAccountId === acc.id) {
                    if (t.type === 'TRANSFER') {
                        balance += toNumber(t.targetAmount) || amount;
                    }
                }
            });

            accDetails.push({
                name: acc.name,
                type: acc.type,
                initial: toNumber(acc.initialBalance),
                balance,
                currency: acc.currencyCode
            });
        }

        // 7. Calculate Income vs Expense vs Capital
        const allIncome = allTx.filter(t => t.type === 'INCOME');
        const allExpense = allTx.filter(t => t.type === 'EXPENSE');

        const totalIncomeByCurrency: Record<string, number> = {};
        allIncome.forEach(t => {
            totalIncomeByCurrency[t.currencyCode] = (totalIncomeByCurrency[t.currencyCode] || 0) + toNumber(t.amount);
        });

        const totalExpenseByCurrency: Record<string, number> = {};
        allExpense.forEach(t => {
            totalExpenseByCurrency[t.currencyCode] = (totalExpenseByCurrency[t.currencyCode] || 0) + toNumber(t.amount);
        });

        // Calculate Net Flow (Income - Expense)
        const netFlowByCurrency: Record<string, number> = {};
        Object.keys(totalIncomeByCurrency).forEach(curr => {
            netFlowByCurrency[curr] = (netFlowByCurrency[curr] || 0) + totalIncomeByCurrency[curr];
        });
        Object.keys(totalExpenseByCurrency).forEach(curr => {
            netFlowByCurrency[curr] = (netFlowByCurrency[curr] || 0) - totalExpenseByCurrency[curr];
        });

        // Calculate Total Capital (Accounts + Investments)
        const totalCapitalByCurrency: Record<string, number> = {};
        accDetails.forEach(acc => {
            totalCapitalByCurrency[acc.currency] = (totalCapitalByCurrency[acc.currency] || 0) + acc.balance;
        });
        invDetails.forEach(inv => {
            // Only count active investments for capital water level
            if (inv.status === 'ACTIVE') {
                totalCapitalByCurrency[inv.currency] = (totalCapitalByCurrency[inv.currency] || 0) + inv.amount;
            }
        });

        // Calculate Discrepancy (Capital - Net Flow)
        const discrepancyByCurrency: Record<string, number> = {};
        const currencies = new Set([
            ...Object.keys(netFlowByCurrency),
            ...Object.keys(totalCapitalByCurrency)
        ]);

        currencies.forEach(curr => {
            const capital = totalCapitalByCurrency[curr] || 0;
            const netFlow = netFlowByCurrency[curr] || 0;
            discrepancyByCurrency[curr] = capital - netFlow;
        });

        // 8. Check for Expenses matching Assets
        // This explains why Capital > Net Flow (Expense reduces flow, but Asset keeps capital)
        const assetValues = investments.map(i => ({
            name: i.name,
            amount: toNumber(i.currentAmount) || toNumber(i.initialAmount),
            currency: i.currencyCode
        }));

        const matchingExpenses: any[] = [];
        assetValues.forEach(asset => {
            const match = allExpense.find(t =>
                t.currencyCode === asset.currency &&
                Math.abs(toNumber(t.amount) - asset.amount) < 1.0
            );
            if (match) {
                matchingExpenses.push({
                    assetName: asset.name,
                    expenseDate: match.date,
                    amount: toNumber(match.amount),
                    currency: match.currencyCode,
                    note: match.note
                });
            }
        });

        return NextResponse.json({
            userId,
            totalIncomeByCurrency,
            totalExpenseByCurrency,
            netFlowByCurrency,
            totalCapitalByCurrency,
            discrepancyByCurrency,
            matchingExpenses,
            matches
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack });
    }
}
