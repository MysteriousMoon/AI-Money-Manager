'use client';

import { useMemo, useState, useEffect } from 'react';
import { useStore } from '@/lib/store';

import { useTranslation } from '@/lib/i18n';
import { getMeIncMetrics } from '@/app/actions/dashboard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SurvivalChart } from '@/components/dashboard/SurvivalChart';
import { LifestyleChart } from '@/components/dashboard/LifestyleChart';
import { SmartPnLChart } from '@/components/dashboard/SmartPnLChart';
import { AssetSummary } from '@/components/dashboard/AssetSummary';
import { ProjectList } from '@/components/dashboard/ProjectList';

export default function Dashboard() {
    const { settings, isLoading } = useStore();
    const { t } = useTranslation();

    const [metrics, setMetrics] = useState<any>(null);
    const [loadingMetrics, setLoadingMetrics] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            setLoadingMetrics(true);
            const now = new Date();
            // Fetch last 30 days for charts
            const startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().split('T')[0];
            const endDate = now.toISOString().split('T')[0];

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
        <div className="container mx-auto p-4 pb-24 md:pt-24 space-y-6 max-w-7xl">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
                    <p className="text-muted-foreground">
                        {new Date().toLocaleDateString(settings.language === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>

            </header>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

                {/* Row 1: The Daily Pulse (Hero) */}
                <div className="col-span-1 md:col-span-6 lg:col-span-6 h-[300px] bg-card border rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 blur-3xl pointer-events-none" />
                    {loadingMetrics ? <LoadingSpinner /> : <SurvivalChart data={metrics?.dailySeries || []} />}
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
                    <AssetSummary />
                </div>

                {/* Row 3: Mission Control */}
                <div className="col-span-1 md:col-span-12 bg-card border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                    <ProjectList />
                </div>

            </div>
        </div>
    );
}
