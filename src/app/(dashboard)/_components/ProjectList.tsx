'use client';

import { useStore } from '@/lib/store';
import { formatCurrency } from '@/lib/currency';
import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { useTranslation } from '@/lib/i18n';

export function ProjectList() {
    const { projects, settings } = useStore();
    const { t } = useTranslation();

    const activeProjects = useMemo(() => {
        return projects
            .filter(p => p.status === 'ACTIVE' || p.status === 'PLANNED')
            .slice(0, 3);
    }, [projects]);

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{t('dashboard.mission_control')}</h3>
                <Link href="/projects" className="text-xs text-primary hover:underline flex items-center gap-1">
                    {t('dashboard.view_all')} <ArrowRight className="h-3 w-3" />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeProjects.map(project => (
                    <div key={project.id} className="bg-muted/30 border rounded-lg p-4 flex flex-col gap-2 hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-sm ${project.type === 'TRIP' ? 'bg-project/20 text-project' : 'bg-primary/20 text-primary'
                                    }`}>
                                    {project.type}
                                </span>
                                <h4 className="font-bold mt-1">{project.name}</h4>
                            </div>
                            {/* Progress Circle or Status Icon could go here */}
                        </div>

                        <div className="mt-auto pt-2 space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{t('common.budget')}</span>
                                <span className="font-mono">{formatCurrency(project.totalBudget || 0, settings.currency)}</span>
                            </div>
                            {/* We need actual spent amount. Currently Project model doesn't have it directly.
                        We would need to calculate it from transactions. 
                        For now, placeholder or simple calculation if we had transactions.
                    */}
                            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                                <div className="bg-project h-full w-1/3" /> {/* Placeholder width */}
                            </div>
                        </div>
                    </div>
                ))}
                {activeProjects.length === 0 && (
                    <div className="col-span-3 py-8 text-center text-muted-foreground border border-dashed rounded-lg">
                        {t('projects.no_active')} <Link href="/projects/new" className="text-primary hover:underline">{t('projects.start_one')}</Link>
                    </div>
                )}
            </div>
        </div>
    );
}
