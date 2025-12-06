'use client';

import { useState, useMemo } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Transaction, Category, Project } from '@/types';
import { cn } from '@/lib/utils';

interface SplitItem {
    id: string;
    amount: string;
    categoryId: string;
    projectId: string;
    note: string;
}

interface SplitTransactionModalProps {
    transaction: Transaction;
    categories: Category[];
    projects: Project[];
    onClose: () => void;
    onConfirm: (splits: { amount: number; categoryId?: string; projectId?: string; note?: string }[]) => Promise<void>;
}

export function SplitTransactionModal({
    transaction,
    categories,
    projects,
    onClose,
    onConfirm,
}: SplitTransactionModalProps) {
    const { t } = useTranslation();
    const [splits, setSplits] = useState<SplitItem[]>([
        {
            id: '1',
            amount: (transaction.amount / 2).toFixed(2),
            categoryId: transaction.categoryId || '',
            projectId: '',
            note: '',
        },
        {
            id: '2',
            amount: (transaction.amount / 2).toFixed(2),
            categoryId: transaction.categoryId || '',
            projectId: '',
            note: '',
        },
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const totalSplit = useMemo(() => {
        return splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    }, [splits]);

    const remaining = transaction.amount - totalSplit;
    const isValid = Math.abs(remaining) < 0.01;

    const expenseCategories = categories.filter(c => c.type === 'EXPENSE');
    const activeProjects = projects.filter(p => p.status === 'ACTIVE');

    const addSplit = () => {
        setSplits([
            ...splits,
            {
                id: Date.now().toString(),
                amount: remaining > 0 ? remaining.toFixed(2) : '0',
                categoryId: transaction.categoryId || '',
                projectId: '',
                note: '',
            },
        ]);
    };

    const removeSplit = (id: string) => {
        if (splits.length > 2) {
            setSplits(splits.filter(s => s.id !== id));
        }
    };

    const updateSplit = (id: string, field: keyof SplitItem, value: string) => {
        setSplits(splits.map(s => (s.id === id ? { ...s, [field]: value } : s)));
        setError('');
    };

    const handleSubmit = async () => {
        if (!isValid) {
            setError(t('transactions.split_error'));
            return;
        }

        setIsSubmitting(true);
        try {
            await onConfirm(
                splits.map(s => ({
                    amount: parseFloat(s.amount),
                    categoryId: s.categoryId || undefined,
                    projectId: s.projectId || undefined,
                    note: s.note || undefined,
                }))
            );
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to split transaction');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-lg bg-background shadow-lg animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h2 className="text-lg font-bold">{t('transactions.split_title')}</h2>
                        <p className="text-sm text-muted-foreground">{t('transactions.split_desc')}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-md"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Original Transaction Info */}
                <div className="p-4 bg-muted/30 border-b">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="font-medium">{transaction.merchant || transaction.note}</div>
                            <div className="text-sm text-muted-foreground">{transaction.date}</div>
                        </div>
                        <div className="text-lg font-bold">
                            {transaction.currencyCode} {transaction.amount.toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* Split Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {splits.map((split, index) => (
                        <div
                            key={split.id}
                            className="p-3 border rounded-lg space-y-3 bg-card"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Split {index + 1}
                                </span>
                                {splits.length > 2 && (
                                    <button
                                        onClick={() => removeSplit(split.id)}
                                        className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-muted-foreground">{t('add.amount')}</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={split.amount}
                                        onChange={(e) => updateSplit(split.id, 'amount', e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground">{t('add.category')}</label>
                                    <select
                                        value={split.categoryId}
                                        onChange={(e) => updateSplit(split.id, 'categoryId', e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    >
                                        <option value="">-</option>
                                        {expenseCategories.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.icon} {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-muted-foreground">{t('add.project')}</label>
                                    <select
                                        value={split.projectId}
                                        onChange={(e) => updateSplit(split.id, 'projectId', e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    >
                                        <option value="">{t('add.project_none')}</option>
                                        {activeProjects.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground">{t('add.note')}</label>
                                    <input
                                        type="text"
                                        value={split.note}
                                        onChange={(e) => updateSplit(split.id, 'note', e.target.value)}
                                        placeholder={t('add.optional')}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addSplit}
                        className="w-full py-2 border border-dashed rounded-lg text-sm text-muted-foreground hover:bg-muted/50 flex items-center justify-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        {t('transactions.split_add')}
                    </button>
                </div>

                {/* Footer */}
                <div className="p-4 border-t space-y-3">
                    {/* Summary */}
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('transactions.split_total')}:</span>
                        <span className={cn('font-medium', !isValid && 'text-destructive')}>
                            {transaction.currencyCode} {totalSplit.toFixed(2)}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('transactions.split_remaining')}:</span>
                        <span className={cn('font-medium', Math.abs(remaining) > 0.01 && 'text-destructive')}>
                            {transaction.currencyCode} {remaining.toFixed(2)}
                        </span>
                    </div>

                    {error && (
                        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!isValid || isSubmitting}
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                        >
                            {isSubmitting ? '...' : t('transactions.split_confirm')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
