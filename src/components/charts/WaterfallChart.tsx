'use client';

import { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface WaterfallItem {
    label: string;
    value: number;
    type: 'start' | 'add' | 'subtract' | 'total';
}

interface WaterfallChartProps {
    income: number;
    expenses: number;
    depreciation?: number;
    currencyCode?: string;
    className?: string;
}

export function WaterfallChart({
    income,
    expenses,
    depreciation = 0,
    currencyCode = 'CNY',
    className,
}: WaterfallChartProps) {
    const { t } = useTranslation();

    const netResult = income - expenses - depreciation;

    const items: WaterfallItem[] = useMemo(() => {
        const result: WaterfallItem[] = [
            { label: t('projects.income') || 'Income', value: income, type: 'start' },
        ];

        if (expenses > 0) {
            result.push({
                label: t('projects.expenses') || 'Expenses',
                value: -expenses,
                type: 'subtract',
            });
        }

        if (depreciation > 0) {
            result.push({
                label: t('projects.depreciation') || 'Depreciation',
                value: -depreciation,
                type: 'subtract',
            });
        }

        result.push({
            label: t('projects.net_result') || 'Net Result',
            value: netResult,
            type: 'total',
        });

        return result;
    }, [income, expenses, depreciation, netResult, t]);

    // Calculate running totals for positioning
    const positions = useMemo(() => {
        let runningTotal = 0;
        return items.map(item => {
            const start = runningTotal;
            const end = item.type === 'total' ? item.value : runningTotal + item.value;
            runningTotal = item.type === 'total' ? item.value : runningTotal + item.value;
            return { start, end, runningTotal };
        });
    }, [items]);

    // Find max/min for scaling
    const allValues = positions.flatMap(p => [p.start, p.end, p.runningTotal]);
    const maxValue = Math.max(...allValues, 0);
    const minValue = Math.min(...allValues, 0);
    const range = maxValue - minValue || 1;

    // Scale function: map value to percentage
    const scale = (value: number) => ((value - minValue) / range) * 100;
    const zeroLine = scale(0);

    const formatValue = (value: number) => {
        const absValue = Math.abs(value);
        if (absValue >= 10000) {
            return (value / 10000).toFixed(1) + '万';
        }
        return value.toFixed(0);
    };

    return (
        <div className={cn("space-y-3", className)}>
            {/* Chart */}
            <div className="relative h-48 bg-muted/30 rounded-lg p-4">
                {/* Zero line */}
                <div
                    className="absolute left-0 right-0 border-t border-dashed border-muted-foreground/30"
                    style={{ bottom: `${zeroLine}%` }}
                />
                <span
                    className="absolute left-1 text-xs text-muted-foreground"
                    style={{ bottom: `${zeroLine}%`, transform: 'translateY(50%)' }}
                >
                    0
                </span>

                {/* Bars */}
                <div className="flex items-end justify-around h-full gap-2 pl-6">
                    {items.map((item, index) => {
                        const pos = positions[index];
                        const barBottom = scale(Math.min(pos.start, pos.end));
                        const barHeight = Math.abs(scale(pos.end) - scale(pos.start));
                        const isNegative = item.value < 0;
                        const isTotal = item.type === 'total';

                        return (
                            <div key={index} className="flex-1 relative h-full flex flex-col items-center">
                                {/* Bar */}
                                <div
                                    className={cn(
                                        "absolute w-full max-w-16 rounded-t transition-all",
                                        isTotal
                                            ? item.value >= 0
                                                ? "bg-green-500"
                                                : "bg-red-500"
                                            : isNegative
                                                ? "bg-red-400/80"
                                                : "bg-green-400/80"
                                    )}
                                    style={{
                                        bottom: `${barBottom}%`,
                                        height: `${Math.max(barHeight, 2)}%`,
                                    }}
                                >
                                    {/* Value label on bar */}
                                    <span
                                        className={cn(
                                            "absolute left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap",
                                            barHeight > 15 ? "top-1 text-white" : "-top-5 text-foreground"
                                        )}
                                    >
                                        {isNegative ? '' : '+'}{formatValue(item.value)}
                                    </span>
                                </div>

                                {/* Connector line (for waterfall effect) */}
                                {index > 0 && index < items.length - 1 && (
                                    <div
                                        className="absolute w-full border-t-2 border-dashed border-muted-foreground/20"
                                        style={{ bottom: `${scale(pos.start)}%` }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="flex justify-around text-xs">
                {items.map((item, index) => (
                    <div key={index} className="text-center">
                        <div className={cn(
                            "font-medium",
                            item.type === 'total' && (item.value >= 0 ? "text-green-600" : "text-red-600")
                        )}>
                            {item.label}
                        </div>
                        <div className="text-muted-foreground">
                            {currencyCode} {Math.abs(item.value).toFixed(2)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
