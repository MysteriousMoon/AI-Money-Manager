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
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm h-full flex flex-col justify-between group hover:bg-gray-800/50 transition-colors relative overflow-hidden">
            <div className="space-y-2 relative z-10">
                <p className="text-gray-400 text-sm font-medium">{t('dashboard.capital_water_level')}</p>
                <div className="text-3xl font-semibold tracking-tight text-white">
                    {loading ? '...' : formatCurrency(totalNetWorth, settings.currency)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <span className="text-emerald-400 flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />
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
