'use client';

import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import { Settings } from '@/types';

interface MonthlyFlowCardProps {
    income: number;
    expenses: number;
    settings: Settings;
    loading: boolean;
}

export function MonthlyFlowCard({
    income,
    expenses,
    settings,
    loading
}: MonthlyFlowCardProps) {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 md:p-6 shadow-sm h-full flex flex-col justify-between group hover:shadow-md dark:hover:bg-gray-800/50 transition-all">
            <div className="space-y-2 md:space-y-4">
                <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium">{t('dashboard.income')} / {t('dashboard.spending')}</p>

                <div className="space-y-1.5 md:space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs md:text-sm text-muted-foreground flex items-center gap-0.5 md:gap-1">
                            <ArrowDownRight className="h-2.5 w-2.5 md:h-3 md:w-3 text-emerald-500" />
                            In
                        </span>
                        <span className="text-sm md:text-lg font-semibold text-emerald-400">
                            {loading ? '...' : formatCurrency(income, settings.currency)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs md:text-sm text-muted-foreground flex items-center gap-0.5 md:gap-1">
                            <ArrowUpRight className="h-2.5 w-2.5 md:h-3 md:w-3 text-rose-500" />
                            Out
                        </span>
                        <span className="text-sm md:text-lg font-semibold text-rose-400">
                            {loading ? '...' : formatCurrency(expenses, settings.currency)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
