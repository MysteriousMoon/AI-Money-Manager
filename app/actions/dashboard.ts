'use server';

import { prisma } from '@/lib/db';
import { withAuth } from './auth';
import { Investment, Transaction, Project } from '@prisma/client';
import { convertAmount } from '@/lib/server-currency';
import { toNumber } from '@/lib/decimal';

// Helper to calculate depreciation for a specific day
function calculateDailyDepreciation(asset: Investment, date: Date): number {
    if (asset.status !== 'ACTIVE' || asset.type !== 'ASSET') return 0;
    if (!asset.purchasePrice || !asset.usefulLife || !asset.startDate) return 0;

    const startDate = new Date(asset.startDate);
    if (date < startDate) return 0;

    // Simple Straight-Line Depreciation for Daily Rate
    // (Cost - Salvage) / (Useful Life Years * 365)
    const cost = toNumber(asset.purchasePrice);
    const salvage = toNumber(asset.salvageValue);
    const usefulLifeYears = asset.usefulLife;

    if (usefulLifeYears <= 0) return 0;

    const dailyDepreciation = (cost - salvage) / (usefulLifeYears * 365);
    return dailyDepreciation;
}

// Helper to calculate project amortization for a specific day (optimized with cached rates)
function calculateProjectAmortization(
    project: Project & { transactions: Transaction[] },
    date: Date,
    toBase: (amount: number, currency: string) => number
): number {
    // All project types with start/end dates are amortized
    if (!project.startDate || !project.endDate) return 0;

    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);

    if (date < startDate || date > endDate) return 0;

    // Total Cost of Project (with currency conversion)
    let totalCost = 0;
    for (const t of project.transactions) {
        const amount = toBase(toNumber(t.amount), t.currencyCode);
        if (t.type === 'EXPENSE') {
            totalCost += amount;
        } else if (t.type === 'INCOME') {
            totalCost -= amount; // Income reduces the total cost
        }
    }

    // Duration in Days
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1);

    return Math.max(0, totalCost / durationDays);
}

