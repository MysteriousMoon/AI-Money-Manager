'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency } from '@/lib/currency';
import { useStore } from '@/lib/store';
import { parseLocalDate } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

interface SurvivalChartProps {
    data: any[];
    runwayMonths?: number;  // 后端预计算值
    currentCapital?: number;
}

export function SurvivalChart({ data, runwayMonths: preCalculatedRunway, currentCapital: preCalculatedCapital }: SurvivalChartProps) {
    const { settings } = useStore();

    const { t } = useTranslation();

    // 如果有后端预计算值则优先使用，否则在本地计算（向后兼容）
    // 使用 cashLevel (纯现金) 进行跑道计算，不包含 capitalLevel (包含投资)
    const currentCapital = preCalculatedCapital ?? data[data.length - 1]?.cashLevel ?? data[data.length - 1]?.capitalLevel ?? 0;
    const runwayMonths = preCalculatedRunway ?? (() => {
        const totalCashBurn = data.reduce((sum, d) => sum + (d.cashBurn || 0), 0);
        const avgDailyBurn = totalCashBurn / (data.length || 1);
        const runwayDays = avgDailyBurn > 0 ? currentCapital / avgDailyBurn : 0;
        return runwayDays / 30;
    })();

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
                            formatter={(value: number) => [formatCurrency(value, settings.currency), 'Cash Level']}
                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        <Area
                            type="monotone"
                            dataKey="cashLevel"
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
