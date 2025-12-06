'use server';

import { prisma } from '@/lib/db';
import { withAuth } from './auth';
import { Investment, Transaction, Project } from '@prisma/client';
import { convertAmount } from '@/lib/server-currency';
import { toNumber } from '@/lib/decimal';

// 计算特定日期的折旧（直线法）
function calculateDailyDepreciation(asset: Investment, date: Date): number {
    if (asset.status !== 'ACTIVE' || asset.type !== 'ASSET') return 0;
    if (!asset.purchasePrice || !asset.usefulLife || !asset.startDate) return 0;

    const startDate = new Date(asset.startDate);
    if (date < startDate) return 0;

    // 简单的每日直线折旧计算
    // (成本 - 残值) / (使用年限 * 365)
    const cost = toNumber(asset.purchasePrice);
    const salvage = toNumber(asset.salvageValue);
    const usefulLifeYears = asset.usefulLife;

    if (usefulLifeYears <= 0) return 0;

    const dailyDepreciation = (cost - salvage) / (usefulLifeYears * 365);
    return dailyDepreciation;
}

// 计算特定日期的项目摊销（优化版，使用缓存汇率）
function calculateProjectAmortization(
    project: Project & { transactions: Transaction[] },
    date: Date,
    toBase: (amount: number, currency: string) => number
): number {
    // 只有同时存在开始和结束日期才能计算摊销
    if (!project.startDate || !project.endDate) return 0;

    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 如果项目已结束，不再摊销
    if (date > endDate) return 0;

    // 对于已产生交易（如定金）的未来项目：
    // 从今天开始摊销直到项目结束
    // 对于当前/过去的项目：使用正常的项目日期范围
    const effectiveStartDate = startDate > today ? today : startDate;

    // 如果在有效开始日期之前，返回 0
    if (date < effectiveStartDate) return 0;

    // 项目总成本（已转换汇率）
    let totalCost = 0;
    for (const t of project.transactions) {
        const amount = toBase(toNumber(t.amount), t.currencyCode);
        if (t.type === 'EXPENSE') {
            totalCost += amount;
        } else if (t.type === 'INCOME') {
            totalCost -= amount; // 收入抵扣总成本
        }
    }

    // 持续天数（从有效开始日期到结束日期）
    const durationMs = endDate.getTime() - effectiveStartDate.getTime();
    const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1);

    return Math.max(0, totalCost / durationDays);
}

