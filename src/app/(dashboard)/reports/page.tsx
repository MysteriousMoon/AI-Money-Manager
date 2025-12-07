'use client';

import { useMemo, useState, useEffect } from 'react';
import { useStore } from '@/lib/store';

import { useTranslation } from '@/lib/i18n';
import { getMeIncMetrics } from '@/app/actions/dashboard';
import { formatLocalDate } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SurvivalChart } from '@/app/(dashboard)/_components/SurvivalChart';
import { LifestyleChart } from '@/app/(dashboard)/_components/LifestyleChart';
import { SmartPnLChart } from '@/app/(dashboard)/_components/SmartPnLChart';
import { AssetSummary } from '@/app/(dashboard)/_components/AssetSummary';
import { ProjectList } from '@/app/(dashboard)/_components/ProjectList';
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
            // Fetch 1 year of data to support 3M, YTD, and Yearly views
            const startDate = formatLocalDate(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
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

            {/* 栅格布局 (Bento Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

                {/* 第一行: 每日脉搏 (核心指标) */}
                <div className="col-span-1 md:col-span-6 lg:col-span-6 h-[300px] bg-card border rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 blur-3xl pointer-events-none" />
                    {loadingMetrics ? <LoadingSpinner /> : <SurvivalChart data={metrics?.dailySeries || []} runwayMonths={metrics?.runwayMonths} currentCapital={metrics?.cashOnly} />}
                </div>

                <div className="col-span-1 md:col-span-6 lg:col-span-6 h-[300px] bg-card border rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-24 bg-rose-500/5 rounded-full -mr-12 -mt-12 blur-3xl pointer-events-none" />
                    {loadingMetrics ? <LoadingSpinner /> : <LifestyleChart data={metrics?.dailySeries || []} />}
                </div>

                {/* 第二行: Me Inc. 报表 & 资产概览 */}
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

                {/* 第三行: 任务控制中心 */}
                <div className="col-span-1 md:col-span-12 bg-card border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                    <ProjectList />
                </div>

            </div>
        </ContentContainer>
    );
}
