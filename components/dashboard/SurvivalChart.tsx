'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency } from '@/lib/currency';
import { useStore } from '@/lib/store';
import { parseLocalDate } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

interface SurvivalChartProps {
    data: any[];
}

export function SurvivalChart({ data }: SurvivalChartProps) {
    const { settings } = useStore();

    const { t } = useTranslation();

    // Calculate KPI: Cash Runway
    // Based on last 3 months average burn rate (or available data)
    // Here we use the data passed in (which is the selected range)
    const totalBurn = data.reduce((sum, d) => sum + d.totalBurn, 0);
    const avgDailyBurn = totalBurn / (data.length || 1);
    const currentCapital = data[data.length - 1]?.capitalLevel || 0;
    const runwayDays = avgDailyBurn > 0 ? currentCapital / avgDailyBurn : 0;
    const runwayMonths = runwayDays / 30;

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground">{t('dashboard.cash_runway')}</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold font-mono text-cash">
                            {formatCurrency(currentCapital, settings.currency)}
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`text-2xl font-bold font-mono ${runwayMonths < 3 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {runwayMonths.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">{t('dashboard.months')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('dashboard.based_on_burn')}</p>
                </div>
            </div>

            <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--cash))" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(var(--cash))" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.1} />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(val) => new Date(val).getDate().toString()}
                            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={false}
                            tickLine={false}
                            minTickGap={30}
                        />
                        <YAxis
                            hide
                            domain={['auto', 'auto']}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                borderColor: 'hsl(var(--border))',
                                borderRadius: '0.5rem',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                            formatter={(value: number) => [formatCurrency(value, settings.currency), 'Capital Level']}
                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        <Area
                            type="monotone"
                            dataKey="capitalLevel"
                            stroke="hsl(var(--cash))"
                            fillOpacity={1}
                            fill="url(#colorCapital)"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
