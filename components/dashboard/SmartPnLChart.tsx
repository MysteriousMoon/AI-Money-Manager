'use client';

import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { formatCurrency } from '@/lib/currency';
import { useStore } from '@/lib/store';

import { useTranslation } from '@/lib/i18n';

interface SmartPnLChartProps {
    data: any[];
}

export function SmartPnLChart({ data }: SmartPnLChartProps) {
    const { settings } = useStore();
    const { t } = useTranslation();

    // Aggregate data by month for P&L
    // Or just show daily if the range is short?
    // User requested "Smart P&L Card" which usually implies Monthly view.
    // But our data is daily. Let's aggregate it on the fly or just show daily if < 31 days.
    // For now, let's show daily to match the other charts, but maybe grouped?
    // Actually, P&L is better monthly.

    // Simple aggregation helper
    const monthlyData = data.reduce((acc: any[], curr) => {
        const month = curr.date.slice(0, 7); // YYYY-MM
        const existing = acc.find(d => d.month === month);
        if (existing) {
            existing.income += curr.income;
            existing.amortizedCost += curr.totalBurn;
            existing.netProfit += curr.netProfit;
        } else {
            acc.push({
                month,
                income: curr.income,
                amortizedCost: curr.totalBurn,
                netProfit: curr.netProfit
            });
        }
        return acc;
    }, []);

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{t('dashboard.smart_pnl')}</h3>
                <div className="flex gap-2">
                    {/* Tags */}
                    {monthlyData.length > 0 && monthlyData[monthlyData.length - 1].netProfit > 0 && (
                        <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium border border-emerald-500/20">
                            {t('dashboard.profitable_month')}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.1} />
                        <XAxis
                            dataKey="month"
                            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val) => `${val}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                borderColor: 'hsl(var(--border))',
                                borderRadius: '0.5rem',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            }}
                            formatter={(value: number, name: string) => [formatCurrency(value, settings.currency), name]}
                        />
                        <Legend />
                        <Bar dataKey="income" name={t('common.income')} fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="amortizedCost" name={t('dashboard.amortized_cost')} fill="hsl(var(--accrual))" radius={[4, 4, 0, 0]} barSize={20} />
                        <Line type="monotone" dataKey="netProfit" name={t('dashboard.net_profit')} stroke="hsl(var(--cash))" strokeWidth={3} dot={{ r: 4 }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
