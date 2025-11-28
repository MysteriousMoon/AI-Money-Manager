'use client';

import { useStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function TransactionsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const transactions = useStore((state) => state.transactions);
    const deleteTransaction = useStore((state) => state.deleteTransaction);
    const categories = useStore((state) => state.categories);
    const isLoading = useStore((state) => state.isLoading);

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
        <div className="min-h-screen bg-background pb-20">
            <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-lg">
                <div className="container max-w-2xl mx-auto flex h-16 items-center justify-between px-4">
                    <h1 className="text-xl font-bold">{t('transactions.title')}</h1>
                </div>
            </header>

            <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
                {transactions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        {t('transactions.empty')}
                    </div>
                ) : (
                    sortedDates.map((date) => (
                        <div key={date} className="space-y-2">
                            <h2 className="text-sm font-medium text-muted-foreground sticky top-16 bg-background/95 py-2 z-0">
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
                                {groupedTransactions[date].map((transaction) => (
                                    <div
                                        key={transaction.id}
                                        className="flex items-center justify-between p-4 rounded-lg border bg-card text-card-foreground shadow-sm"
                                    >
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
                                        <div className="flex items-center gap-4">
                                            <span className={cn(
                                                "font-bold",
                                                transaction.type === 'EXPENSE' ? "text-red-500" : "text-green-500"
                                            )}>
                                                {transaction.type === 'EXPENSE' ? '-' : '+'}
                                                {transaction.amount.toFixed(2)}
                                            </span>
                                            <button
                                                onClick={() => handleDelete(transaction.id)}
                                                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                                                aria-label="Delete transaction"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}