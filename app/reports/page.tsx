'use client';

import { useMemo, useState, useEffect } from 'react';
import { useStore } from '@/lib/store';

import { useTranslation } from '@/lib/i18n';
import { getMeIncMetrics } from '@/app/actions/dashboard';
import { formatLocalDate } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SurvivalChart } from '@/components/dashboard/SurvivalChart';
import { LifestyleChart } from '@/components/dashboard/LifestyleChart';
import { SmartPnLChart } from '@/components/dashboard/SmartPnLChart';
import { AssetSummary } from '@/components/dashboard/AssetSummary';
import { ProjectList } from '@/components/dashboard/ProjectList';
import { PageHeader } from '@/components/ui/page-header';
import { ContentContainer } from '@/components/ui/content-container';

export default function Dashboard() {
    const { settings, isLoading } = useStore();
    const { t } = useTranslation();

    const [metrics, setMetrics] = useState<any>(null);
    const [loadingMetrics, setLoadingMetrics] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            setLoadingMetrics(true);
            const now = new Date();
            // Fetch last 30 days for charts using local dates
            const startDate = formatLocalDate(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()));
            const endDate = formatLocalDate(now);

            try {
                const response = await getMeIncMetrics(startDate, endDate);
                if (response.success && response.data) {
                    setMetrics(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch metrics:', error);
            } finally {
                setLoadingMetrics(false);
            }
        };
        fetchMetrics();
    }, []);

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <ContentContainer>
            <PageHeader
                title={t('nav.reports')}
                description={new Date().toLocaleDateString(settings.language === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            />

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

                {/* Row 1: The Daily Pulse (Hero) */}
                <div className="col-span-1 md:col-span-6 lg:col-span-6 h-[300px] bg-card border rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 blur-3xl pointer-events-none" />
                    {loadingMetrics ? <LoadingSpinner /> : <SurvivalChart data={metrics?.dailySeries || []} runwayMonths={metrics?.runwayMonths} currentCapital={metrics?.currentCapital} />}
                </div>

                <div className="col-span-1 md:col-span-6 lg:col-span-6 h-[300px] bg-card border rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-24 bg-rose-500/5 rounded-full -mr-12 -mt-12 blur-3xl pointer-events-none" />
                    {loadingMetrics ? <LoadingSpinner /> : <LifestyleChart data={metrics?.dailySeries || []} />}
                </div>

                {/* Row 2: Me Inc. Report & Assets */}
                <div className="col-span-1 md:col-span-12 lg:col-span-8 h-[400px] bg-card border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                    {loadingMetrics ? <LoadingSpinner /> : <SmartPnLChart data={metrics?.dailySeries || []} />}
                </div>

                <div className="col-span-1 md:col-span-12 lg:col-span-4 h-[400px] bg-card border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                    <AssetSummary
                        assets={metrics?.assetDetails || []}
                        totalAssetValue={metrics?.totalFixedAssets || 0}
                        loading={loadingMetrics}
                    />
                </div>

                {/* Row 3: Mission Control */}
                <div className="col-span-1 md:col-span-12 bg-card border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                    <ProjectList />
                </div>

            </div>
        </ContentContainer>
    );
}
