'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTranslation } from '@/lib/i18n';
import { Transaction, Category, Settings } from '@/types';
import { useMemo } from 'react';
import { formatCurrency } from '@/lib/currency';

interface ExpenseCompositionChartProps {
    transactions: Transaction[];
    categories: Category[];
    settings: Settings;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export function ExpenseCompositionChart({ transactions, categories, settings }: ExpenseCompositionChartProps) {
    const { t } = useTranslation();

    const data = useMemo(() => {
        const expenses = transactions.filter(t => t.type === 'EXPENSE');
        const categoryTotals: Record<string, number> = {};

        expenses.forEach(tx => {
            const categoryName = categories.find(c => c.id === tx.categoryId)?.name || 'Unknown';
            categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + tx.amount;
        });

        return Object.entries(categoryTotals)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5 categories
    }, [transactions, categories]);

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm h-full flex flex-col">
            <h3 className="text-gray-400 text-sm font-medium mb-4">Expense Composition</h3>
            <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number) => formatCurrency(value, settings.currency)}
                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                        />
                        <Legend
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