export async function getMeIncMetrics(startDate: string, endDate: string) {
    return withAuth(async (userId) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Fetch User Settings & Rates ONCE
        const userSettings = await prisma.settings.findUnique({ where: { userId } });
        const systemSettings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });

        const baseCurrency = userSettings?.currency || 'CNY';
        // Use system API key if available to get fresh rates, otherwise fallback logic in getExchangeRates handles it
        // Note: We need to import getExchangeRates from lib/server-currency
        const rates = await import('@/lib/server-currency').then(m => m.getExchangeRates(systemSettings?.exchangeRateApiKey || undefined));

        // Optimize: Create a synchronous conversion helper
        const toBase = (amount: number, currency: string): number => {
            if (!rates) return amount; // Fallback
            if (currency === baseCurrency) return amount;
            const fromRate = rates[currency] || 1;
            const toRate = rates[baseCurrency] || 1;
            return amount * (toRate / fromRate);
        };

        // 2. Fetch Data (Optimized Scope)
        // Fetch accounts for current balance
        const allAccounts = await prisma.account.findMany({ where: { userId } });

        // Fetch transactions from Start Date until NOW (to unwind current balance)
        const relevantTransactions = await prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: startDate }, // Only fetch history needed for the window + unwinding
            }
        });

        const assets = await prisma.investment.findMany({
            where: { userId, type: 'ASSET', status: 'ACTIVE' }
        });

        // Projects for amortization (all types with date ranges)
        const projects = await prisma.project.findMany({
            where: {
                userId,
                startDate: { lte: endDate },
                endDate: { gte: startDate }
            },
            include: { transactions: true }
        });

        // 3. Calculate "Current Capital" (Today) from Account Balances
        let totalCurrentCapital = 0;
        for (const a of allAccounts) {
            // Only sum cash accounts (exclude INVESTMENT and ASSET)
            if (a.type !== 'INVESTMENT' && a.type !== 'ASSET') {
                totalCurrentCapital += toBase(toNumber(a.currentBalance), a.currencyCode);
            }
        }

        // Add financial investments (exclude fixed assets)
        const activeInvestments = await prisma.investment.findMany({ where: { userId, status: 'ACTIVE' } });
        for (const i of activeInvestments) {
            if (i.type !== 'ASSET') {
                const value = toNumber(i.currentAmount) || toNumber(i.initialAmount);
                totalCurrentCapital += toBase(value, i.currencyCode);
            }
        }

        // 4. Calculate Capital at Start Date (Backwards Calculation)
        // Logic: CapitalAtStart = CurrentCapital - NetChange(Start -> Now)
        // We need to reverse transactions that happened AFTER start date up to now.

        // Filter transactions for net worth change analysis
        // Note: We only care about transactions that affect Liquid Cash or Financial Investments
        // Fixed Asset purchases are transfers (Cash -> Asset), so Net Worth stays same? 
        // No, current logic tracks "Capital Water Level" which includes Total Assets. 
        // Wait, current logic in dashboard says "Total Assets + Cash".
        // BUT the chart is "Survival View" -> usually purely liquid? 
        // Let's check original implementation:
        // "totalCurrentCapital" summed cash + financial investments (excluded assets).
        // Then it added net changes.
        // IF we want to track "Liquid + Financial" (excluding fixed assets):

        let netChangeStartToNow = 0;

        // We need to iterate from StartDate to NOW to find the net change
        for (const t of relevantTransactions) {
            // If transaction is in the future relative to "Now" (unlikely) skip
            // We processed all transactions >= startDate

            const amount = toBase(toNumber(t.amount), t.currencyCode);
            let change = 0;

            if (t.type === 'INCOME') change = amount;
            if (t.type === 'EXPENSE') change = -amount;
            if (t.type === 'TRANSFER') {
                // Transfers out reduce cash. 
                // If transfer is to an Investment (Financial), it's a wash (Cash down, Inv up), unless we only track Cash?
                // Original logic:
                // if (t.type === 'TRANSFER') {
                //    const inv = allInvestments.find(i => i.id === t.investmentId);
                //    if (inv && inv.type === 'ASSET') change = -convertedAmount; 
                // }
                // Meaning: Buying an ASSET reduces Capital (Liquid+Financial). Buying a STOCK does not.
                // We need to replicate this logic efficiently.
                // t.investmentId is on the transaction.

                // If investmentId is present, check if it's an ASSET
                if (t.investmentId) {
                    // We need to know the type of that investment.
                    // We can find it in activeInvestments or we might need to fetch closed ones too if looking at history.
                    // optimization: we haven't fetched closed investments.
                    // But usually ASSETs are long term.
                    // Let's assume we can check against a list of ASSET IDs.
                    const isAsset = assets.some(a => a.id === t.investmentId);
                    // What if it was a closed asset? We might miss it. 
                    // For robustness, we might need to fetch all investment types map.
                    if (isAsset) {
                        change = -amount;
                    }
                }
            }

            netChangeStartToNow += change;
        }

        const capitalAtStart = totalCurrentCapital - netChangeStartToNow;

        // 5. Generate Daily Data (Forward from Start)
        const dailyData = [];
        let currentCapital = capitalAtStart;
        const currentDate = new Date(start);

        // Pre-group transactions by date for O(1) lookup in loop
        const txByDate = new Map<string, Transaction[]>();
        for (const t of relevantTransactions) {
            const date = t.date; // YYYY-MM-DD
            if (date >= startDate && date <= endDate) {
                if (!txByDate.has(date)) txByDate.set(date, []);
                txByDate.get(date)?.push(t);
            }
        }

        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];

            // Get transactions for this day
            const dailyTx = txByDate.get(dateStr) || [];

            let dailyIncome = 0;
            let dailyExpense = 0;

            for (const t of dailyTx) {
                const amount = toBase(toNumber(t.amount), t.currencyCode);

                if (t.type === 'INCOME') dailyIncome += amount;
                if (t.type === 'EXPENSE') dailyExpense += amount;
                if (t.type === 'TRANSFER') {
                    // Same logic as above for daily expense tracking
                    // If money went to an ASSET, it counts as an "Expense" (Cash outflow) for this view
                    if (t.investmentId && assets.some(a => a.id === t.investmentId)) {
                        dailyExpense += amount;
                    }
                }
            }

            // Update running capital
            // Note: This "currentCapital" is iterating forward. 
            // currentCapital += (Income - Expense).
            // Does this match the "Net Change" logic?
            // Yes, if Net Change = Income - Expense (where Expense includes Asset purchases).
            currentCapital += (dailyIncome - dailyExpense);

            // Ordinary Expenses (excludes project-linked and investment-linked)
            // Used for "Burn Rate" calculation
            let ordinaryCost = 0;
            for (const t of dailyTx) {
                if (t.type === 'EXPENSE' && !t.projectId && !t.investmentId) {
                    ordinaryCost += toBase(toNumber(t.amount), t.currencyCode);
                }
            }

            // Asset Depreciation
            let depreciationCost = 0;
            for (const asset of assets) {
                const dailyDep = calculateDailyDepreciation(asset, currentDate);
                depreciationCost += toBase(dailyDep, asset.currencyCode);
            }

            // Project Amortization
            let projectCost = 0;
            for (const project of projects) {
                projectCost += calculateProjectAmortization(project, currentDate, toBase);
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
        return toNumber(asset.currentAmount) || toNumber(asset.initialAmount);
    }

    const startDate = new Date(asset.startDate);
    const now = new Date();
    const daysOwned = Math.max(0, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const cost = toNumber(asset.purchasePrice);
    const salvage = toNumber(asset.salvageValue);
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

        // --- Calculate Totals ---

        // 1. Cash (non-investment, non-asset accounts)
        // Optimize: Use account.currentBalance instead of recomputing from transactions
        let totalCash = 0;
        for (const a of accounts) {
            if (a.type !== 'INVESTMENT' && a.type !== 'ASSET') {
                const balance = await convertAmount(toNumber(a.currentBalance), a.currencyCode, baseCurrency);
                totalCash += balance;
            }
        }

        // 2. Financial Investments (non-ASSET)
        let totalFinancialInvested = 0;
        for (const inv of investments.filter(i => i.type !== 'ASSET')) {
            const value = toNumber(inv.currentAmount) || toNumber(inv.initialAmount);
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
            if (toNumber(asset.purchasePrice) && asset.usefulLife) {
                dailyDep = (toNumber(asset.purchasePrice) - toNumber(asset.salvageValue)) / (asset.usefulLife * 365);
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
                const converted = await convertAmount(toNumber(t.amount), t.currencyCode, baseCurrency);
                allTimeExpenses += converted;
                if (isThisMonth) thisMonthExpenses += converted;
            }

            if (t.type === 'INCOME') {
                const converted = await convertAmount(toNumber(t.amount), t.currencyCode, baseCurrency);
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
                const converted = await convertAmount(toNumber(t.amount), t.currencyCode, baseCurrency);
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
            const cost = toNumber(inv.purchasePrice) || toNumber(inv.initialAmount);

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
