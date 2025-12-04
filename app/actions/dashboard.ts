'use server';

import { prisma } from '@/lib/db';
import { withAuth } from './auth';
import { Investment, Transaction, Project } from '@prisma/client';

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

// Helper to calculate project amortization for a specific day
function calculateProjectAmortization(project: Project & { transactions: Transaction[] }, date: Date): number {
    if (project.type !== 'TRIP' && project.type !== 'EVENT') return 0; // Only amortize Trips/Events? Prompt says "Project/Trip Amortization"
    if (!project.startDate || !project.endDate) return 0;

    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);

    if (date < startDate || date > endDate) return 0;

    // Total Cost of Project
    const totalCost = project.transactions.reduce((sum, t) => sum + t.amount, 0);

    // Duration in Days
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1); // Inclusive

    return totalCost / durationDays;
}

export async function getMeIncMetrics(startDate: string, endDate: string) {
    return withAuth(async (userId) => {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // 1. Fetch All Transactions (Income & Expense & Transfer) for the period
        // We need a wider range for "Capital Water Level" if we want history, 
        // but for now let's stick to the requested range and maybe we can work backwards from NOW if the range ends at NOW.
        // Actually, to show a proper chart, we usually want the last 30-90 days.
        // The frontend will likely request a specific range.

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

        // 2. Calculate Current Capital Level (Snapshot at "Now")
        // We need this to work backwards for the Water Level series.
        const allAccounts = await prisma.account.findMany({ where: { userId } });
        const allInvestments = await prisma.investment.findMany({ where: { userId, status: 'ACTIVE' } });
        const allTx = await prisma.transaction.findMany({ where: { userId } }); // Need ALL history for accurate current balance if not stored

        // Calculate Current Balances
        // Note: In a real app, we should store current balance in DB to avoid re-calculating from scratch.
        // But here we rely on the derived state.
        // Actually, Account model has `currentBalance`? No, it has `initialBalance`.
        // We must calculate.

        const accountBalances = new Map<string, number>();
        allAccounts.forEach(a => accountBalances.set(a.id, a.initialBalance));

        allTx.forEach(t => {
            if (t.accountId && accountBalances.has(t.accountId)) {
                const bal = accountBalances.get(t.accountId) || 0;
                if (t.type === 'EXPENSE') accountBalances.set(t.accountId, bal - t.amount);
                if (t.type === 'INCOME') accountBalances.set(t.accountId, bal + t.amount);
                if (t.type === 'TRANSFER') accountBalances.set(t.accountId, bal - t.amount);
            }
            if (t.transferToAccountId && accountBalances.has(t.transferToAccountId)) {
                const bal = accountBalances.get(t.transferToAccountId) || 0;
                const amountToAdd = t.targetAmount ?? t.amount;
                accountBalances.set(t.transferToAccountId, bal + amountToAdd);
            }
        });

        let totalCurrentCapital = 0;
        // Sum Cash
        accountBalances.forEach(bal => totalCurrentCapital += bal);
        // Sum Investments (Financial Only for "Liquid" Water Level? Or All Net Worth?)
        // User said "Survival Water Level", usually means Liquid Assets.
        // But "Capital Water Level" might imply Net Worth.
        // Let's include Financial Investments, exclude Fixed Assets (since they are depreciating costs).
        // Actually, Fixed Assets are "Sunk Cost" usually, unless sold.
        // We will include Financial Investments.
        allInvestments.forEach(i => {
            if (i.type !== 'ASSET') {
                totalCurrentCapital += (i.currentAmount ?? i.initialAmount);
            }
        });

        // 3. Build Daily Series (Working Backwards from Today/End to Start)
        // If endDate is today, we start from totalCurrentCapital and reverse the transactions.
        // If endDate is in the past, we first need to reverse from Today to EndDate.

        // For simplicity, let's assume we want the series for the requested range.
        // We need the Capital Level at the END of the requested range.
        // Capital(End) = Capital(Now) - NetChange(End to Now).

        const today = new Date();
        const queryEnd = new Date(endDate);

        // Calculate Net Change from QueryEnd to Now (exclusive of QueryEnd, inclusive of Now)
        // Actually, simpler: Calculate Capital at Start of Time, then roll forward.
        // Capital(Start) = Capital(Now) - NetChange(Start to Now).

        let netChangeStartToNow = 0;
        const startObj = new Date(startDate);

        allTx.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate >= startObj) {
                // This transaction happened after Start.
                // Effect on Capital:
                // Income: +
                // Expense: -
                // Transfer: 0 (internal) - unless it's to/from outside? Assumed internal for now.
                // Investment: 
                //   - Deposit (Transfer Out of Account -> Investment): Capital stays same (Asset swap).
                //   - Withdrawal: Capital stays same.
                //   - Market Value Change: This is tricky. We don't have daily market records.
                //   We will ignore market fluctuations for the daily series and only count Cash Flow.

                // We are tracking "Liquid Capital" (Cash + Financial Assets).
                // Buying a Coffee (Expense) -> Capital decreases.
                // Salary (Income) -> Capital increases.
                // Transfer Account->Account -> Capital same.
                // Transfer Account->Investment -> Capital same (both are Capital).
                // Buying Fixed Asset (Transfer Account->Asset) -> Capital DECREASES (Cash -> Illiquid Asset).

                let change = 0;
                if (t.type === 'INCOME') change = t.amount;
                if (t.type === 'EXPENSE') change = -t.amount;
                // Transfers to ASSET (Fixed Asset Purchase) are effectively Expenses for Liquid Capital
                if (t.type === 'TRANSFER') {
                    const inv = allInvestments.find(i => i.id === t.investmentId);
                    if (inv && inv.type === 'ASSET') {
                        change = -t.amount;
                    }
                }

                netChangeStartToNow += change;
            }
        });

        const capitalAtStart = totalCurrentCapital - netChangeStartToNow;

        // 4. Generate Daily Data
        const dailyData = [];
        let currentCapital = capitalAtStart;
        const currentDate = new Date(start);

        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];

            // A. Cash Flow (Real Money)
            const dailyTx = transactions.filter(t => t.date === dateStr);
            let dailyIncome = 0;
            let dailyExpense = 0; // Real Cash Outflow
            let dailyNetChange = 0;

            dailyTx.forEach(t => {
                if (t.type === 'INCOME') dailyIncome += t.amount;
                if (t.type === 'EXPENSE') dailyExpense += t.amount;
                if (t.type === 'TRANSFER') {
                    // Check if it's an Asset Purchase
                    const inv = allInvestments.find(i => i.id === t.investmentId);
                    if (inv && inv.type === 'ASSET') {
                        dailyExpense += t.amount; // Treat as expense for Liquid Capital
                    }
                }
            });

            dailyNetChange = dailyIncome - dailyExpense;
            currentCapital += dailyNetChange;

            // B. Accrual / Burn Rate (Amortized)
            // 1. Ordinary Expenses (Non-Asset, Non-Project-Amortized)
            // We need to exclude expenses that are part of a Project (if amortized) 
            // OR exclude Asset purchases (already excluded from 'EXPENSE' type usually, but check).
            // The 'transactions' array above includes all types.

            // Filter for "Ordinary" expenses:
            // - Type EXPENSE
            // - Not linked to a Project (projectId is null)
            // - Not a manual depreciation entry
            const ordinaryTx = dailyTx.filter(t =>
                t.type === 'EXPENSE' &&
                !t.projectId &&
                !t.investmentId // Not an asset purchase (though usually TRANSFER)
            );
            const ordinaryCost = ordinaryTx.reduce((sum, t) => sum + t.amount, 0);

            // 2. Asset Depreciation
            let depreciationCost = 0;
            assets.forEach(asset => {
                depreciationCost += calculateDailyDepreciation(asset, currentDate);
            });

            // 3. Project Amortization
            let projectCost = 0;
            projects.forEach(project => {
                projectCost += calculateProjectAmortization(project, currentDate);
            });

            dailyData.push({
                date: dateStr,
                capitalLevel: currentCapital,
                income: dailyIncome,
                expense: dailyExpense, // Real Cash Outflow
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
            // Keep legacy format for now if needed, or just use dailySeries
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
