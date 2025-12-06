'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { ArrowLeft, Save, Calendar, Briefcase, Plane, Camera } from 'lucide-react';
import Link from 'next/link';

export default function NewProjectPage() {
    const router = useRouter();
    const { addProject, settings } = useStore();
    const { t } = useTranslation();

    const [name, setName] = useState('');
    const [type, setType] = useState('TRIP');
    const [status, setStatus] = useState('ACTIVE');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState('');
    const [totalBudget, setTotalBudget] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        await addProject({
            name,
            type,
            status,
            startDate,
            endDate: endDate || null,
            totalBudget: totalBudget ? parseFloat(totalBudget) : null
        });

        router.push('/projects');
    };

    return (
        <div className="container max-w-2xl mx-auto p-4 pb-24 md:pt-24 space-y-6">
            <header className="flex items-center gap-4">
                <Link href="/projects" className="p-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">{t('projects.new_mission')}</h1>
                    <p className="text-muted-foreground">{t('projects.new_mission_desc')}</p>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6 bg-card border rounded-xl p-6 shadow-sm">
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1.5 block">{t('projects.project_name')}</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('projects.project_name_placeholder')}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">{t('projects.type')}</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="TRIP">{t('projects.type.trip')}</option>
                                <option value="WORK">{t('projects.type.work')}</option>
                                <option value="JOB">{t('projects.type.job')}</option>
                                <option value="SIDE_HUSTLE">{t('projects.type.side_hustle')}</option>
                                <option value="EVENT">{t('projects.type.event')}</option>
                                <option value="OTHER">{t('projects.type.other')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">{t('projects.status')}</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="ACTIVE">{t('projects.status.active')}</option>
                                <option value="PLANNED">{t('projects.status.planned')}</option>
                                <option value="COMPLETED">{t('projects.status.completed')}</option>
                                <option value="ARCHIVED">{t('projects.status.archived')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">{t('projects.start_date')}</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">{t('projects.end_date')}</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1.5 block">{t('projects.total_budget')} ({settings.currency})</label>
                        <input
                            type="number"
                            value={totalBudget}
                            onChange={(e) => setTotalBudget(e.target.value)}
                            placeholder="0.00"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        {t('projects.create_mission')}
                    </button>
                </div>
            </form>
        </div>
    );
}

