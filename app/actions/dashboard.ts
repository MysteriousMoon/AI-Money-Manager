'use server';

import { prisma } from '@/lib/db';
import { withAuth } from './auth';
import { Investment, Transaction, Project } from '@prisma/client';
import { convertAmount } from '@/lib/server-currency';

// Helper to calculate depreciation for a specific day
function calculateDailyDepreciation(asset: Investment, date: Date): number {
    if (asset.status !== 'ACTIVE' || asset.type !== 'ASSET') return 0;
    if (!asset.purchasePrice || !asset.usefulLife || !asset.startDate) return 0;

    const startDate = new Date(asset.startDate);
    if (date < startDate) return 0;

    // Simple Straight-Line Depreciation for Daily Rate
    // (Cost - Salvage) / (Useful Life Years * 365)
    const cost = asset.purchasePrice;
    const salvage = asset.salvageValue || 0;
    const usefulLifeYears = asset.usefulLife;

    if (usefulLifeYears <= 0) return 0;

    const dailyDepreciation = (cost - salvage) / (usefulLifeYears * 365);
    return dailyDepreciation;
}

// Helper to calculate project amortization for a specific day (with currency conversion)
async function calculateProjectAmortization(
    project: Project & { transactions: Transaction[] },
    date: Date,
    baseCurrency: string,
    exchangeRateApiKey?: string
): Promise<number> {
    if (project.type !== 'TRIP' && project.type !== 'EVENT') return 0;
    if (!project.startDate || !project.endDate) return 0;

    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);

    if (date < startDate || date > endDate) return 0;

    // Total Cost of Project (with currency conversion)
    let totalCost = 0;
    for (const t of project.transactions) {
        totalCost += await convertAmount(t.amount, t.currencyCode, baseCurrency, exchangeRateApiKey);
    }

    // Duration in Days
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1);

    return totalCost / durationDays;
}

