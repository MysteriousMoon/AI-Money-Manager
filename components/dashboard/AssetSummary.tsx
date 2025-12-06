'use client';

import { useStore } from '@/lib/store';
import { formatCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';

interface AssetDetail {
    id: string;
    name: string;
    startDate: string;
    currentValue: number;
    dailyDep: number;
    originalCurrency: string;
}

interface AssetSummaryProps {
    assets?: AssetDetail[];
    totalAssetValue?: number;
    loading?: boolean;
}

export function AssetSummary({ assets = [], totalAssetValue = 0, loading = false }: AssetSummaryProps) {
    const { settings } = useStore();
    const { t } = useTranslation();

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{t('dashboard.asset_fleet')}</h3>
                <span className="text-sm font-mono text-muted-foreground">
                    {t('common.total')}: {formatCurrency(totalAssetValue, settings.currency)}
                </span>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-muted-foreground border-b">
                            <th className="pb-2 font-medium">{t('common.asset')}</th>
                            <th className="pb-2 font-medium text-right">{t('investments.current_value')}</th>
                            <th className="pb-2 font-medium text-right">{t('common.daily_cost')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map(asset => (
                            <tr key={asset.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                <td className="py-2">
                                    <div className="font-medium">{asset.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {new Date(asset.startDate).getFullYear()}
                                    </div>
                                </td>
                                <td className="py-2 text-right font-mono">
                                    {formatCurrency(asset.currentValue, settings.currency)}
                                </td>
                                <td className="py-2 text-right font-mono text-accrual">
                                    -{formatCurrency(asset.dailyDep, settings.currency)}
                                </td>
                            </tr>
                        ))}
                        {assets.length === 0 && (
                            <tr>
                                <td colSpan={3} className="py-8 text-center text-muted-foreground">
                                    {t('investments.no_assets')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
