'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Label } from 'recharts';
import { useTranslation } from '@/lib/i18n';
import { Settings } from '@/types';
import { useMemo } from 'react';
import { formatCurrency } from '@/lib/currency';

interface ExpenseCompositionChartProps {
    // Server-calculated expense by category (already currency-converted)
    expenseByCategory: Record<string, number>;
    settings: Settings;
}

// Cool gradient colors (blue-cyan spectrum with warm accent)
const COLORS = ['#3b82f6', '#06b6d4', '#22d3d8', '#f59e0b', '#8b5cf6'];

export function ExpenseCompositionChart({ expenseByCategory, settings }: ExpenseCompositionChartProps) {
    const { t } = useTranslation();

    const { data, total } = useMemo(() => {
        const chartData = Object.entries(expenseByCategory)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5 categories

        const totalAmount = chartData.reduce((sum, item) => sum + item.value, 0);

        return { data: chartData, total: totalAmount };
    }, [expenseByCategory]);

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 md:p-6 shadow-sm h-full flex flex-col">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2 md:mb-4">{settings.language === 'zh' ? '支出构成' : 'Expense Composition'}</h3>
            <div className="flex-1 min-h-[200px] flex items-center justify-center">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius="50%"
                                outerRadius="75%"
                                paddingAngle={3}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                                <Label
                                    value={formatCurrency(total, settings.currency)}
                                    position="center"
                                    className="fill-gray-900 dark:fill-white"
                                    fontSize={16}
                                    fontWeight="bold"
                                />
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value, settings.currency)}
                                contentStyle={{
                                    backgroundColor: 'var(--tooltip-bg)',
                                    borderColor: 'var(--tooltip-border)',
                                    color: 'var(--tooltip-text)',
                                    borderRadius: '8px'
                                }}
                                itemStyle={{ color: 'var(--tooltip-text)' }}
                            />
                            <Legend
                                layout="vertical"
                                verticalAlign="middle"
                                align="right"
                                wrapperStyle={{ fontSize: '11px', color: '#9ca3af', paddingLeft: '10px' }}
                                formatter={(value) => <span className="text-gray-600 dark:text-gray-400">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="text-center text-gray-500 text-sm">
                        {settings.language === 'zh' ? '本月暂无支出' : 'No expenses this month'}
                    </div>
                )}
            </div>
            <style jsx global>{`
                :root {
                    --tooltip-bg: #ffffff;
                    --tooltip-border: #e5e7eb;
                    --tooltip-text: #111827;
                }
                .dark {
                    --tooltip-bg: #1f2937;
                    --tooltip-border: #374151;
                    --tooltip-text: #f3f4f6;
                }
            `}</style>
        </div>
    );
}
