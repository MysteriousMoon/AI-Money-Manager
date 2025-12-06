'use client';

import { formatCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import { Settings } from '@/types';
import { Flame } from 'lucide-react';

interface MonthlyBurnRateCardProps {
    averageBurnRate: number;
    settings: Settings;
    loading: boolean;
}

export function MonthlyBurnRateCard({ averageBurnRate, settings, loading }: MonthlyBurnRateCardProps) {
    const { t } = useTranslation();

    return (
        <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col justify-between h-full">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Flame className="h-5 w-5 text-orange-500" />
                </div>
                <h3 className="text-sm font-medium text-muted-foreground">{t('dashboard.daily_burn_rate')}</h3>
            </div>

            <div className="mt-2">
                <div className="text-2xl font-bold">
                    {loading ? '...' : formatCurrency(averageBurnRate, settings.currency)}
                    <span className="text-xs font-normal text-muted-foreground ml-1">/ {t('reports.range.daily')}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {t('dashboard.burn_rate_desc')}
                </p>
            </div>
        </div>
    );
}
