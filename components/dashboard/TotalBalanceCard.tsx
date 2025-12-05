'use client';

import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import { Settings } from '@/types';

interface TotalBalanceCardProps {
    totalCash: number;
    totalFinancialInvested: number;
    thisMonthIncome: number;
    thisMonthTotal: number;
    allTimeIncome: number;
    allTimeTotal: number;
    settings: Settings;
    loading: boolean;
}

export function TotalBalanceCard({
    totalCash,
    totalFinancialInvested,
    thisMonthIncome,
    thisMonthTotal,
    allTimeIncome,
    allTimeTotal,
    settings,
    loading
}: TotalBalanceCardProps) {
    const { t } = useTranslation();

    const totalAssets = totalCash + totalFinancialInvested;

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm h-full flex flex-col justify-between relative overflow-hidden group hover:shadow-md dark:hover:bg-gray-800/50 transition-all">
            <div className="space-y-2 relative z-10">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('common.total')} {t('common.asset')}</p>
                <div className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                    {loading ? '...' : formatCurrency(totalAssets, settings.currency)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <span className="text-emerald-400 flex items-center">
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        +2.5%
                    </span>
                    <span>vs last month</span>
                </div>
            </div>

            {/* Decorative Sparkline or Icon */}
            <div className="absolute bottom-4 right-4 opacity-10">
                <ArrowUpRight className="h-16 w-16 text-primary" />
            </div>
        </div>
    );
}
