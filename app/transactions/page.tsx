'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { Trash2, Edit2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Transaction } from '@/types';
import { CURRENCIES } from '@/lib/currency';

import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function TransactionsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const transactions = useStore((state) => state.transactions);
    const updateTransaction = useStore((state) => state.updateTransaction);
    const deleteTransaction = useStore((state) => state.deleteTransaction);
    const categories = useStore((state) => state.categories);
    const isLoading = useStore((state) => state.isLoading);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Transaction>>({});

    const handleEdit = (transaction: typeof transactions[0]) => {
        setEditingId(transaction.id);
        setEditForm({
            amount: transaction.amount,
            currencyCode: transaction.currencyCode,
            categoryId: transaction.categoryId,
            date: transaction.date,
            merchant: transaction.merchant,
            note: transaction.note,
            type: transaction.type,
        });
    };

    const handleUpdate = async () => {
        if (!editingId) return;
        await updateTransaction(editingId, editForm);
        setEditingId(null);
        setEditForm({});
    };

    const handleDelete = (id: string) => {
        if (confirm(t('transactions.confirm_delete'))) {
            deleteTransaction(id);
        }
    };

    const getCategoryIcon = (categoryId: string) => {
        const category = categories.find((c) => c.id === categoryId);
        return category?.icon || '📝';
    };

    const getCategoryName = (categoryId: string) => {
        const category = categories.find((c) => c.id === categoryId);
        return category?.name || 'Unknown';
    };

    // Group transactions by date
    const groupedTransactions = transactions.reduce((groups, transaction) => {
        const date = transaction.date;
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(transaction);
        return groups;
    }, {} as Record<string, typeof transactions>);

    const sortedDates = Object.keys(groupedTransactions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="container max-w-2xl mx-auto p-4 pb-24 md:pt-24 space-y-8">
            <header>
                <h1 className="text-2xl font-bold">{t('transactions.title')}</h1>
                <p className="text-muted-foreground text-sm">{t('transactions.desc')}</p>
            </header>

            <div className="space-y-6">
                {transactions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        {t('transactions.empty')}
                    </div>
                ) : (
                    sortedDates.map((date) => (
                        <div key={date} className="space-y-2">
                            <h2 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background/95 py-2 z-10 backdrop-blur-sm">
                                {(() => {
                                    // Parse date as local timezone to avoid offset issues
                                    const [year, month, day] = date.split('-').map(Number);
                                    const localDate = new Date(year, month - 1, day);
                                    return format(localDate, t('transactions.date_format') === 'yyyy年M月d日' ? 'yyyy年M月d日' : 'MMMM d, yyyy', {
                                        locale: t('transactions.date_format') === 'yyyy年M月d日' ? zhCN : enUS
                                    });
                                })()}
                            </h2>
                            <div className="space-y-2">
                                {groupedTransactions[date].map((transaction) => {
                                    const isEditing = editingId === transaction.id;
                                    return (
                                        <div
                                            key={transaction.id}
                                            className={cn(
                                                "rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden",
                                                isEditing ? "p-0" : "p-4 flex items-center justify-between"
                                            )}
                                        >
                                            {!isEditing ? (
                                                <>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg [&_svg]:size-5">
                                                            {getCategoryIcon(transaction.categoryId)}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-medium">{transaction.merchant || getCategoryName(transaction.categoryId)}</p>
                                                                <span className="uppercase text-[10px] border px-1 rounded">{transaction.currencyCode || 'CNY'}</span>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">
                                                                {transaction.note && <span>{transaction.note}</span>}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            "font-bold mr-2",
                                                            transaction.type === 'EXPENSE' ? "text-red-500" : "text-green-500"
                                                        )}>
                                                            {transaction.type === 'EXPENSE' ? '-' : '+'}
                                                            {transaction.amount.toFixed(2)}
                                                        </span>
                                                        <button
                                                            onClick={() => handleEdit(transaction)}
                                                            className="p-2 text-muted-foreground hover:text-primary transition-colors"
                                                            aria-label="Edit transaction"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(transaction.id)}
                                                            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                                                            aria-label="Delete transaction"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="p-4 bg-muted/30 space-y-4">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-xs font-medium text-muted-foreground">{t('add.amount')}</label>
                                                            <div className="flex gap-2">
                                                                <select
                                                                    value={editForm.currencyCode}
                                                                    onChange={(e) => setEditForm({ ...editForm, currencyCode: e.target.value })}
                                                                    className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
                                                                >
                                                                    {CURRENCIES.map((c) => (
                                                                        <option key={c.code} value={c.code}>
                                                                            {c.code}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={editForm.amount}
                                                                    onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-medium text-muted-foreground">{t('add.category')}</label>
                                                            <select
                                                                value={editForm.categoryId}
                                                                onChange={(e) => {
                                                                    const cat = categories.find(c => c.id === e.target.value);
                                                                    setEditForm({
                                                                        ...editForm,
                                                                        categoryId: e.target.value,
                                                                        type: cat?.type as 'EXPENSE' | 'INCOME' || 'EXPENSE'
                                                                    });
                                                                }}
                                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                                            >
                                                                {categories.map(c => (
                                                                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-xs font-medium text-muted-foreground">{t('add.date')}</label>
                                                            <input
                                                                type="date"
                                                                value={editForm.date}
                                                                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-medium text-muted-foreground">{t('add.merchant')}</label>
                                                            <input
                                                                type="text"
                                                                value={editForm.merchant || ''}
                                                                onChange={(e) => setEditForm({ ...editForm, merchant: e.target.value })}
                                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-muted-foreground">{t('add.note')}</label>
                                                        <input
                                                            type="text"
                                                            value={editForm.note || ''}
                                                            onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                                                        >
                                                            {t('transactions.cancel_edit')}
                                                        </button>
                                                        <button
                                                            onClick={handleUpdate}
                                                            className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                                                        >
                                                            {t('transactions.update')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}