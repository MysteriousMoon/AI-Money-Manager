'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, TooltipProps, ComposedChart, Line, CartesianGrid, Legend } from 'recharts';
import { formatCurrency, getExchangeRate } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import { Loader2, Filter, Info, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';

const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d',
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5',
    '#9B59B6', '#34495E', '#16A085', '#27AE60', '#2980B9', '#8E44AD',
    '#2C3E50', '#F1C40F', '#E67E22', '#E74C3C', '#95A5A6', '#D35400'
];

interface CategoryData {
    id: string;
    name: string;
    value: number;
    originalCurrencies: Record<string, number>;
    percentage: number;
    color: string;
    [key: string]: any;
}

interface MonthlyData {
    month: string; // YYYY-MM
    income: number;
    expense: number;
    net: number;
}

const CustomTooltip = ({ active, payload, settings }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload as CategoryData;
        return (
            <div className="bg-card border rounded-lg p-3 shadow-lg text-sm">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
                    <p className="font-semibold">{data.name}</p>
                </div>
                <p className="text-primary font-bold text-lg">
                    {formatCurrency(data.value, settings.currency)}
                </p>
                <p className="text-muted-foreground text-xs mb-2">
                    {data.percentage.toFixed(1)}%
                </p>
                <div className="border-t pt-2 mt-1 space-y-1">
                    {Object.entries(data.originalCurrencies).map(([code, amount]) => (
                        <div key={code} className="flex justify-between gap-4 text-xs text-muted-foreground">
                            <span>{code}</span>
                            <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function ReportsPage() {
    const { transactions, categories, investments, recurringRules, settings, isLoading: isStoreLoading } = useStore();
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'OPERATING' | 'CASH_FLOW'>('OPERATING');
    const [timeRange, setTimeRange] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
    const [visibleSeries, setVisibleSeries] = useState({ income: true, expense: true });
    const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
    const [trendData, setTrendData] = useState<{ date: string; amount: number }[]>([]);
    const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);

    // Trigger HMR
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

    // Filter to only show Expense categories, excluding Investment
    const expenseCategories = categories.filter(c => c.type === 'EXPENSE' && c.name !== 'Investment');

    // Helper to get stable color for a category
    const getCategoryColor = (categoryId: string) => {
        if (categoryId === 'capex') return '#FF6B6B'; // Special color for CapEx
        const index = categories.findIndex(c => c.id === categoryId);
        return index >= 0 ? COLORS[index % COLORS.length] : '#999';
    };

    // Initialize selected categories when categories are loaded
    useEffect(() => {
        if (expenseCategories.length > 0 && selectedCategoryIds.length === 0) {
            setSelectedCategoryIds(expenseCategories.map(c => c.id));
        }
    }, [categories]); // Keep dependency on categories to trigger re-calc if they load

    useEffect(() => {
        const calculateData = async () => {
            setIsLoading(true);

            // ... (existing initialization code) ...
            const today = new Date();
            let startDate = new Date();
            // Reset time to midnight to ensure we include all transactions from the start date
            startDate.setHours(0, 0, 0, 0);

            if (timeRange === 'WEEKLY') {
                // Last 12 weeks
                startDate.setDate(today.getDate() - (11 * 7));
            } else if (timeRange === 'MONTHLY') {
                // Last 12 months
                startDate = new Date(today.getFullYear(), today.getMonth() - 11, 1);
            } else if (timeRange === 'YEARLY') {
                // Last 5 years
                startDate = new Date(today.getFullYear() - 4, 0, 1);
            } else {
                // DAILY: Last 30 days
                startDate.setDate(today.getDate() - 29);
            }

            // Initialize dashboardStats with 0 for all periods in range
            const dashboardStats: Record<string, { income: number; expense: number }> = {};
            const tempDate = new Date(startDate);
            const endDate = new Date(today);
            endDate.setHours(23, 59, 59, 999);

            while (tempDate <= endDate) {
                let key = '';
                if (timeRange === 'DAILY') {
                    key = formatLocalDate(tempDate);
                } else if (timeRange === 'WEEKLY') {
                    const year = tempDate.getFullYear();
                    const week = Math.ceil((((tempDate.getTime() - new Date(year, 0, 1).getTime()) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);
                    key = `${year}-W${week.toString().padStart(2, '0')}`;
                } else if (timeRange === 'MONTHLY') {
                    key = `${tempDate.getFullYear()}-${(tempDate.getMonth() + 1).toString().padStart(2, '0')}`;
                } else {
                    key = `${tempDate.getFullYear()}`;
                }

                if (!dashboardStats[key]) {
                    dashboardStats[key] = { income: 0, expense: 0 };
                }

                // Increment date
                if (timeRange === 'DAILY') tempDate.setDate(tempDate.getDate() + 1);
                else if (timeRange === 'WEEKLY') tempDate.setDate(tempDate.getDate() + 7);
                else if (timeRange === 'MONTHLY') tempDate.setMonth(tempDate.getMonth() + 1);
                else tempDate.setFullYear(tempDate.getFullYear() + 1);
            }

            const categoryData: Record<string, { id: string; name: string; value: number; income: number; expense: number; color: string }> = {};

            // Process Transactions
            for (const tx of transactions) {
                const txDate = parseLocalDate(tx.date);
                if (txDate < startDate || txDate > endDate) continue;

                let key = '';
                if (timeRange === 'DAILY') {
                    key = tx.date;
                } else if (timeRange === 'WEEKLY') {
                    const year = txDate.getFullYear();
                    const week = Math.ceil((((txDate.getTime() - new Date(year, 0, 1).getTime()) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);
                    key = `${year}-W${week.toString().padStart(2, '0')}`;
                } else if (timeRange === 'MONTHLY') {
                    key = tx.date.slice(0, 7);
                } else {
                    key = tx.date.slice(0, 4);
                }

                if (!dashboardStats[key]) continue;

                const convertedAmount = await getExchangeRate(tx.currencyCode, settings.currency, settings) * tx.amount;
                const investment = tx.investmentId ? investments.find(i => i.id === tx.investmentId) : null;
                const isAsset = investment?.type === 'ASSET';

                // Filter based on View Mode
                let isIncome = false;
                let isExpense = false;

                // Check if it's a manual depreciation transaction
                const categoryName = categories.find(c => c.id === tx.categoryId)?.name;
                const isManualDepreciation = categoryName === 'Depreciation' || tx.note?.startsWith('Depreciation:');

                // Check if it's a recurring transaction
                const isRecurring = tx.source === 'RECURRING';

                if (viewMode === 'OPERATING') {
                    // Operating: Include EXPENSE, Exclude TRANSFER (Asset Purchase)
                    // Exclude manual depreciation if we are auto-calculating
                    // Exclude recurring transactions if we are auto-amortizing
                    if (tx.type === 'EXPENSE' && !isManualDepreciation && !isRecurring) isExpense = true;
                    if (tx.type === 'INCOME') isIncome = true;
                } else {
                    // Cash Flow: Include EXPENSE (exc. Depreciation), Include TRANSFER (Asset Purchase)
                    // Include recurring transactions (cash flow)
                    if (tx.type === 'EXPENSE') {
                        // Exclude depreciation (manual or otherwise)
                        if (!isManualDepreciation && !(isAsset && tx.investmentId)) isExpense = true;
                    } else if (tx.type === 'TRANSFER') {
                        // Include asset purchase
                        if (isAsset && tx.investmentId) isExpense = true;
                    }
                    if (tx.type === 'INCOME') isIncome = true;
                }

                if (isIncome) {
                    dashboardStats[key].income += convertedAmount;
                    const catId = tx.categoryId || 'uncategorized';
                    if (!categoryData[catId]) {
                        const cat = categories.find(c => c.id === catId);
                        categoryData[catId] = { id: catId, name: cat?.name || 'Uncategorized', value: 0, income: 0, expense: 0, color: getCategoryColor(catId) };
                    }
                    categoryData[catId].income += convertedAmount;
                }
                if (isExpense) {
                    dashboardStats[key].expense += convertedAmount;
                    const catId = tx.categoryId || 'uncategorized';
                    if (!categoryData[catId]) {
                        const cat = categories.find(c => c.id === catId);
                        categoryData[catId] = { id: catId, name: cat?.name || 'Uncategorized', value: 0, income: 0, expense: 0, color: getCategoryColor(catId) };
                    }
                    categoryData[catId].expense += convertedAmount;
                    categoryData[catId].value += convertedAmount;
                }
            }

            // Helper to parse date key based on timeRange
            const parseDateKey = (key: string): Date => {
                if (timeRange === 'DAILY') return parseLocalDate(key);
                if (timeRange === 'WEEKLY') {
                    // Format: YYYY-Wxx
                    const [year, week] = key.split('-W').map(Number);
                    const simple = new Date(year, 0, 1 + (week - 1) * 7);
                    const dow = simple.getDay();
                    const ISOweekStart = simple;
                    if (dow <= 4)
                        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
                    else
                        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
                    return ISOweekStart;
                }
                if (timeRange === 'MONTHLY') {
                    // Format: YYYY-MM
                    const [year, month] = key.split('-').map(Number);
                    return new Date(year, month - 1, 1);
                }
                // YEARLY: YYYY
                return new Date(parseInt(key), 0, 1);
            };

            // Automatic Daily Depreciation (Operating View Only)
            if (viewMode === 'OPERATING') {
                // 1. Fixed Assets Depreciation
                const assets = investments.filter(i => i.type === 'ASSET' && i.status === 'ACTIVE');

                for (const asset of assets) {
                    if (asset.purchasePrice && asset.usefulLife) {
                        const cost = asset.purchasePrice;
                        const salvage = asset.salvageValue || 0;
                        const lifeYears = asset.usefulLife;
                        const dailyAmount = (cost - salvage) / (lifeYears * 365);

                        if (dailyAmount > 0) {
                            const assetStartDate = new Date(asset.startDate);
                            const assetEndDate = new Date(assetStartDate);
                            assetEndDate.setFullYear(assetEndDate.getFullYear() + lifeYears);

                            for (const dateKey of Object.keys(dashboardStats)) {
                                const currentDate = parseDateKey(dateKey);
                                const periodStart = currentDate;
                                const periodEnd = new Date(currentDate);
                                if (timeRange === 'DAILY') periodEnd.setDate(periodEnd.getDate() + 1);
                                else if (timeRange === 'WEEKLY') periodEnd.setDate(periodEnd.getDate() + 7);
                                else if (timeRange === 'MONTHLY') periodEnd.setMonth(periodEnd.getMonth() + 1);
                                else if (timeRange === 'YEARLY') periodEnd.setFullYear(periodEnd.getFullYear() + 1);

                                let effectiveDays = 0;
                                const loopStart = new Date(Math.max(periodStart.getTime(), assetStartDate.getTime()));
                                const loopEnd = new Date(Math.min(periodEnd.getTime(), assetEndDate.getTime()));

                                if (loopStart < loopEnd) {
                                    effectiveDays = Math.ceil((loopEnd.getTime() - loopStart.getTime()) / (1000 * 60 * 60 * 24));
                                }

                                if (effectiveDays > 0) {
                                    const periodDepreciationAmount = dailyAmount * effectiveDays;
                                    const convertedPeriodDepreciationAmount = await getExchangeRate(asset.currencyCode, settings.currency, settings) * periodDepreciationAmount;
                                    dashboardStats[dateKey].expense += convertedPeriodDepreciationAmount;
                                }
                            }
                        }
                    }
                }

                // 2. Recurring Bill Amortization
                const activeRules = recurringRules.filter(r => r.isActive);
                for (const rule of activeRules) {
                    let dailyAmount = 0;
                    const interval = rule.interval || 1;

                    if (rule.frequency === 'DAILY') {
                        dailyAmount = rule.amount / interval;
                    } else if (rule.frequency === 'WEEKLY') {
                        dailyAmount = rule.amount / (7 * interval);
                    } else if (rule.frequency === 'MONTHLY') {
                        dailyAmount = rule.amount / (30 * interval); // Standard 30 days
                    } else if (rule.frequency === 'YEARLY') {
                        dailyAmount = rule.amount / (365 * interval);
                    }

                    if (dailyAmount > 0) {
                        const ruleStartDate = parseLocalDate(rule.startDate);

                        for (const dateKey of Object.keys(dashboardStats)) {
                            const currentDate = parseDateKey(dateKey);
                            const periodStart = currentDate;
                            const periodEnd = new Date(currentDate);
                            if (timeRange === 'DAILY') periodEnd.setDate(periodEnd.getDate() + 1);
                            else if (timeRange === 'WEEKLY') periodEnd.setDate(periodEnd.getDate() + 7);
                            else if (timeRange === 'MONTHLY') periodEnd.setMonth(periodEnd.getMonth() + 1);
                            else if (timeRange === 'YEARLY') periodEnd.setFullYear(periodEnd.getFullYear() + 1);

                            let effectiveDays = 0;
                            // Start amortizing from rule start date
                            const loopStart = new Date(Math.max(periodStart.getTime(), ruleStartDate.getTime()));
                            // No end date for recurring rules unless we want to stop at today?
                            // Or just keep amortizing indefinitely?
                            // For dashboard, we only care about the view range.
                            const loopEnd = new Date(Math.min(periodEnd.getTime(), endDate.getTime() + 86400000)); // +1 day to include end date

                            if (loopStart < loopEnd) {
                                effectiveDays = Math.ceil((loopEnd.getTime() - loopStart.getTime()) / (1000 * 60 * 60 * 24));
                            }

                            // Ensure we don't count negative days if rule starts in future
                            if (effectiveDays < 0) effectiveDays = 0;

                            if (effectiveDays > 0) {
                                const periodAmount = dailyAmount * effectiveDays;
                                const convertedPeriodAmount = await getExchangeRate(rule.currencyCode, settings.currency, settings) * periodAmount;
                                dashboardStats[dateKey].expense += convertedPeriodAmount;

                                // Add to category data
                                const catId = rule.categoryId;
                                if (!categoryData[catId]) {
                                    const cat = categories.find(c => c.id === catId);
                                    categoryData[catId] = { id: catId, name: cat?.name || 'Uncategorized', value: 0, income: 0, expense: 0, color: getCategoryColor(catId) };
                                }
                                categoryData[catId].expense += convertedPeriodAmount;
                                categoryData[catId].value += convertedPeriodAmount;
                            }
                        }
                    }
                }
            }

            // Convert to array for Recharts
            const chartData = Object.keys(dashboardStats).sort().map(key => ({
                month: key,
                income: dashboardStats[key].income,
                expense: dashboardStats[key].expense,
                net: dashboardStats[key].income - dashboardStats[key].expense
            }));

            setMonthlyData(chartData);

            // Re-calculate category data based on the updated categoryData object
            const finalCatData = Object.values(categoryData)
                .map(data => ({
                    id: data.id || 'uncategorized', // Ensure ID exists
                    name: data.name,
                    value: data.value,
                    originalCurrencies: {},
                    percentage: data.value > 0 ? (data.value / chartData.reduce((sum, d) => sum + d.expense, 0)) * 100 : 0,
                    color: data.color
                }))
                .sort((a, b) => b.value - a.value);
            setCategoryData(finalCatData);

            // Trend Data (Last 7 days)
            let trend: { date: string; amount: number }[] = [];
            if (timeRange === 'DAILY') {
                trend = chartData.slice(-7).map(d => ({ date: d.month, amount: d.expense }));
            } else {
                trend = chartData.map(d => ({ date: d.month, amount: d.expense }));
            }
            setTrendData(trend);

            setIsLoading(false);
        };

        calculateData();
    }, [transactions, categories, investments, settings, selectedCategoryIds, viewMode, timeRange]);

    const toggleCategory = (id: string) => {
        setSelectedCategoryIds(prev =>
            prev.includes(id)
                ? prev.filter(cId => cId !== id)
                : [...prev, id]
        );
    };

    if (isStoreLoading || (isLoading && categories.length === 0)) {
        return <LoadingSpinner />;
    }

    return (
        <div className="container max-w-2xl mx-auto p-4 pb-24 md:pt-24 space-y-8">
            <header>
                <h1 className="text-2xl font-bold">{t('reports.title')}</h1>
                <p className="text-muted-foreground text-sm">{t('reports.desc')}</p>
            </header>

            {/* View Mode Toggle */}
            <section className="bg-card border rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-medium flex items-center gap-2">
                        {t('reports.view_mode')}
                        <div className="group relative">
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg hidden group-hover:block z-50 border">
                                <p className="font-bold mb-1">{t('reports.view.operating')}</p>
                                <p className="mb-2 text-muted-foreground">{t('reports.view.operating_desc')}</p>
                                <p className="font-bold mb-1">{t('reports.view.cash_flow')}</p>
                                <p className="text-muted-foreground">{t('reports.view.cash_flow_desc')}</p>
                            </div>
                        </div>
                    </h2>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('OPERATING')}
                        className={`text-sm font-medium py-2 rounded-md transition-all ${viewMode === 'OPERATING'
                            ? 'bg-background shadow-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {t('reports.view.operating')}
                    </button>
                    <button
                        onClick={() => setViewMode('CASH_FLOW')}
                        className={`text-sm font-medium py-2 rounded-md transition-all ${viewMode === 'CASH_FLOW'
                            ? 'bg-background shadow-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {t('reports.view.cash_flow')}
                    </button>
                </div>
            </section>

            {/* Financial Dashboard (Monthly Income vs Expense) */}
            <section className="bg-card border rounded-xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        {t('reports.financial_dashboard') || 'Financial Dashboard'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg px-2">
                            <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={visibleSeries.income}
                                    onChange={(e) => setVisibleSeries(prev => ({ ...prev, income: e.target.checked }))}
                                    className="rounded border-gray-300 text-green-500 focus:ring-green-500 h-3 w-3"
                                />
                                <span className="text-green-600">{t('common.income')}</span>
                            </label>
                            <div className="w-px h-3 bg-border" />
                            <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={visibleSeries.expense}
                                    onChange={(e) => setVisibleSeries(prev => ({ ...prev, expense: e.target.checked }))}
                                    className="rounded border-gray-300 text-red-500 focus:ring-red-500 h-3 w-3"
                                />
                                <span className="text-red-600">{t('common.expense')}</span>
                            </label>
                        </div>
                        <div className="flex bg-muted p-1 rounded-lg">
                            {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeRange === range
                                        ? 'bg-background shadow-sm text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {t(`reports.range.${range.toLowerCase()}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <ComposedChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="month"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => {
                                    if (timeRange === 'DAILY') return val.slice(5); // MM-DD
                                    if (timeRange === 'WEEKLY') return val.slice(5); // W01
                                    if (timeRange === 'MONTHLY') return val.slice(5); // MM
                                    return val; // YYYY
                                }}
                            />
                            <YAxis
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `${val}`}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                formatter={(value: number, name: string) => [formatCurrency(value, settings.currency), name === 'income' ? t('common.income') : t('common.expense')]}
                                labelFormatter={(label) => label}
                            />
                            <Legend />
                            {visibleSeries.income && (
                                <Bar dataKey="income" name={t('common.income') || 'Income'} fill="#4ade80" radius={[4, 4, 0, 0]} barSize={20} />
                            )}
                            {visibleSeries.expense && (
                                <Bar dataKey="expense" name={t('common.expense') || 'Expense'} fill="#f87171" radius={[4, 4, 0, 0]} barSize={20} />
                            )}
                            {visibleSeries.expense && (
                                <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </section >

            {/* Category Filter */}
            < section className="bg-card border rounded-xl p-6 shadow-sm space-y-4" >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <h2 className="text-sm font-medium">Filter by Category</h2>
                    </div>
                    <button
                        onClick={() => {
                            if (selectedCategoryIds.length === expenseCategories.length) {
                                setSelectedCategoryIds([]);
                            } else {
                                setSelectedCategoryIds(expenseCategories.map(c => c.id));
                            }
                        }}
                        className="text-xs text-primary hover:underline font-medium"
                    >
                        {selectedCategoryIds.length === expenseCategories.length ? 'Clear All' : 'Select All'}
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {expenseCategories.map(category => {
                        const isSelected = selectedCategoryIds.includes(category.id);
                        const color = getCategoryColor(category.id);
                        return (
                            <button
                                key={category.id}
                                onClick={() => toggleCategory(category.id)}
                                style={{
                                    backgroundColor: isSelected ? `${color}20` : undefined, // 20 is hex opacity ~12%
                                    color: isSelected ? color : undefined,
                                    borderColor: isSelected ? `${color}40` : undefined
                                }}
                                className={`
                                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                                    ${isSelected
                                        ? ''
                                        : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'}
                                `}
                            >
                                <span>{category.icon}</span>
                                <span>{category.name}</span>
                            </button>
                        );
                    })}
                </div>
            </section >

            {/* Category Share */}
            < section className="bg-card border rounded-xl p-6 shadow-sm" >
                <h2 className="text-lg font-semibold mb-4">{t('reports.by_category')}</h2>
                <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="h-[300px] w-full md:w-1/2">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={0}
                                    outerRadius={80}
                                    paddingAngle={0}
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip settings={settings} />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="w-full md:w-1/2 grid grid-cols-1 gap-2">
                        {categoryData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center gap-3 text-sm p-2 hover:bg-muted/50 rounded-lg transition-colors">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                <span className="flex-1 font-medium">{entry.name}</span>
                                <div className="text-right">
                                    <div className="font-bold">{formatCurrency(entry.value, settings.currency)}</div>
                                    <div className="text-xs text-muted-foreground">{entry.percentage.toFixed(1)}%</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section >

            {/* Trend */}
            < section className="bg-card border rounded-xl p-6 shadow-sm" >
                <h2 className="text-lg font-semibold mb-4">{t('reports.trend')}</h2>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={trendData}>
                            <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}`} />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                formatter={(value: number, name: string) => {
                                    if (name === 'capex') return [formatCurrency(value, settings.currency), t('reports.capex')];
                                    const cat = categories.find(c => c.id === name);
                                    return [formatCurrency(value, settings.currency), cat?.name || name];
                                }}
                            />
                            {categories.map(category => (
                                <Bar
                                    key={category.id}
                                    dataKey={category.id}
                                    stackId="a"
                                    fill={getCategoryColor(category.id)}
                                    radius={[0, 0, 0, 0]}
                                />
                            ))}
                            {/* Explicitly add Bar for Capital Expenditure if in Cash Flow mode */}
                            {viewMode === 'CASH_FLOW' && (
                                <Bar
                                    key="capex"
                                    dataKey="capex"
                                    stackId="a"
                                    fill={getCategoryColor('capex')}
                                    radius={[0, 0, 0, 0]}
                                />
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section >
        </div >
    );
}
