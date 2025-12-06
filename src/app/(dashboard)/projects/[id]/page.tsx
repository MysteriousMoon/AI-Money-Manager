'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { formatCurrency } from '@/lib/currency';
import { getProjectById, getProjectStats } from '@/app/actions/project';
import {
    ArrowLeft,
    Edit2,
    Trash2,
    Calendar,
    TrendingUp,
    TrendingDown,
    DollarSign,
    PieChart,
    Clock,
    Target,
    Briefcase,
    Plane,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { WaterfallChart } from '@/components/charts/WaterfallChart';

interface ProjectStats {
    projectId: string;
    projectType: string;
    baseCurrency: string; // Currency all amounts are converted to
    totalExpenses: number;
    totalIncome: number;
    totalTransfers: number;
    totalDepreciation: number;
    netResult: number;
    transactionCount: number;
    assetCount: number;
    budget: number | null;
    budgetUtilization: number | null;
    budgetRemaining: number | null;
    projectDays: number | null;
    amortizedDailyCost: number | null;
    roi: number | null;
}

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useTranslation();
    const { settings, deleteProject, categories, accounts } = useStore();

    const [project, setProject] = useState<any>(null);
    const [stats, setStats] = useState<ProjectStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    const projectId = params.id as string;

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const [projRes, statsRes] = await Promise.all([
                    getProjectById(projectId),
                    getProjectStats(projectId)
                ]);

                if (projRes.success && projRes.data) {
                    setProject(projRes.data);
                }
                if (statsRes.success && statsRes.data) {
                    setStats(statsRes.data);
                }
            } catch (error) {
                console.error('Failed to fetch project:', error);
            } finally {
                setLoading(false);
            }
        }

        if (projectId) {
            fetchData();
        }
    }, [projectId]);

    const handleDelete = async () => {
        if (!confirm(t('projects.confirm_delete'))) return;

        setDeleting(true);
        try {
            await deleteProject(projectId);
            router.push('/projects');
        } catch (error) {
            console.error('Failed to delete project:', error);
        } finally {
            setDeleting(false);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'TRIP': return <Plane className="h-5 w-5" />;
            case 'JOB': return <Briefcase className="h-5 w-5" />;
            case 'SIDE_HUSTLE': return <Sparkles className="h-5 w-5" />;
            default: return <Calendar className="h-5 w-5" />;
        }
    };

    const getTypeBadgeStyle = (type: string) => {
        switch (type) {
            case 'TRIP': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
            case 'JOB': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
            case 'SIDE_HUSTLE': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <LoadingSpinner size={48} />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="container max-w-4xl mx-auto p-4 pb-24">
                <div className="text-center py-12">
                    <p className="text-muted-foreground">{t('projects.not_found')}</p>
                    <Link href="/projects" className="text-primary hover:underline mt-2 inline-block">
                        {t('common.back')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container max-w-4xl mx-auto p-4 pb-24 md:pt-8 space-y-6">
            {/* Header */}
            <header className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <Link href="/projects" className="p-2 hover:bg-muted rounded-full transition-colors mt-1">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={cn("text-xs uppercase tracking-wider font-bold px-2 py-1 rounded-full flex items-center gap-1", getTypeBadgeStyle(project.type))}>
                                {getTypeIcon(project.type)}
                                {t(`projects.type.${project.type.toLowerCase()}`)}
                            </span>
                            <span className={cn(
                                "text-xs px-2 py-1 rounded-full",
                                project.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-muted text-muted-foreground'
                            )}>
                                {t(`projects.status.${project.status.toLowerCase()}`)}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold">{project.name}</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {project.startDate} → {project.endDate || t('projects.ongoing')}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => router.push(`/projects/${projectId}/edit`)}
                        className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground"
                    >
                        <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="p-2 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </header>

            {/* Budget Progress */}
            {stats?.budget && (
                <div className="bg-card border rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium flex items-center gap-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            {t('projects.budget_progress')}
                        </span>
                        <span className="text-sm">
                            <span className="font-mono font-bold">{formatCurrency(stats.totalExpenses, stats?.baseCurrency || settings.currency)}</span>
                            <span className="text-muted-foreground"> / {formatCurrency(stats.budget, stats?.baseCurrency || settings.currency)}</span>
                        </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all",
                                (stats.budgetUtilization || 0) > 100 ? 'bg-destructive' :
                                    (stats.budgetUtilization || 0) > 80 ? 'bg-amber-500' : 'bg-primary'
                            )}
                            style={{ width: `${Math.min(stats.budgetUtilization || 0, 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{(stats.budgetUtilization || 0).toFixed(1)}% {t('projects.used')}</span>
                        <span>{formatCurrency(stats.budgetRemaining || 0, stats?.baseCurrency || settings.currency)} {t('projects.remaining')}</span>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border rounded-xl p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <TrendingDown className="h-4 w-4" />
                        <span className="text-xs font-medium">{t('projects.total_expenses')}</span>
                    </div>
                    <p className="text-xl font-bold text-rose-500">
                        {formatCurrency(stats?.totalExpenses || 0, stats?.baseCurrency || settings.currency)}
                    </p>
                </div>

                <div className="bg-card border rounded-xl p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-xs font-medium">{t('projects.total_income')}</span>
                    </div>
                    <p className="text-xl font-bold text-emerald-500">
                        {formatCurrency(stats?.totalIncome || 0, stats?.baseCurrency || settings.currency)}
                    </p>
                </div>

                <div className="bg-card border rounded-xl p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-xs font-medium">{t('projects.net_result')}</span>
                    </div>
                    <p className={cn("text-xl font-bold", (stats?.netResult || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                        {formatCurrency(stats?.netResult || 0, stats?.baseCurrency || settings.currency)}
                    </p>
                </div>

                <div className="bg-card border rounded-xl p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <PieChart className="h-4 w-4" />
                        <span className="text-xs font-medium">{t('projects.transactions')}</span>
                    </div>
                    <p className="text-xl font-bold">
                        {stats?.transactionCount || 0}
                    </p>
                </div>
            </div>

            {/* Amortization Card (for TRIP/EVENT) */}
            {(project.type === 'TRIP' || project.type === 'EVENT') && stats?.projectDays && (
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-500" />
                        {t('projects.cost_amortization')}
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {stats.projectDays}
                            </p>
                            <p className="text-xs text-muted-foreground">{t('projects.days')}</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {formatCurrency(stats.totalExpenses, stats?.baseCurrency || settings.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">{t('projects.total_cost')}</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {formatCurrency(stats.amortizedDailyCost || 0, stats?.baseCurrency || settings.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">{t('projects.daily_cost')}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ROI Card (for JOB/SIDE_HUSTLE) */}
            {(project.type === 'JOB' || project.type === 'SIDE_HUSTLE') && stats && (
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-amber-500" />
                        {t('projects.profit_loss')}
                    </h3>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('projects.revenue')}</span>
                            <span className="font-mono text-emerald-500">+{formatCurrency(stats.totalIncome, stats?.baseCurrency || settings.currency)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('projects.direct_costs')}</span>
                            <span className="font-mono text-rose-500">-{formatCurrency(stats.totalExpenses, stats?.baseCurrency || settings.currency)}</span>
                        </div>
                        {stats.totalDepreciation > 0 && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('projects.depreciation')}</span>
                                <span className="font-mono text-purple-500">-{formatCurrency(stats.totalDepreciation, stats?.baseCurrency || settings.currency)}</span>
                            </div>
                        )}
                        <div className="border-t pt-2 flex justify-between font-bold">
                            <span>{t('projects.net_profit')}</span>
                            <span className={cn("font-mono", stats.netResult >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                                {stats.netResult >= 0 ? '+' : ''}{formatCurrency(stats.netResult, stats?.baseCurrency || settings.currency)}
                            </span>
                        </div>
                        {stats.roi !== null && (
                            <div className="text-center pt-2">
                                <span className="text-sm text-muted-foreground">ROI: </span>
                                <span className={cn("font-bold", stats.roi >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                                    {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%
                                </span>
                            </div>
                        )}
                    </div>

                    {/* v3.0: Waterfall Chart */}
                    {(stats.totalIncome > 0 || stats.totalExpenses > 0) && (
                        <div className="mt-4 pt-4 border-t">
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                {t('projects.pnl_breakdown') || 'P&L Breakdown'}
                            </h4>
                            <WaterfallChart
                                income={stats.totalIncome}
                                expenses={stats.totalExpenses}
                                depreciation={stats.totalDepreciation}
                                currencyCode={stats.baseCurrency}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Transactions List */}
            <div className="bg-card border rounded-xl overflow-hidden">
                <div className="p-4 border-b">
                    <h3 className="font-semibold">{t('projects.linked_transactions')}</h3>
                </div>
                <div className="divide-y max-h-[400px] overflow-y-auto">
                    {project.transactions?.length > 0 ? (
                        project.transactions.map((tx: any) => {
                            const category = categories.find(c => c.id === tx.categoryId);
                            const account = accounts.find(a => a.id === tx.accountId);
                            return (
                                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                            {category?.icon || '📝'}
                                        </div>
                                        <div>
                                            <p className="font-medium">{tx.merchant || tx.note || category?.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {tx.date} • {account?.name}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "font-mono font-bold",
                                        tx.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'
                                    )}>
                                        {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount, tx.currencyCode)}
                                    </span>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center text-muted-foreground">
                            {t('projects.no_transactions')}
                        </div>
                    )}
                </div>
            </div>

            {/* Linked Assets */}
            {project.investments?.length > 0 && (
                <div className="bg-card border rounded-xl overflow-hidden">
                    <div className="p-4 border-b">
                        <h3 className="font-semibold">{t('projects.linked_assets')}</h3>
                    </div>
                    <div className="divide-y">
                        {project.investments.map((inv: any) => (
                            <div key={inv.id} className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{inv.name}</p>
                                    <p className="text-xs text-muted-foreground">{inv.type}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono">{formatCurrency(inv.currentAmount || inv.initialAmount, inv.currencyCode)}</p>
                                    {inv.purchasePrice && inv.currentAmount && (
                                        <p className="text-xs text-muted-foreground">
                                            {t('projects.depreciated')}: {formatCurrency(inv.purchasePrice - inv.currentAmount, inv.currencyCode)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
