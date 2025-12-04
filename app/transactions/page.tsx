'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { Trash2, Edit2, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Transaction } from '@/types';
import { CURRENCIES } from '@/lib/currency';
import { exportTransactions } from '@/app/actions/transaction';

import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PageHeader } from '@/components/ui/page-header';
import { ContentContainer } from '@/components/ui/content-container';
import { TransactionTable } from '@/components/transactions/TransactionTable';

export default function TransactionsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const transactions = useStore((state) => state.transactions);
    const updateTransaction = useStore((state) => state.updateTransaction);
    const deleteTransaction = useStore((state) => state.deleteTransaction);
    const categories = useStore((state) => state.categories);
    const accounts = useStore((state) => state.accounts);
    const isLoading = useStore((state) => state.isLoading);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Transaction>>({});
    const [deleteId, setDeleteId] = useState<string | null>(null);

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
            accountId: transaction.accountId,
            transferToAccountId: transaction.transferToAccountId,
            targetAmount: transaction.targetAmount,
            targetCurrencyCode: transaction.targetCurrencyCode,
        });
    };

    const handleUpdate = async () => {
        if (!editingId) return;
        await updateTransaction(editingId, editForm);
        setEditingId(null);
        setEditForm({});
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
        const category = categories.find((c) => c.id === categoryId);
        return category?.icon || '📝';
    };

    const getCategoryName = (categoryId?: string) => {
        if (!categoryId) return 'Unknown';
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

            <div className="space-y-6">
                {transactions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        {t('transactions.empty')}
                    </div>
                ) : (
                    <>
                        {/* Desktop View: Data Table */}
                        <div className="hidden md:block">
                            <TransactionTable
                                transactions={transactions}
                                categories={categories}
                                accounts={accounts}
                                onEdit={handleEdit}
                                onDelete={handleDeleteClick}
                            />
                        </div>

                        {/* Mobile View: List */}
                        <div className="md:hidden space-y-2">
                            {sortedDates.map((date) => (
                                <div key={date} className="space-y-2">
                                    <h2 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background/95 py-2 z-10 backdrop-blur-sm">
                                        {(() => {
                                            try {
                                                const [year, month, day] = date.split('-').map(Number);
                                                if (!year || !month || !day) throw new Error('Invalid date parts');

                                                const localDate = new Date(year, month - 1, day);
                                                if (isNaN(localDate.getTime())) throw new Error('Invalid date');

                                                return format(localDate, t('transactions.date_format') === 'yyyy年M月d日' ? 'yyyy年M月d日' : 'MMMM d, yyyy', {
                                                    locale: t('transactions.date_format') === 'yyyy年M月d日' ? zhCN : enUS
                                                });
                                            } catch (e) {
                                                return date;
                                            }
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
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {transaction.note && <span>{transaction.note}</span>}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn(
                                                                    "flex items-baseline gap-0.5 font-bold mr-2",
                                                                    transaction.type === 'EXPENSE' ? "text-red-500" : "text-green-500"
                                                                )}>
                                                                    <span className="text-sm">
                                                                        {transaction.type === 'EXPENSE' ? '-' : '+'}
                                                                        {CURRENCIES.find(c => c.code === (transaction.currencyCode || 'CNY'))?.symbol}
                                                                    </span>
                                                                    <span className="text-base">
                                                                        {transaction.amount.toFixed(2)}
                                                                    </span>
                                                                    <span className="text-[10px] font-normal text-muted-foreground ml-1">
                                                                        {transaction.currencyCode || 'CNY'}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleEdit(transaction)}
                                                                    className="p-2 text-muted-foreground hover:text-primary transition-colors"
                                                                    aria-label="Edit transaction"
                                                                >
                                                                    <Edit2 className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteClick(transaction.id)}
                                                                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                                                                    aria-label="Delete transaction"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="p-4 bg-muted/30 space-y-4">
                                                            {/* Edit Form (Simplified for brevity, same as before) */}
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
                            ))}
                        </div>
                    </>
                )}
            </div>

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
        </ContentContainer>
    );
}