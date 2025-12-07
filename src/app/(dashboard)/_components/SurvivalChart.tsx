'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency } from '@/lib/currency';
import { useStore } from '@/lib/store';
import { parseLocalDate } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { useState, useMemo } from 'react';
import { SegmentedControl } from '@/components/ui/segmented-control';

interface SurvivalChartProps {
    data: any[];
    runwayMonths?: number;  // 后端预计算值
    currentCapital?: number;
}

export function SurvivalChart({ data, runwayMonths: preCalculatedRunway, currentCapital: preCalculatedCapital }: SurvivalChartProps) {
    const { settings } = useStore();
    const { t } = useTranslation();
    const [range, setRange] = useState('1M');

    // 如果有后端预计算值则优先使用，否则在本地计算（向后兼容）
    // 使用 cashLevel (纯现金) 进行跑道计算，不包含 capitalLevel (包含投资)
    const currentCapital = preCalculatedCapital ?? data[data.length - 1]?.cashLevel ?? data[data.length - 1]?.capitalLevel ?? 0;
    const runwayMonths = preCalculatedRunway ?? (() => {
        const totalCashBurn = data.reduce((sum, d) => sum + (d.cashBurn || 0), 0);
        const avgDailyBurn = totalCashBurn / (data.length || 1);
        const runwayDays = avgDailyBurn > 0 ? currentCapital / avgDailyBurn : 0;
        return runwayDays / 30;
    })();

    const filteredData = useMemo(() => {
        if (range === 'ALL') return data;
        const now = new Date();
        const cutoff = new Date();
        // Reset hours to avoid partial day issues? Not strictly necessary for this level of filtering

        switch (range) {
            case '1W':
                cutoff.setDate(now.getDate() - 7);
                break;
            case '1M':
                cutoff.setMonth(now.getMonth() - 1);
                break;
            case '3M':
                cutoff.setMonth(now.getMonth() - 3);
                break;
            case 'YTD':
            case '1Y':
                cutoff.setMonth(now.getMonth() - 12); // Fallback if YTD meant 1 year rolling, or stick to Jan 1
                // User said "Year", usually implies 1 Year rolling or YTD. Let's keep YTD logic if that's what we had, or standard 1Y.
                // Actually the user complaint "点到年的时候就以周为单位来显示了" implies they want "Year" view.
                // Let's stick to the options logic.
                if (range === 'YTD') cutoff.setMonth(0, 1);
                else cutoff.setFullYear(now.getFullYear() - 1);
                break;
            default:
                return data;
        }
        return data.filter(d => new Date(d.date) >= cutoff);
    }, [data, range]);

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
                <div className="flex flex-col items-end gap-2">
                    <SegmentedControl
                        value={range}
                        onChange={setRange}
                        options={[
                            { label: '周', value: '1W' },
                            { label: '月', value: '1M' },
                            { label: '季', value: '3M' },
                            { label: '年', value: 'YTD' },
                        ]}
                    />
                    <div className="text-right">
                        <div className={`text-2xl font-bold font-mono ${runwayMonths < 3 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {runwayMonths.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">{t('dashboard.months')}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('dashboard.based_on_burn')}</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredData}>
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
