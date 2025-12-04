'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { Plus, LayoutGrid, List, Truck, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectList } from '@/components/dashboard/ProjectList'; // We might want a more detailed one
import { AssetSummary } from '@/components/dashboard/AssetSummary'; // Similarly, maybe a full table

// We will build inline components for now or refactor if complex
import { formatCurrency } from '@/lib/currency';
import { PageHeader } from '@/components/ui/page-header';
import { ContentContainer } from '@/components/ui/content-container';

import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function ProjectsPage() {
    const { t } = useTranslation();
    const { projects, investments, settings, isLoading } = useStore();

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <LoadingSpinner size={48} />
            </div>
        );
    }

    const activeProjects = projects.filter(p => p.status !== 'COMPLETED' && p.status !== 'CANCELLED');
    const completedProjects = projects.filter(p => p.status === 'COMPLETED');

    const assets = investments.filter(i => i.type === 'ASSET');

    return (
        <ContentContainer>
            <PageHeader
                title={t('dashboard.mission_control')}
                description={t('projects.desc')}
                action={
                    <div className="flex gap-2">
                        <Link href="/projects/new">
                            <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors">
                                <Plus className="h-4 w-4" />
                                {t('projects.new_project')}
                            </button>
                        </Link>
                        <Link href="/assets/new">
                            <button className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md font-medium hover:bg-secondary/80 transition-colors">
                                <Plus className="h-4 w-4" />
                                {t('projects.new_asset')}
                            </button>
                        </Link>
                    </div>
                }
            />

            <Tabs defaultValue="projects" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="projects">{t('projects.tab_projects')}</TabsTrigger>
                    <TabsTrigger value="assets">{t('dashboard.asset_fleet')}</TabsTrigger>
                </TabsList>

                <TabsContent value="projects" className="space-y-6 mt-6">
                    {/* Active Projects Grid */}
                    <section>
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-project" />
                            {t('dashboard.active_missions')}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeProjects.map(project => (
                                <Link href={`/projects/${project.id}`} key={project.id}>
                                    <div className="bg-card border rounded-xl p-5 hover:shadow-md transition-all cursor-pointer group h-full flex flex-col">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${project.type === 'TRIP' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                }`}>
                                                {project.type === 'TRIP' ? t('projects.type.trip') : t('projects.type.event')}
                                            </span>
                                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                                {project.status === 'COMPLETED' ? t('projects.status.completed') : project.status === 'CANCELLED' ? t('projects.status.cancelled') : t('projects.status.active')}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{project.name}</h3>

                                        <div className="mt-auto pt-4 border-t flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">{t('common.budget')}</span>
                                            <span className="font-mono font-medium">{formatCurrency(project.totalBudget || 0, settings.currency)}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                            {activeProjects.length === 0 && (
                                <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                                    {t('projects.no_active')} {t('projects.start_one')}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Completed Projects (Collapsed or List) */}
                    {completedProjects.length > 0 && (
                        <section>
                            <h2 className="text-lg font-semibold mb-4 text-muted-foreground">{t('projects.completed_missions')}</h2>
                            <div className="space-y-2">
                                {completedProjects.map(project => (
                                    <div key={project.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                                                {project.type[0]}
                                            </div>
                                            <div>
                                                <p className="font-medium">{project.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate || '').toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="font-mono text-sm">{formatCurrency(project.totalBudget || 0, settings.currency)}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </TabsContent>

                <TabsContent value="assets" className="space-y-6 mt-6">
                    <section>
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Truck className="h-5 w-5 text-accrual" />
                            {t('investments.type.asset')}
                        </h2>
                        <div className="bg-card border rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr className="text-left">
                                        <th className="p-4 font-medium">{t('assets.table.name')}</th>
                                        <th className="p-4 font-medium">{t('assets.table.purchase_date')}</th>
                                        <th className="p-4 font-medium text-right">{t('assets.table.original_cost')}</th>
                                        <th className="p-4 font-medium text-right">{t('investments.current_value')}</th>
                                        <th className="p-4 font-medium text-right">{t('assets.table.status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assets.map(asset => (
                                        <tr key={asset.id} className="border-t hover:bg-muted/50 transition-colors">
                                            <td className="p-4 font-medium">{asset.name}</td>
                                            <td className="p-4 text-muted-foreground">{new Date(asset.startDate).toLocaleDateString()}</td>
                                            <td className="p-4 text-right font-mono text-muted-foreground">
                                                {formatCurrency(asset.purchasePrice || 0, asset.currencyCode)}
                                            </td>
                                            <td className="p-4 text-right font-mono font-medium">
                                                {formatCurrency(asset.currentAmount || 0, asset.currencyCode)}
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className={`text-xs px-2 py-1 rounded-full ${asset.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {asset.status === 'ACTIVE' ? t('projects.status.active') : asset.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {assets.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                                {t('assets.no_tracked')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </TabsContent>
            </Tabs>
        </ContentContainer>
    );
}
