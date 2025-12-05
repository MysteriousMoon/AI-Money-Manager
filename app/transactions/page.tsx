'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { Trash2, Edit2, Download, ArrowUpDown, ArrowUp, ArrowDown, Scissors, GitBranch } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Transaction } from '@/types';
import { CURRENCIES } from '@/lib/currency';
import { exportTransactions, splitTransaction } from '@/app/actions/transaction';

import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PageHeader } from '@/components/ui/page-header';
import { ContentContainer } from '@/components/ui/content-container';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { SplitTransactionModal } from '@/components/transactions/SplitTransactionModal';

type SortField = 'date' | 'amount' | 'category' | 'merchant';
type SortDirection = 'asc' | 'desc';

// Extracted component to prevent re-renders
const SortButton = ({
    field,
    label,
    currentSortField,
    currentSortDirection,
    onSort
}: {
    field: SortField;
    label: string;
    currentSortField: SortField;
    currentSortDirection: SortDirection;
    onSort: (field: SortField) => void;
}) => (
    <button
        onClick={() => onSort(field)}
        className={cn(
            "flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors",
            currentSortField === field
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
    >
        {label}
        {currentSortField === field ? (
            currentSortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
            <ArrowUpDown className="h-3 w-3 opacity-50" />
        )}
    </button>
);

export default function TransactionsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const transactions = useStore((state) => state.transactions);
    const deleteTransaction = useStore((state) => state.deleteTransaction);
    const categories = useStore((state) => state.categories);
    const accounts = useStore((state) => state.accounts);
    const projects = useStore((state) => state.projects);
    const isLoading = useStore((state) => state.isLoading);
    const updateTransaction = useStore((state) => state.updateTransaction);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Transaction>>({});
    const [splitId, setSplitId] = useState<string | null>(null);

    // Sorting state
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Infinite Scroll State
    const [visibleTransactions, setVisibleTransactions] = useState(20);
    const [visibleDates, setVisibleDates] = useState(5);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Optimize lookups
    const categoryMap = useMemo(() => {
        const map = new Map();
        categories.forEach(c => map.set(c.id, c));
        return map;
    }, [categories]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
        // Reset pagination when sorting changes
        setVisibleTransactions(20);
        setVisibleDates(5);
    };



    const handleEdit = (transaction: typeof transactions[0]) => {
        setEditingId(transaction.id);
    };

    const handleInlineEdit = (transaction: typeof transactions[0]) => {
        setInlineEditingId(transaction.id);
        setEditForm({
            amount: transaction.amount,
            categoryId: transaction.categoryId,
            accountId: transaction.accountId,
            date: transaction.date,
            merchant: transaction.merchant,
            note: transaction.note,
            type: transaction.type,
            currencyCode: transaction.currencyCode,
            projectId: transaction.projectId
        });
    };

    const handleInlineUpdate = async () => {
        if (inlineEditingId && editForm) {
            await updateTransaction(inlineEditingId, editForm);
            setInlineEditingId(null);
            setEditForm({});
        }
    };

    const handleDelete = async (id: string) => {
        await deleteTransaction(id);
        setDeleteId(null);
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
    };

    const getCategoryIcon = (categoryId?: string) => {
        if (!categoryId) return '📝';
        const category = categoryMap.get(categoryId);
        return category?.icon || '📝';
    };

    const getCategoryName = (categoryId?: string) => {
        if (!categoryId) return 'Unknown';
        const category = categoryMap.get(categoryId);
        return category?.name || 'Unknown';
    };

    // v3.0: Split transaction handler
    const handleSplitConfirm = async (splits: { amount: number; categoryId?: string; projectId?: string; note?: string }[]) => {
        if (!splitId) return;
        const result = await splitTransaction(splitId, splits);
        if (result.success) {
            setSplitId(null);
            window.location.reload();
        } else {
            throw new Error(result.error || 'Failed to split transaction');
        }
    };

    // Sort transactions
    const sortedTransactions = useMemo(() => {
        return [...transactions].sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'date':
                    comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                    break;
                case 'amount':
                    comparison = a.amount - b.amount;
                    break;
                case 'category':
                    comparison = getCategoryName(a.categoryId).localeCompare(getCategoryName(b.categoryId));
                    break;
                case 'merchant':
                    comparison = (a.merchant || '').localeCompare(b.merchant || '');
                    break;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [transactions, sortField, sortDirection, categoryMap]);

    // Group sorted transactions by date
    const groupedTransactions = useMemo(() => {
        return sortedTransactions.reduce((groups, transaction) => {
            const date = transaction.date;
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(transaction);
            return groups;
        }, {} as Record<string, typeof transactions>);
    }, [sortedTransactions]);

    const sortedDates = Object.keys(groupedTransactions).sort((a, b) => {
        const comparison = new Date(a).getTime() - new Date(b).getTime();
        return sortDirection === 'asc' && sortField === 'date' ? comparison : -comparison;
    });

    const handleExport = async () => {
        try {
            const result = await exportTransactions();
            if (result.success && result.data) {
                const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert('Failed to export transactions');
            }
        } catch (error) {
            console.error('Export error:', error);
            alert('An error occurred during export');
        }
    };

    const editingTransaction = transactions.find(t => t.id === editingId);

    // Intersection Observer for Infinite Scroll
    const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
        const target = entries[0];
        if (target.isIntersecting) {
            setVisibleTransactions((prev) => prev + 20);
            setVisibleDates((prev) => prev + 5);
        }
    }, []);

    useEffect(() => {
        const option = {
            root: null,
            rootMargin: "20px",
            threshold: 0
        };
        const observer = new IntersectionObserver(handleObserver, option);
        if (loadMoreRef.current) observer.observe(loadMoreRef.current);

        return () => {
            if (loadMoreRef.current) observer.unobserve(loadMoreRef.current); // Clean up on unmount/ref change
            observer.disconnect(); // Good practice to disconnect
        }
    }, [handleObserver]);

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <ContentContainer>
            <PageHeader
                title={t('transactions.title')}
                description={t('transactions.desc')}
                action={
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/10 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        {t('transactions.export')}
                    </button>
                }
            />

            <div className="space-y-4">
                {transactions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        {t('transactions.empty')}
                    </div>
                ) : (
                    <>
                        {/* Desktop: Data Table View */}
                        <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
                            {/* Table Header with Sort Controls */}
                            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-muted/50 text-sm font-medium text-muted-foreground border-b border-border">
                                <div className="col-span-2">
                                    <SortButton field="date" label={t('add.date') || 'Date'} currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} />
                                </div>
                                <div className="col-span-2">
                                    <SortButton field="category" label={t('add.category') || 'Category'} currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} />
                                </div>
                                <div className="col-span-4">
                                    <SortButton field="merchant" label={t('add.merchant') || 'Merchant'} currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} />
                                </div>
                                <div className="col-span-2 flex justify-end">
                                    <SortButton field="amount" label={t('add.amount') || 'Amount'} currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} />
                                </div>
                                <div className="col-span-2 text-right pr-2">
                                    {t('common.actions') || 'Actions'}
                                </div>
                            </div>

                            {/* Table Body */}
                            <div className="divide-y divide-border">
                                {sortedTransactions.slice(0, visibleTransactions).map((transaction) => {
                                    if (inlineEditingId === transaction.id) {
                                        return (
                                            <div key={transaction.id} className="p-4 bg-muted/30 space-y-4">
                                                <div className="grid grid-cols-12 gap-2 items-end">
                                                    <div className="col-span-2">
                                                        <label className="text-xs font-medium text-muted-foreground">{t('add.date')}</label>
                                                        <input
                                                            type="date"
                                                            value={editForm.date || ''}
                                                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="text-xs font-medium text-muted-foreground">{t('add.category')}</label>
                                                        <select
                                                            value={editForm.categoryId || ''}
                                                            onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                                        >
                                                            {categories
                                                                .filter(c => c.type === (editForm.type || transaction.type))
                                                                .map(c => (
                                                                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                                                ))
                                                            }
                                                        </select>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="text-xs font-medium text-muted-foreground">{t('add.merchant')}</label>
                                                        <input
                                                            type="text"
                                                            value={editForm.merchant || ''}
                                                            onChange={(e) => setEditForm({ ...editForm, merchant: e.target.value })}
                                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="text-xs font-medium text-muted-foreground">{t('add.note')}</label>
                                                        <input
                                                            type="text"
                                                            value={editForm.note || ''}
                                                            onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="text-xs font-medium text-muted-foreground">{t('add.project') || '项目'}</label>
                                                        <select
                                                            value={editForm.projectId || ''}
                                                            onChange={(e) => setEditForm({ ...editForm, projectId: e.target.value || undefined })}
                                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                                        >
                                                            <option value="">{t('add.no_project') || '无项目'}</option>
                                                            {projects.map(p => (
                                                                <option key={p.id} value={p.id}>{p.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="text-xs font-medium text-muted-foreground">{t('add.amount')}</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editForm.amount || ''}
                                                            onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                                        />
                                                    </div>
                                                    <div className="col-span-2 flex items-center justify-end gap-2 pb-0.5">
                                                        <button
                                                            onClick={() => setInlineEditingId(null)}
                                                            className="h-9 px-3 text-sm font-medium text-muted-foreground hover:text-foreground border border-input rounded-md"
                                                        >
                                                            {t('transactions.cancel_edit')}
                                                        </button>
                                                        <button
                                                            onClick={handleInlineUpdate}
                                                            className="h-9 px-3 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                                                        >
                                                            {t('transactions.update')}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    const account = accounts.find(a => a.id === transaction.accountId);

                                    return (
                                        <div
                                            key={transaction.id}
                                            className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-muted/50 transition-colors group"
                                        >
                                            {/* Date */}
                                            <div className="col-span-2 text-sm text-muted-foreground">
                                                {(() => {
                                                    try {
                                                        const [year, month, day] = transaction.date.split('-').map(Number);
                                                        const localDate = new Date(year, month - 1, day);
                                                        return format(localDate, 'MM-dd', { locale: t('transactions.date_format') === 'yyyy年M月d日' ? zhCN : enUS });
                                                    } catch {
                                                        return transaction.date;
                                                    }
                                                })()}
                                            </div>

                                            {/* Category */}
                                            <div className="col-span-2 flex items-center gap-2">
                                                <span className="text-lg">{getCategoryIcon(transaction.categoryId)}</span>
                                                <span className="text-sm truncate">{getCategoryName(transaction.categoryId)}</span>
                                            </div>

                                            {/* Merchant & Note */}
                                            <div className="col-span-4">
                                                <div className="text-sm font-medium truncate">
                                                    {transaction.merchant || '-'}
                                                </div>
                                                {transaction.note && (
                                                    <div className="text-xs text-muted-foreground truncate">{transaction.note}</div>
                                                )}
                                            </div>

                                            {/* Amount (right aligned) */}
                                            <div className={cn(
                                                "col-span-2 text-right font-mono text-sm font-medium",
                                                transaction.type === 'EXPENSE' ? "text-red-500" : "text-green-500"
                                            )}>
                                                {transaction.type === 'EXPENSE' ? '-' : '+'}
                                                {CURRENCIES.find(c => c.code === (transaction.currencyCode || 'CNY'))?.symbol}
                                                {transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>

                                            {/* Actions (hidden by default, show on hover) */}
                                            <div className="col-span-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleInlineEdit(transaction)}
                                                    className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-muted transition-colors"
                                                    aria-label="Edit"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                {/* v3.0: Split button - only for expenses that aren't already split */}
                                                {transaction.type === 'EXPENSE' && !transaction.note?.includes('[SPLIT]') && (
                                                    <button
                                                        onClick={() => setSplitId(transaction.id)}
                                                        className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-muted transition-colors"
                                                        aria-label="Split"
                                                        title={t('transactions.split')}
                                                    >
                                                        <Scissors className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteClick(transaction.id)}
                                                    className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-muted transition-colors"
                                                    aria-label="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Mobile: Compact Card View */}
                        <div className="md:hidden space-y-1">
                            {/* Mobile Sort Controls */}
                            <div className="flex items-center gap-2 flex-wrap mb-3 px-1">
                                <span className="text-xs text-muted-foreground">{t('common.sort_by')}:</span>
                                <SortButton field="date" label={t('add.date') || 'Date'} currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} />
                                <SortButton field="category" label={t('add.category') || 'Category'} currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} />
                                <SortButton field="merchant" label={t('add.merchant') || 'Merchant'} currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} />
                                <SortButton field="amount" label={t('add.amount') || 'Amount'} currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} />
                            </div>

                            {/* 当按日期排序时，使用日期分组视图 */}
                            {sortField === 'date' ? (
                                sortedDates.slice(0, visibleDates).map((date) => (
                                    <div key={date}>
                                        <h2 className="text-xs font-medium text-muted-foreground sticky top-0 bg-background/95 py-2 px-1 z-10 backdrop-blur-sm">
                                            {(() => {
                                                try {
                                                    const [year, month, day] = date.split('-').map(Number);
                                                    const localDate = new Date(year, month - 1, day);
                                                    return format(localDate, t('transactions.date_format') === 'yyyy年M月d日' ? 'M月d日' : 'MMM d', {
                                                        locale: t('transactions.date_format') === 'yyyy年M月d日' ? zhCN : enUS
                                                    });
                                                } catch {
                                                    return date;
                                                }
                                            })()}
                                        </h2>
                                        <div className="divide-y divide-border">
                                            {groupedTransactions[date].map((transaction) => {
                                                if (inlineEditingId === transaction.id) {
                                                    return (
                                                        <div key={transaction.id} className="p-3 bg-muted/30 space-y-3">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <label className="text-xs text-muted-foreground">{t('add.date')}</label>
                                                                    <input
                                                                        type="date"
                                                                        value={editForm.date || ''}
                                                                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                                                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-muted-foreground">{t('add.category')}</label>
                                                                    <select
                                                                        value={editForm.categoryId || ''}
                                                                        onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                                                                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                                                                    >
                                                                        {categories.filter(c => c.type === (editForm.type || transaction.type)).map(c => (
                                                                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-muted-foreground">{t('add.merchant')}</label>
                                                                    <input
                                                                        type="text"
                                                                        value={editForm.merchant || ''}
                                                                        onChange={(e) => setEditForm({ ...editForm, merchant: e.target.value })}
                                                                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-muted-foreground">{t('add.note')}</label>
                                                                    <input
                                                                        type="text"
                                                                        value={editForm.note || ''}
                                                                        onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                                                                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                                                                    />
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <label className="text-xs text-muted-foreground">{t('add.project') || '项目'}</label>
                                                                    <select
                                                                        value={editForm.projectId || ''}
                                                                        onChange={(e) => setEditForm({ ...editForm, projectId: e.target.value || undefined })}
                                                                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                                                                    >
                                                                        <option value="">{t('add.no_project') || '无项目'}</option>
                                                                        {projects.map(p => (
                                                                            <option key={p.id} value={p.id}>{p.name}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <label className="text-xs text-muted-foreground">{t('add.amount')}</label>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={editForm.amount || ''}
                                                                        onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                                                                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => setInlineEditingId(null)} className="flex-1 h-8 text-xs border rounded-md">
                                                                    {t('transactions.cancel_edit')}
                                                                </button>
                                                                <button onClick={handleInlineUpdate} className="flex-1 h-8 text-xs bg-primary text-primary-foreground rounded-md">
                                                                    {t('transactions.update')}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div
                                                        key={transaction.id}
                                                        className="flex items-center justify-between py-2.5 px-1"
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <span className="text-lg shrink-0">{getCategoryIcon(transaction.categoryId)}</span>
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-medium truncate">
                                                                    {transaction.merchant || getCategoryName(transaction.categoryId)}
                                                                </div>
                                                                {transaction.note && (
                                                                    <div className="text-xs text-muted-foreground truncate">{transaction.note}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <span className={cn(
                                                                "text-sm font-mono font-medium",
                                                                transaction.type === 'EXPENSE' ? "text-red-500" : "text-green-500"
                                                            )}>
                                                                {transaction.type === 'EXPENSE' ? '-' : '+'}
                                                                {CURRENCIES.find(c => c.code === (transaction.currencyCode || 'CNY'))?.symbol}
                                                                {transaction.amount.toFixed(2)}
                                                            </span>
                                                            <button
                                                                onClick={() => handleInlineEdit(transaction)}
                                                                className="p-1.5 text-muted-foreground"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </button>
                                                            {transaction.type === 'EXPENSE' && !transaction.note?.includes('[SPLIT]') && (
                                                                <button
                                                                    onClick={() => setSplitId(transaction.id)}
                                                                    className="p-1.5 text-muted-foreground"
                                                                    title={t('transactions.split')}
                                                                >
                                                                    <Scissors className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDeleteClick(transaction.id)}
                                                                className="p-1.5 text-muted-foreground hover:text-destructive"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                /* 当按其他字段排序时，使用平铺列表视图 */
                                <div className="divide-y divide-border">
                                    {sortedTransactions.slice(0, visibleTransactions).map((transaction) => {
                                        if (inlineEditingId === transaction.id) {
                                            return (
                                                <div key={transaction.id} className="p-3 bg-muted/30 space-y-3">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-xs text-muted-foreground">{t('add.date')}</label>
                                                            <input
                                                                type="date"
                                                                value={editForm.date || ''}
                                                                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                                                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-muted-foreground">{t('add.category')}</label>
                                                            <select
                                                                value={editForm.categoryId || ''}
                                                                onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                                                                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                                                            >
                                                                {categories.filter(c => c.type === (editForm.type || transaction.type)).map(c => (
                                                                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-muted-foreground">{t('add.merchant')}</label>
                                                            <input
                                                                type="text"
                                                                value={editForm.merchant || ''}
                                                                onChange={(e) => setEditForm({ ...editForm, merchant: e.target.value })}
                                                                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-muted-foreground">{t('add.note')}</label>
                                                            <input
                                                                type="text"
                                                                value={editForm.note || ''}
                                                                onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                                                                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                                                            />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="text-xs text-muted-foreground">{t('add.project') || '项目'}</label>
                                                            <select
                                                                value={editForm.projectId || ''}
                                                                onChange={(e) => setEditForm({ ...editForm, projectId: e.target.value || undefined })}
                                                                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                                                            >
                                                                <option value="">{t('add.no_project') || '无项目'}</option>
                                                                {projects.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="text-xs text-muted-foreground">{t('add.amount')}</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={editForm.amount || ''}
                                                                onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                                                                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setInlineEditingId(null)} className="flex-1 h-8 text-xs border rounded-md">
                                                            {t('transactions.cancel_edit')}
                                                        </button>
                                                        <button onClick={handleInlineUpdate} className="flex-1 h-8 text-xs bg-primary text-primary-foreground rounded-md">
                                                            {t('transactions.update')}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div
                                                key={transaction.id}
                                                className="flex items-center justify-between py-2.5 px-1"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className="text-lg shrink-0">{getCategoryIcon(transaction.categoryId)}</span>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-medium truncate">
                                                            {transaction.merchant || getCategoryName(transaction.categoryId)}
                                                        </div>
                                                        {/* 非日期排序时，显示日期作为副信息 */}
                                                        <div className="text-xs text-muted-foreground truncate">
                                                            {(() => {
                                                                try {
                                                                    const [year, month, day] = transaction.date.split('-').map(Number);
                                                                    const localDate = new Date(year, month - 1, day);
                                                                    return format(localDate, 'MM-dd', { locale: t('transactions.date_format') === 'yyyy年M月d日' ? zhCN : enUS });
                                                                } catch {
                                                                    return transaction.date;
                                                                }
                                                            })()}
                                                            {transaction.note && ` · ${transaction.note}`}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <span className={cn(
                                                        "text-sm font-mono font-medium",
                                                        transaction.type === 'EXPENSE' ? "text-red-500" : "text-green-500"
                                                    )}>
                                                        {transaction.type === 'EXPENSE' ? '-' : '+'}
                                                        {CURRENCIES.find(c => c.code === (transaction.currencyCode || 'CNY'))?.symbol}
                                                        {transaction.amount.toFixed(2)}
                                                    </span>
                                                    <button
                                                        onClick={() => handleInlineEdit(transaction)}
                                                        className="p-1.5 text-muted-foreground"
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </button>
                                                    {transaction.type === 'EXPENSE' && !transaction.note?.includes('[SPLIT]') && (
                                                        <button
                                                            onClick={() => setSplitId(transaction.id)}
                                                            className="p-1.5 text-muted-foreground"
                                                            title={t('transactions.split')}
                                                        >
                                                            <Scissors className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteClick(transaction.id)}
                                                        className="p-1.5 text-muted-foreground hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Sentinel for Infinite Scroll */}
                        <div ref={loadMoreRef} className="h-4 w-full" />
                    </>
                )}
            </div>

            {/* Edit Modal */}
            <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('transactions.edit_title') || 'Edit Transaction'}</DialogTitle>
                    </DialogHeader>
                    {editingTransaction && (
                        <TransactionForm
                            key={editingTransaction.id}
                            mode="edit"
                            initialData={editingTransaction}
                            onSuccess={() => setEditingId(null)}
                            onCancel={() => setEditingId(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-lg space-y-4 animate-in zoom-in-95">
                        <h2 className="text-lg font-bold">{t('transactions.confirm_delete')}</h2>
                        <div className="flex justify-end gap-2 pt-4">
                            <button
                                type="button"
                                onClick={() => setDeleteId(null)}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                            >
                                {t('transactions.cancel_edit')}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDelete(deleteId)}
                                className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* v3.0: Split Transaction Modal */}
            {splitId && (
                <SplitTransactionModal
                    transaction={transactions.find(t => t.id === splitId)!}
                    categories={categories}
                    projects={projects}
                    onClose={() => setSplitId(null)}
                    onConfirm={handleSplitConfirm}
                />
            )}
        </ContentContainer>
    );
}