export async function getMeIncMetrics(startDate: string, endDate: string) {
    return withAuth(async (userId) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. 获取用户设置和汇率（只获取一次）
        const userSettings = await prisma.settings.findUnique({ where: { userId } });
        const systemSettings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });

        const baseCurrency = userSettings?.currency || 'CNY';
        // 如果可用则使用系统API Key获取最新汇率，否则使用回退逻辑
        // 注意：需要从 lib/server-currency 导入 getExchangeRates
        const rates = await import('@/lib/server-currency').then(m => m.getExchangeRates(systemSettings?.exchangeRateApiKey || undefined));

        // 优化：创建同步转换辅助函数
        const toBase = (amount: number, currency: string): number => {
            if (!rates) return amount; // 回退
            if (currency === baseCurrency) return amount;
            const fromRate = rates[currency] || 1;
            const toRate = rates[baseCurrency] || 1;
            return amount * (toRate / fromRate);
        };

        // 2. 获取数据（优化查询范围）
        // 获取账户以计算当前余额
        const allAccounts = await prisma.account.findMany({ where: { userId } });

        // 仅获取日期范围内的交易
        const relevantTransactions = await prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: startDate, lte: endDate },
            }
        });

        const assets = await prisma.investment.findMany({
            where: { userId, type: 'ASSET', status: 'ACTIVE' }
        });

        // 用于摊销的项目（包含查询开始日期之后结束的项目）
        // 包含已产生交易（定金）的未来项目，将从今天开始摊销
        const projects = await prisma.project.findMany({
            where: {
                userId,
                endDate: { gte: startDate }  // 包含所有在查询开始日期及之后结束的项目
            },
            include: { transactions: true }
        });

        // 每日摊销的经常性规则
        const recurringRules = await prisma.recurringRule.findMany({
            where: { userId, isActive: true }
        });

        // 计算经常性规则的每日摊销成本
        const calculateRecurringDailyCost = (): number => {
            let totalDailyCost = 0;
            for (const rule of recurringRules) {
                const amount = toBase(toNumber(rule.amount), rule.currencyCode);
                let dailyAmount = 0;
                switch (rule.frequency) {
                    case 'DAILY':
                        dailyAmount = amount * (rule.interval || 1);
                        break;
                    case 'WEEKLY':
                        dailyAmount = amount / (7 * (rule.interval || 1));
                        break;
                    case 'MONTHLY':
                        dailyAmount = amount / (30 * (rule.interval || 1));
                        break;
                    case 'YEARLY':
                        dailyAmount = amount / (365 * (rule.interval || 1));
                        break;
                }
                totalDailyCost += dailyAmount;
            }
            return totalDailyCost;
        };

        const dailyRecurringCost = calculateRecurringDailyCost();

        // 3. 计算“当前资本”（今天）
        // 汇总所有账户（包含固定资产）
        let totalCurrentCapital = 0;
        // 纯现金：用于跑道计算（排除投资和资产账户）
        let totalCashOnly = 0;
        for (const a of allAccounts) {
            const balance = toBase(toNumber(a.currentBalance), a.currencyCode);
            totalCurrentCapital += balance;
            // 跑道计算仅包含现金账户（排除 INVESTMENT 或 ASSET 类型）
            if (a.type !== 'INVESTMENT' && a.type !== 'ASSET') {
                totalCashOnly += balance;
            }
        }

        // 注意：账户余额已包含转账金额，无需重复计算。

        // 4. 反向推算开始日期的资本
        // 逻辑：开始日资本 = 当前资本 - 净变动（开始日期 -> 现在）
        // 需要反向抵消从开始日期到现在发生的所有交易。

        // 筛选用于净值变动分析的交易
        // 仅关注影响流动资金或金融投资的交易

        let netChangeStartToNow = 0;
        // 追踪纯现金的净变动（用于 cashLevel 曲线）
        let netCashChangeStartToNow = 0;

        // 遍历从开始日期到现在的交易以计算净变动
        for (const t of relevantTransactions) {
            // 如果交易日期晚于“现在”（理论上不应发生），跳过

            const amount = toBase(toNumber(t.amount), t.currencyCode);
            let change = 0;
            let cashChange = 0;

            if (t.type === 'INCOME') {
                change = amount;
                cashChange = amount;
            }
            if (t.type === 'EXPENSE') {
                change = -amount;
                cashChange = -amount;
            }
            if (t.type === 'TRANSFER') {
                // 转出减少现金。
                // 如果转入 ASSET（资产），在此视图下视为支出（因为减少了流动性/金融资本）
                // t.investmentId 存在于交易记录中。

                // 如果有关联投资，检查是否为 ASSET
                if (t.investmentId) {
                    const isAsset = assets.some(a => a.id === t.investmentId);
                    // 检查交易关联的投资是否为 ASSET 类型
                    // 假设我们可以通过 activeInvestments 列表检查（忽略已关闭的资产可能导致的误差）
                    if (isAsset) {
                        change = -amount;
                    }
                    // 所有转入投资的金额都减少现金余额
                    cashChange = -amount;
                }
            }

            netChangeStartToNow += change;
            netCashChangeStartToNow += cashChange;
        }

        const capitalAtStart = totalCurrentCapital - netChangeStartToNow;
        const cashAtStart = totalCashOnly - netCashChangeStartToNow;

        // 5. 生成每日数据（从开始日期正向推演）
        const dailyData = [];
        let currentCapital = capitalAtStart;
        let currentCash = cashAtStart;
        const currentDate = new Date(start);

        // 按日期预分组交易，以便在循环中快速查找
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

            // 获取当日交易
            const dailyTx = txByDate.get(dateStr) || [];

            let dailyIncome = 0;
            let dailyExpense = 0;

            let dailyCashInflow = 0;
            let dailyCashOutflow = 0;
            for (const t of dailyTx) {
                const amount = toBase(toNumber(t.amount), t.currencyCode);

                if (t.type === 'INCOME') {
                    dailyIncome += amount;
                    dailyCashInflow += amount;
                }
                if (t.type === 'EXPENSE') {
                    dailyExpense += amount;
                    dailyCashOutflow += amount;
                }
                if (t.type === 'TRANSFER') {
                    // 逻辑同上：如果是转入 ASSET，在此视图下视为支出（现金流出）
                    if (t.investmentId) {
                        // 所有转入投资的金额都减少现金
                        dailyCashOutflow += amount;
                        if (assets.some(a => a.id === t.investmentId)) {
                            dailyExpense += amount;
                        }
                    }
                }
            }

            // 更新资产水平 (收入 - 支出)
            currentCapital += (dailyIncome - dailyExpense);
            // 更新现金水平 (仅追踪实际现金，不含投资)
            currentCash += (dailyCashInflow - dailyCashOutflow);

            // 普通支出 (排除关联项目、关联投资和经常性来源的支出)
            // 用于 LifestyleChart 的“燃烧率”计算
            // 注意：排除 source === 'RECURRING' 以避免与 recurringCost 重复计算
            let ordinaryCost = 0;
            // 现金燃烧：所有实际支出的现金（排除项目关联）
            // 包含经常性交易，代表实际现金流出
            let cashBurn = 0;
            for (const t of dailyTx) {
                if (t.type === 'EXPENSE' && !t.projectId && !t.investmentId) {
                    cashBurn += toBase(toNumber(t.amount), t.currencyCode);
                    if (t.source !== 'RECURRING') {
                        ordinaryCost += toBase(toNumber(t.amount), t.currencyCode);
                    }
                }
            }

            // 资产折旧
            let depreciationCost = 0;
            for (const asset of assets) {
                const dailyDep = calculateDailyDepreciation(asset, currentDate);
                depreciationCost += toBase(dailyDep, asset.currencyCode);
            }

            // 项目摊销
            let projectCost = 0;
            for (const project of projects) {
                projectCost += calculateProjectAmortization(project, currentDate, toBase);
            }

            // 经常性成本（每日固定）
            const recurringCost = dailyRecurringCost;

            dailyData.push({
                date: dateStr,
                capitalLevel: currentCapital,
                cashLevel: currentCash,  // 仅现金（用于跑道图表）
                income: dailyIncome,
                expense: dailyExpense,
                ordinaryCost,
                depreciationCost,
                projectCost,
                recurringCost,
                cashBurn, // 用于计算跑道：实际现金支出（排除项目关联）
                totalBurn: ordinaryCost + depreciationCost + projectCost + recurringCost,
                netProfit: dailyIncome - (ordinaryCost + depreciationCost + projectCost + recurringCost)
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // 计算资产详情用于 AssetSummary（避免重复获取）
        let totalFixedAssets = 0;
        const assetDetails = [];
        for (const asset of assets) {
            const bookValue = calculateAssetBookValue(asset);
            const convertedValue = toBase(bookValue, asset.currencyCode);
            totalFixedAssets += convertedValue;

            // 每日折旧
            let dailyDep = 0;
            if (toNumber(asset.purchasePrice) && asset.usefulLife) {
                dailyDep = (toNumber(asset.purchasePrice) - toNumber(asset.salvageValue)) / (asset.usefulLife * 365);
            }
            const convertedDailyDep = toBase(dailyDep, asset.currencyCode);

            assetDetails.push({
                id: asset.id,
                name: asset.name,
                startDate: asset.startDate,
                currentValue: convertedValue,
                dailyDep: convertedDailyDep,
                originalCurrency: asset.currencyCode
            });
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
                recurringCost: d.recurringCost,
                totalDailyCost: d.totalBurn
            })),
            // AssetSummary 组件所需的资产数据
            assetDetails: assetDetails.sort((a, b) => b.currentValue - a.currentValue),
            totalFixedAssets,
            // 预计算跑道指标（避免前端重复计算）
            avgDailyCashBurn: dailyData.reduce((sum, d) => sum + d.cashBurn, 0) / (dailyData.length || 1),
            // 仅现金资本（排除投资和固定资产）
            cashOnly: totalCashOnly,
            runwayMonths: (() => {
                const totalCashBurn = dailyData.reduce((sum, d) => sum + d.cashBurn, 0);
                const avgDaily = totalCashBurn / (dailyData.length || 1);
                // 仅使用现金计算跑道：投资和资产不能直接用于支付日常开销
                const runwayDays = avgDaily > 0 ? totalCashOnly / avgDaily : 0;
                return runwayDays / 30;
            })()
        };

    }, 'Failed to fetch Me Inc. metrics');
}

