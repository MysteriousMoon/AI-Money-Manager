'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { formatCurrency } from '@/lib/currency';
import { useStore } from '@/lib/store';
import { useState, useMemo } from 'react';
import { SegmentedControl } from '@/components/ui/segmented-control';
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

    const [range, setRange] = useState('1M');

    const filteredData = useMemo(() => {
        if (range === 'ALL') return data;
        const now = new Date();
        const cutoff = new Date();

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
                cutoff.setMonth(0, 1); // Jan 1st of current year
                break;
            default:
                return data;
        }

        const filtered = data.filter(d => new Date(d.date) >= cutoff);

        // Aggregate by week if range is YTD or longer (conceptually > 3M)
        // User requested: "Hit Year then show by week"
        if (range === 'YTD') {
            const weeklyMap = new Map();
            filtered.forEach(d => {
                const date = new Date(d.date);
                // Get start of week (Sunday or Monday? Let's use Monday as standard business week start, or Sunday)
                // d.date is YYYY-MM-DD
                const day = date.getDay();
                const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
                const monday = new Date(date.setDate(diff));
                const weekKey = monday.toISOString().split('T')[0];

                if (!weeklyMap.has(weekKey)) {
                    weeklyMap.set(weekKey, {
                        date: weekKey,
                        ordinaryCost: 0,
                        recurringCost: 0,
                        depreciationCost: 0,
                        projectCost: 0,
                        totalBurn: 0,
                        count: 0
                    });
                }
                const entry = weeklyMap.get(weekKey);
                entry.ordinaryCost += d.ordinaryCost;
                entry.recurringCost += d.recurringCost;
                entry.depreciationCost += d.depreciationCost;
                entry.projectCost += d.projectCost;
                entry.totalBurn += d.totalBurn;
                entry.count += 1;
            });

            // For burn rate, are we showing Total per week or Average Daily per Week?
            // "Daily Burn Rate" chart title suggests rate.
            // If we switch to weekly bars, the user might expect "Weekly Burn" (Sum) or "Avg Daily Burn this Week".
            // Given the Y-axis has values like ~200, if we sum 7 days it will be ~1400.
            // Chart usually auto-scales.
            // However, "日均消耗" means Daily. If I show weeks, I should probably show AVERAGE daily burn for that week.
            // Let's divide by count (days in that week).

            return Array.from(weeklyMap.values()).map((w: any) => ({
                ...w,
                ordinaryCost: w.ordinaryCost / w.count,
                recurringCost: w.recurringCost / w.count,
                depreciationCost: w.depreciationCost / w.count,
                projectCost: w.projectCost / w.count,
                totalBurn: w.totalBurn / w.count
            })).sort((a, b) => a.date.localeCompare(b.date));
        }

        return filtered;
    }, [data, range]);

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
                <div>
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
                </div>
            </div>

            <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredData} stackOffset="sign">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.1} />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(val) => {
                                const d = new Date(val);
                                return range === 'YTD'
                                    ? `${d.getMonth() + 1}/${d.getDate()}` // M/D for weeks
                                    : d.getDate().toString();
                            }}
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
                                    const d = new Date(year, month - 1, day);
                                    return range === 'YTD'
                                        ? `Week of ${d.toLocaleDateString()}`
                                        : d.toLocaleDateString();
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
