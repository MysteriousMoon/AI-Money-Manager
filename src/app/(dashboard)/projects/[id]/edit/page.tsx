'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { getProjectById } from '@/app/actions/project';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function EditProjectPage() {
    const router = useRouter();
    const params = useParams();
    const { updateProject, settings } = useStore();
    const { t } = useTranslation();
    const projectId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState('');
    const [type, setType] = useState('TRIP');
    const [status, setStatus] = useState('ACTIVE');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [totalBudget, setTotalBudget] = useState('');

    useEffect(() => {
        async function fetchProject() {
            setLoading(true);
            try {
                const res = await getProjectById(projectId);
                if (res.success && res.data) {
                    const project = res.data;
                    setName(project.name);
                    setType(project.type);
                    setStatus(project.status);
                    setStartDate(project.startDate);
                    setEndDate(project.endDate || '');
                    setTotalBudget(project.totalBudget?.toString() || '');
                }
            } catch (error) {
                console.error('Failed to fetch project:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchProject();
    }, [projectId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            await updateProject(projectId, {
                name,
                type,
                status,
                startDate,
                endDate: endDate || null,
                totalBudget: totalBudget ? parseFloat(totalBudget) : null
            });
            router.push(`/projects/${projectId}`);
        } catch (error) {
            console.error('Failed to update project:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <LoadingSpinner size={48} />
            </div>
        );
    }

    return (
        <div className="container max-w-2xl mx-auto p-4 pb-24 md:pt-24 space-y-6">
            <header className="flex items-center gap-4">
                <Link href={`/projects/${projectId}`} className="p-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">{t('projects.edit_mission') || '编辑项目'}</h1>
                    <p className="text-muted-foreground">{t('projects.edit_mission_desc') || '修改项目信息'}</p>
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
                        disabled={saving}
                        className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? (t('common.saving') || '保存中...') : (t('projects.save_changes') || '保存修改')}
                    </button>
                </div>
            </form>
        </div>
    );
}
