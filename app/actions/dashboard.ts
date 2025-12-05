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
    baseCurrency: string
): Promise<number> {
    if (project.type !== 'TRIP' && project.type !== 'EVENT') return 0;
    if (!project.startDate || !project.endDate) return 0;

    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);

    if (date < startDate || date > endDate) return 0;

    // Total Cost of Project (with currency conversion)
    let totalCost = 0;
    for (const t of project.transactions) {
        const amount = await convertAmount(t.amount, t.currencyCode, baseCurrency);
        if (t.type === 'EXPENSE') {
            totalCost += amount;
        } else if (t.type === 'INCOME') {
            totalCost -= amount; // Income reduces the total cost (e.g. refunds, split reimbursements)
        }
    }

    // Duration in Days
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1);

    return Math.max(0, totalCost / durationDays); // Ensure non-negative daily cost
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
        // Only include non-INVESTMENT, non-ASSET accounts for "cash" capital
        const accountBalances = new Map<string, number>();
        const cashAccountIds = new Set<string>();
        for (const a of allAccounts) {
            const balance = await convertAmount(a.initialBalance, a.currencyCode, baseCurrency);
            accountBalances.set(a.id, balance);
            // Track which accounts are "cash" accounts
            if (a.type !== 'INVESTMENT' && a.type !== 'ASSET') {
                cashAccountIds.add(a.id);
            }
        }

        for (const t of allTx) {
            const convertedAmount = await convertAmount(t.amount, t.currencyCode, baseCurrency);

            if (t.accountId && accountBalances.has(t.accountId)) {
                const bal = accountBalances.get(t.accountId) || 0;
                if (t.type === 'EXPENSE') accountBalances.set(t.accountId, bal - convertedAmount);
                if (t.type === 'INCOME') accountBalances.set(t.accountId, bal + convertedAmount);
                if (t.type === 'TRANSFER') accountBalances.set(t.accountId, bal - convertedAmount);
            }
            if (t.transferToAccountId && accountBalances.has(t.transferToAccountId)) {
                const bal = accountBalances.get(t.transferToAccountId) || 0;
                const targetAmount = t.targetAmount ?? t.amount;
                const convertedTarget = await convertAmount(targetAmount, t.targetCurrencyCode || t.currencyCode, baseCurrency);
                accountBalances.set(t.transferToAccountId, bal + convertedTarget);
            }
        }

        // Only sum cash accounts (exclude INVESTMENT and ASSET type accounts)
        let totalCurrentCapital = 0;
        cashAccountIds.forEach(id => {
            totalCurrentCapital += accountBalances.get(id) || 0;
        });

        // Add financial investments (exclude fixed assets)
        for (const i of allInvestments) {
            if (i.type !== 'ASSET') {
                const value = i.currentAmount ?? i.initialAmount;
                totalCurrentCapital += await convertAmount(value, i.currencyCode, baseCurrency);
            }
        }

        // Calculate Net Change from Start to Now
        let netChangeStartToNow = 0;
        const startObj = new Date(startDate);

        for (const t of allTx) {
            const tDate = new Date(t.date);
            if (tDate >= startObj) {
                const convertedAmount = await convertAmount(t.amount, t.currencyCode, baseCurrency);

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
                const convertedAmount = await convertAmount(t.amount, t.currencyCode, baseCurrency);

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
                ordinaryCost += await convertAmount(t.amount, t.currencyCode, baseCurrency);
            }

            // Asset Depreciation (already in asset's currency, convert to base)
            let depreciationCost = 0;
            for (const asset of assets) {
                const dailyDep = calculateDailyDepreciation(asset, currentDate);
                depreciationCost += await convertAmount(dailyDep, asset.currencyCode, baseCurrency);
            }

            // Project Amortization
            let projectCost = 0;
            for (const project of projects) {
                projectCost += await calculateProjectAmortization(project, currentDate, baseCurrency);
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

// Helper to calculate book value for an asset
function calculateAssetBookValue(asset: Investment): number {
    if (!asset.purchasePrice || !asset.usefulLife || !asset.startDate) {
        return asset.currentAmount ?? asset.initialAmount;
    }

    const startDate = new Date(asset.startDate);
    const now = new Date();
    const daysOwned = Math.max(0, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const cost = asset.purchasePrice;
    const salvage = asset.salvageValue || 0;
    const usefulLifeDays = asset.usefulLife * 365;

    const totalDepreciation = Math.min(
        (cost - salvage) * (daysOwned / usefulLifeDays),
        cost - salvage
    );

    return Math.max(cost - totalDepreciation, salvage);
}

/**
 * Get all dashboard summary data with currency conversion
 * All amounts are converted to the user's base currency
 */
export async function getDashboardSummary() {
    return withAuth(async (userId) => {
        // Fetch user settings
        const userSettings = await prisma.settings.findUnique({
            where: { userId }
        });
        const baseCurrency = userSettings?.currency || 'CNY';

        // Fetch all data
        const [accounts, transactions, investments, categories] = await Promise.all([
            prisma.account.findMany({ where: { userId } }),
            prisma.transaction.findMany({ where: { userId } }),
            prisma.investment.findMany({ where: { userId, status: 'ACTIVE' } }),
            prisma.category.findMany({ where: { userId } })
        ]);

        // Current month filter
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const monthStart = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
        const monthEnd = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

        // --- Calculate Account Balances with Currency Conversion ---
        // Convert everything to base currency first, then calculate
        const accountBalances = new Map<string, number>();
        for (const a of accounts) {
            const convertedInitial = await convertAmount(a.initialBalance, a.currencyCode, baseCurrency);
            accountBalances.set(a.id, convertedInitial);
        }

        for (const t of transactions) {
            const convertedAmount = await convertAmount(t.amount, t.currencyCode, baseCurrency);

            if (t.accountId && accountBalances.has(t.accountId)) {
                const bal = accountBalances.get(t.accountId) || 0;
                if (t.type === 'EXPENSE') accountBalances.set(t.accountId, bal - convertedAmount);
                if (t.type === 'INCOME') accountBalances.set(t.accountId, bal + convertedAmount);
                if (t.type === 'TRANSFER') accountBalances.set(t.accountId, bal - convertedAmount);
            }
            if (t.transferToAccountId && accountBalances.has(t.transferToAccountId)) {
                const bal = accountBalances.get(t.transferToAccountId) || 0;
                const targetAmount = t.targetAmount ?? t.amount;
                const convertedTarget = await convertAmount(targetAmount, t.targetCurrencyCode || t.currencyCode, baseCurrency);
                accountBalances.set(t.transferToAccountId, bal + convertedTarget);
            }
        }

        // --- Calculate Totals (already in base currency) ---

        // 1. Cash (non-investment, non-asset accounts)
        let totalCash = 0;
        for (const a of accounts) {
            if (a.type !== 'INVESTMENT' && a.type !== 'ASSET') {
                const balance = accountBalances.get(a.id) || 0;
                totalCash += balance; // Already converted to base currency
            }
        }

        // 2. Financial Investments (non-ASSET)
        let totalFinancialInvested = 0;
        for (const inv of investments.filter(i => i.type !== 'ASSET')) {
            const value = inv.currentAmount ?? inv.initialAmount;
            totalFinancialInvested += await convertAmount(value, inv.currencyCode, baseCurrency);
        }

        // 3. Fixed Assets
        let totalFixedAssets = 0;
        const assetDetails = [];
        for (const asset of investments.filter(i => i.type === 'ASSET')) {
            const bookValue = calculateAssetBookValue(asset);
            const convertedValue = await convertAmount(bookValue, asset.currencyCode, baseCurrency);
            totalFixedAssets += convertedValue;

            // Daily depreciation
            let dailyDep = 0;
            if (asset.purchasePrice && asset.usefulLife) {
                dailyDep = (asset.purchasePrice - (asset.salvageValue || 0)) / (asset.usefulLife * 365);
            }
            const convertedDailyDep = await convertAmount(dailyDep, asset.currencyCode, baseCurrency);

            assetDetails.push({
                id: asset.id,
                name: asset.name,
                startDate: asset.startDate,
                currentValue: convertedValue,
                dailyDep: convertedDailyDep,
                originalCurrency: asset.currencyCode
            });
        }

        // 4. This Month Expenses (excluding Investment/Depreciation categories)
        const investmentCategoryNames = ['Investment', 'Depreciation'];
        let thisMonthExpenses = 0;
        let thisMonthIncome = 0;
        let allTimeExpenses = 0;
        let allTimeIncome = 0;

        for (const t of transactions) {
            const isThisMonth = t.date >= monthStart && t.date <= monthEnd;
            const category = categories.find(c => c.id === t.categoryId);
            const isExcluded = category && investmentCategoryNames.includes(category.name);

            if (t.type === 'EXPENSE' && !isExcluded) {
                const converted = await convertAmount(t.amount, t.currencyCode, baseCurrency);
                allTimeExpenses += converted;
                if (isThisMonth) thisMonthExpenses += converted;
            }

            if (t.type === 'INCOME') {
                const converted = await convertAmount(t.amount, t.currencyCode, baseCurrency);
                allTimeIncome += converted;
                if (isThisMonth) thisMonthIncome += converted;
            }
        }

        // 5. This Month Expenses by Category (for pie chart)
        const expenseByCategory: Record<string, number> = {};
        for (const t of transactions) {
            const isThisMonth = t.date >= monthStart && t.date <= monthEnd;
            const category = categories.find(c => c.id === t.categoryId);
            const isExcluded = category && investmentCategoryNames.includes(category.name);

            if (t.type === 'EXPENSE' && isThisMonth && !isExcluded) {
                const categoryName = category?.name || 'Other';
                const converted = await convertAmount(t.amount, t.currencyCode, baseCurrency);
                expenseByCategory[categoryName] = (expenseByCategory[categoryName] || 0) + converted;
            }
        }

        const totalNetWorth = totalCash + totalFinancialInvested + totalFixedAssets;

        return {
            baseCurrency,

            // Balances
            totalCash,
            totalFinancialInvested,
            totalFixedAssets,
            totalNetWorth,

            // This Month
            thisMonthExpenses,
            thisMonthIncome,
            thisMonthNet: thisMonthIncome - thisMonthExpenses,

            // All Time
            allTimeExpenses,
            allTimeIncome,
            allTimeNet: allTimeIncome - allTimeExpenses,

            // Asset Details (for AssetSummary component)
            assetDetails: assetDetails.sort((a, b) => b.currentValue - a.currentValue).slice(0, 5),

            // Expense by Category (for ExpenseCompositionChart, already currency-converted)
            expenseByCategory
        };
    }, 'Failed to fetch dashboard summary');
}

/**
 * Get investment portfolio summary with currency conversion
 */
export async function getInvestmentSummary() {
    return withAuth(async (userId) => {
        const userSettings = await prisma.settings.findUnique({
            where: { userId }
        });
        const baseCurrency = userSettings?.currency || 'CNY';

        const investments = await prisma.investment.findMany({
            where: { userId, status: 'ACTIVE' }
        });

        let totalValue = 0;
        let totalCost = 0;

        for (const inv of investments) {
            const value = calculateAssetBookValue(inv);
            const cost = inv.purchasePrice || inv.initialAmount;

            totalValue += await convertAmount(value, inv.currencyCode, baseCurrency);
            totalCost += await convertAmount(cost, inv.currencyCode, baseCurrency);
        }

        return {
            baseCurrency,
            totalValue,
            totalCost,
            totalProfit: totalValue - totalCost
        };
    }, 'Failed to fetch investment summary');
}
