'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, TooltipProps } from 'recharts';
import { formatCurrency, getExchangeRate } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import { Loader2, Filter } from 'lucide-react';
import { formatLocalDate } from '@/lib/utils';

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

export default function ReportsPage() {
    const { transactions, categories, settings } = useStore();
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(true);
    const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
    const [trendData, setTrendData] = useState<{ date: string; amount: number }[]>([]);

    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

    // Helper to get stable color for a category
    const getCategoryColor = (categoryId: string) => {
        const index = categories.findIndex(c => c.id === categoryId);
        return index >= 0 ? COLORS[index % COLORS.length] : '#999';
    };

    // Initialize selected categories when categories are loaded
    useEffect(() => {
        if (categories.length > 0 && selectedCategoryIds.length === 0) {
            setSelectedCategoryIds(categories.map(c => c.id));
        }
    }, [categories]);

    useEffect(() => {
        const calculateData = async () => {
            setIsLoading(true);
            const expenses = transactions.filter(t =>
                t.type === 'EXPENSE' &&
                (selectedCategoryIds.length === 0 || selectedCategoryIds.includes(t.categoryId))
            );

            // 1. Group by Category
            const catGrouped: Record<string, { id: string; value: number; original: Record<string, number> }> = {};
            let totalExpenses = 0;

            // 2. Group by Date (Last 7 days)
            const trendGrouped: Record<string, number> = {};
            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const dateStr = formatLocalDate(d);
                trendGrouped[dateStr] = 0;
            }

            // Process transactions
            for (const t of expenses) {
                const rate = await getExchangeRate(t.currencyCode, settings.currency, settings);
                const convertedAmount = t.amount * rate;
                totalExpenses += convertedAmount;

                // Category Data
                const category = categories.find(c => c.id === t.categoryId);
                const catName = category?.name || 'Uncategorized';
                const catId = category?.id || 'uncategorized';

                if (!catGrouped[catName]) {
                    catGrouped[catName] = { id: catId, value: 0, original: {} };
                }
                catGrouped[catName].value += convertedAmount;
                catGrouped[catName].original[t.currencyCode] = (catGrouped[catName].original[t.currencyCode] || 0) + t.amount;

                // Trend Data
                if (trendGrouped[t.date] !== undefined) {
                    trendGrouped[t.date] += convertedAmount;
                }
            }

            // Format Category Data
            const finalCatData = Object.entries(catGrouped)
                .map(([name, data]) => ({
                    id: data.id,
                    name,
                    value: data.value,
                    originalCurrencies: data.original,
                    percentage: totalExpenses > 0 ? (data.value / totalExpenses) * 100 : 0,
                    color: getCategoryColor(data.id)
                }))
                .sort((a, b) => b.value - a.value);

            setCategoryData(finalCatData);

            // Format Trend Data
            const finalTrendData = Object.entries(trendGrouped).map(([date, amount]) => ({
                date: date.slice(5), // MM-DD
                amount
            }));
            setTrendData(finalTrendData);

            setIsLoading(false);
        };

        calculateData();
    }, [transactions, categories, settings, selectedCategoryIds]);

    const toggleCategory = (id: string) => {
        setSelectedCategoryIds(prev =>
            prev.includes(id)
                ? prev.filter(cId => cId !== id)
                : [...prev, id]
        );
    };

    if (isLoading && categories.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container max-w-2xl mx-auto p-4 pb-24 md:pt-24 space-y-8">
            <header>
                <h1 className="text-2xl font-bold">{t('reports.title')}</h1>
                <p className="text-muted-foreground text-sm">{t('reports.desc')}</p>
            </header>

            {/* Category Filter */}
            <section className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <h2 className="text-sm font-medium">Filter by Category</h2>
                    </div>
                    <button
                        onClick={() => {
                            if (selectedCategoryIds.length === categories.length) {
                                setSelectedCategoryIds([]);
                            } else {
                                setSelectedCategoryIds(categories.map(c => c.id));
                            }
                        }}
                        className="text-xs text-primary hover:underline font-medium"
                    >
                        {selectedCategoryIds.length === categories.length ? 'Clear All' : 'Select All'}
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {categories.map(category => {
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
            </section>

            {/* Category Share */}
            <section className="bg-card border rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">{t('reports.by_category')}</h2>
                <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="h-[300px] w-full md:w-1/2">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
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
            </section>

            {/* Trend */}
            <section className="bg-card border rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">{t('reports.trend')}</h2>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendData}>
                            <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}`} />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                formatter={(value: number) => [formatCurrency(value, settings.currency), 'Amount']}
                            />
                            <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>
        </div>
    );
}