// 计算资产账面价值的辅助函数
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
 * 获取仪表盘汇总数据（带汇率转换）
 * 所有金额均转换为用户的本位币
 */
export async function getDashboardSummary() {
    return withAuth(async (userId) => {
        // 获取用户设置
        const userSettings = await prisma.settings.findUnique({
            where: { userId }
        });
        const baseCurrency = userSettings?.currency || 'CNY';

        // 获取所有数据
        const [accounts, transactions, investments, categories] = await Promise.all([
            prisma.account.findMany({ where: { userId } }),
            prisma.transaction.findMany({ where: { userId } }),
            prisma.investment.findMany({ where: { userId, status: 'ACTIVE' } }),
            prisma.category.findMany({ where: { userId } })
        ]);

        // 当前月份筛选
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const monthStart = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
        const monthEnd = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

        // --- 计算总计 ---

        // 1. 现金（非投资、非资产账户）
        // 优化：直接使用 account.currentBalance 而不是从交易记录重新计算
        let totalCash = 0;
        for (const a of accounts) {
            if (a.type !== 'INVESTMENT' && a.type !== 'ASSET') {
                const balance = await convertAmount(toNumber(a.currentBalance), a.currencyCode, baseCurrency);
                totalCash += balance;
            }
        }

        // 2. 金融投资（非 ASSET）
        let totalFinancialInvested = 0;
        for (const inv of investments.filter(i => i.type !== 'ASSET')) {
            const value = toNumber(inv.currentAmount) || toNumber(inv.initialAmount);
            totalFinancialInvested += await convertAmount(value, inv.currencyCode, baseCurrency);
        }

        // 3. 固定资产
        let totalFixedAssets = 0;
        const assetDetails = [];
        for (const asset of investments.filter(i => i.type === 'ASSET')) {
            const bookValue = calculateAssetBookValue(asset);
            const convertedValue = await convertAmount(bookValue, asset.currencyCode, baseCurrency);
            totalFixedAssets += convertedValue;

            // 每日折旧
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

        // 4. 本月支出（排除投资/折旧类别）
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

        // 5. 本月支出按类别（用于饼图）
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

            // 余额
            totalCash,
            totalFinancialInvested,
            totalFixedAssets,
            totalNetWorth,

            // 本月
            thisMonthExpenses,
            thisMonthIncome,
            thisMonthNet: thisMonthIncome - thisMonthExpenses,

            // 历史总计
            allTimeExpenses,
            allTimeIncome,
            allTimeNet: allTimeIncome - allTimeExpenses,

            // 资产详情（用于 AssetSummary 组件）
            assetDetails: assetDetails.sort((a, b) => b.currentValue - a.currentValue).slice(0, 5),

            // 按类别支出（用于 ExpenseCompositionChart，已转换汇率）
            expenseByCategory
        };
    }, 'Failed to fetch dashboard summary');
}

/**
 * 获取投资组合汇总（带汇率转换）
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
