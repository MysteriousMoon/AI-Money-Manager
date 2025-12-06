'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { formatCurrency } from '@/lib/currency';
import { useStore } from '@/lib/store';

import { useTranslation } from '@/lib/i18n';

interface LifestyleChartProps {
    data: any[];
}

export function LifestyleChart({ data }: LifestyleChartProps) {
    const { settings } = useStore();
    const { t } = useTranslation();

    // Calculate KPI: Daily Burn Rate (Last day or Average?)
    // User asked for "Real Daily Burn Rate"
    // Let's show Today's burn if available, or Average of the period
    const todayData = data[data.length - 1];
    const todayBurn = todayData ? todayData.totalBurn : 0;

    // Calculate yesterday comparison
    const yesterdayData = data[data.length - 2];
    const yesterdayBurn = yesterdayData ? yesterdayData.totalBurn : 0;
    const percentChange = yesterdayBurn > 0 ? ((todayBurn - yesterdayBurn) / yesterdayBurn) * 100 : 0;

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground">{t('dashboard.daily_burn_rate')}</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold font-mono text-foreground">
                            {formatCurrency(todayBurn, settings.currency)}
                        </span>
                        <span className={`text-xs font-medium ${percentChange > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} stackOffset="sign">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.1} />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(val) => new Date(val).getDate().toString()}
                            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={false}
                            tickLine={false}
                            minTickGap={30}
                        />
                        <YAxis hide />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                borderColor: 'hsl(var(--border))',
                                borderRadius: '0.5rem',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            }}
                            formatter={(value: number | string | Array<number | string>, name: string) => {
                                const numValue = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) : 0);
                                return [formatCurrency(numValue || 0, settings.currency), name];
                            }}
                            labelFormatter={(label) => {
                                // Handle YYYY-MM-DD format from data
                                if (typeof label === 'string' && label.includes('-')) {
                                    const [year, month, day] = label.split('-').map(Number);
                                    return new Date(year, month - 1, day).toLocaleDateString();
                                }
                                return new Date(label).toLocaleDateString();
                            }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                        {/* Stacked Bars */}
                        <Bar dataKey="ordinaryCost" name={t('dashboard.living')} stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                        <Bar dataKey="recurringCost" name={t('dashboard.recurring')} stackId="a" fill="#8b5cf6" />
                        <Bar dataKey="depreciationCost" name={t('dashboard.depreciation')} stackId="a" fill="hsl(var(--accrual))" />
                        <Bar dataKey="projectCost" name={t('dashboard.project')} stackId="a" fill="hsl(var(--project))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