export async function getMeIncMetrics(startDate: string, endDate: string) {
    return withAuth(async (userId) => {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Fetch user settings for base currency
        const userSettings = await prisma.settings.findUnique({
            where: { userId }
        });
        const baseCurrency = userSettings?.currency || 'CNY';
        const exchangeRateApiKey = userSettings?.exchangeRateApiKey || undefined;

        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: startDate, lte: endDate },
            }
        });

        const assets = await prisma.investment.findMany({
            where: {
                userId,
                type: 'ASSET',
                status: 'ACTIVE'
            }
        });

        const projects = await prisma.project.findMany({
            where: {
                userId,
                type: { in: ['TRIP', 'EVENT'] },
                startDate: { lte: endDate },
                endDate: { gte: startDate }
            },
            include: {
                transactions: true
            }
        });

        // Calculate Current Capital Level (Snapshot at "Now")
        const allAccounts = await prisma.account.findMany({ where: { userId } });
        const allInvestments = await prisma.investment.findMany({ where: { userId, status: 'ACTIVE' } });
        const allTx = await prisma.transaction.findMany({ where: { userId } });

        // Calculate Current Balances with currency conversion
        const accountBalances = new Map<string, number>();
        for (const a of allAccounts) {
            const balance = await convertAmount(a.initialBalance, a.currencyCode, baseCurrency, exchangeRateApiKey);
            accountBalances.set(a.id, balance);
        }

        for (const t of allTx) {
            const convertedAmount = await convertAmount(t.amount, t.currencyCode, baseCurrency, exchangeRateApiKey);

            if (t.accountId && accountBalances.has(t.accountId)) {
                const bal = accountBalances.get(t.accountId) || 0;
                if (t.type === 'EXPENSE') accountBalances.set(t.accountId, bal - convertedAmount);
                if (t.type === 'INCOME') accountBalances.set(t.accountId, bal + convertedAmount);
                if (t.type === 'TRANSFER') accountBalances.set(t.accountId, bal - convertedAmount);
            }
            if (t.transferToAccountId && accountBalances.has(t.transferToAccountId)) {
                const bal = accountBalances.get(t.transferToAccountId) || 0;
                const targetAmount = t.targetAmount ?? t.amount;
                const convertedTarget = await convertAmount(targetAmount, t.targetCurrencyCode || t.currencyCode, baseCurrency, exchangeRateApiKey);
                accountBalances.set(t.transferToAccountId, bal + convertedTarget);
            }
        }

        let totalCurrentCapital = 0;
        accountBalances.forEach(bal => totalCurrentCapital += bal);

        // Add financial investments (exclude fixed assets)
        for (const i of allInvestments) {
            if (i.type !== 'ASSET') {
                const value = i.currentAmount ?? i.initialAmount;
                totalCurrentCapital += await convertAmount(value, i.currencyCode, baseCurrency, exchangeRateApiKey);
            }
        }

        // Calculate Net Change from Start to Now
        let netChangeStartToNow = 0;
        const startObj = new Date(startDate);

        for (const t of allTx) {
            const tDate = new Date(t.date);
            if (tDate >= startObj) {
                const convertedAmount = await convertAmount(t.amount, t.currencyCode, baseCurrency, exchangeRateApiKey);

                let change = 0;
                if (t.type === 'INCOME') change = convertedAmount;
                if (t.type === 'EXPENSE') change = -convertedAmount;
                if (t.type === 'TRANSFER') {
                    const inv = allInvestments.find(i => i.id === t.investmentId);
                    if (inv && inv.type === 'ASSET') {
                        change = -convertedAmount;
                    }
                }

                netChangeStartToNow += change;
            }
        }

        const capitalAtStart = totalCurrentCapital - netChangeStartToNow;

        // Generate Daily Data
        const dailyData = [];
        let currentCapital = capitalAtStart;
        const currentDate = new Date(start);

        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];

            const dailyTx = transactions.filter(t => t.date === dateStr);
            let dailyIncome = 0;
            let dailyExpense = 0;
            let dailyNetChange = 0;

            for (const t of dailyTx) {
                const convertedAmount = await convertAmount(t.amount, t.currencyCode, baseCurrency, exchangeRateApiKey);

                if (t.type === 'INCOME') dailyIncome += convertedAmount;
                if (t.type === 'EXPENSE') dailyExpense += convertedAmount;
                if (t.type === 'TRANSFER') {
                    const inv = allInvestments.find(i => i.id === t.investmentId);
                    if (inv && inv.type === 'ASSET') {
                        dailyExpense += convertedAmount;
                    }
                }
            }

            dailyNetChange = dailyIncome - dailyExpense;
            currentCapital += dailyNetChange;

            // Ordinary Expenses (excludes project-linked and investment-linked)
            const ordinaryTx = dailyTx.filter(t =>
                t.type === 'EXPENSE' &&
                !t.projectId &&
                !t.investmentId
            );
            let ordinaryCost = 0;
            for (const t of ordinaryTx) {
                ordinaryCost += await convertAmount(t.amount, t.currencyCode, baseCurrency, exchangeRateApiKey);
            }

            // Asset Depreciation (already in asset's currency, convert to base)
            let depreciationCost = 0;
            for (const asset of assets) {
                const dailyDep = calculateDailyDepreciation(asset, currentDate);
                depreciationCost += await convertAmount(dailyDep, asset.currencyCode, baseCurrency, exchangeRateApiKey);
            }

            // Project Amortization
            let projectCost = 0;
            for (const project of projects) {
                projectCost += await calculateProjectAmortization(project, currentDate, baseCurrency, exchangeRateApiKey);
            }

            dailyData.push({
                date: dateStr,
                capitalLevel: currentCapital,
                income: dailyIncome,
                expense: dailyExpense,
                ordinaryCost,
                depreciationCost,
                projectCost,
                totalBurn: ordinaryCost + depreciationCost + projectCost,
                netProfit: dailyIncome - (ordinaryCost + depreciationCost + projectCost)
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return {
            dailySeries: dailyData,
            currentCapital: totalCurrentCapital,
            baseCurrency,
            dailyBurnRate: dailyData.map(d => ({
                date: d.date,
                ordinaryCost: d.ordinaryCost,
                depreciationCost: d.depreciationCost,
                projectCost: d.projectCost,
                totalDailyCost: d.totalBurn
            }))
        };

    }, 'Failed to fetch Me Inc. metrics');
}
