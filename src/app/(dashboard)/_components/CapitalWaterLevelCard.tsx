'use client';

import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import { Settings } from '@/types';

interface CapitalWaterLevelCardProps {
    totalNetWorth: number;
    settings: Settings;
    loading: boolean;
}

export function CapitalWaterLevelCard({ totalNetWorth, settings, loading }: CapitalWaterLevelCardProps) {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 md:p-6 shadow-sm h-full flex flex-col justify-between group hover:shadow-md dark:hover:bg-gray-800/50 transition-all relative overflow-hidden">
            <div className="space-y-1 md:space-y-2 relative z-10">
                <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium">{t('dashboard.capital_water_level')}</p>
                <div className="text-xl md:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                    {loading ? '...' : formatCurrency(totalNetWorth, settings.currency)}
                </div>
                <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs text-muted-foreground mt-1 md:mt-2">
                    <span className="text-emerald-400 flex items-center">
                        <TrendingUp className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                        +5.2%
                    </span>
                    <span>{t('dashboard.capital_desc')}</span>
                </div>
            </div>

            {/* Decorative Element */}
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-emerald-500/10 to-transparent rounded-tl-full pointer-events-none" />
        </div>
    );
}
