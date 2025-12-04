'use client';

import { useState, useMemo } from 'react';
import { Transaction, Category, Account } from '@/types';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { Edit2, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface TransactionTableProps {
    transactions: Transaction[];
    categories: Category[];
    accounts: Account[];
    onEdit: (transaction: Transaction) => void;
    onDelete: (id: string) => void;
}

type SortField = 'date' | 'merchant' | 'amount' | 'category' | 'account';
type SortDirection = 'asc' | 'desc';

export function TransactionTable({ transactions, categories, accounts, onEdit, onDelete }: TransactionTableProps) {
    const { t } = useTranslation();
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc'); // Default to ascending for new field
        }
    };

    const getCategoryName = (categoryId?: string) => {
        if (!categoryId) return t('common.unknown');
        const category = categories.find((c) => c.id === categoryId);
        return category?.name || t('common.unknown');
    };

    const getAccountName = (accountId?: string) => {
        if (!accountId) return '-';
        const account = accounts.find((a) => a.id === accountId);
        return account?.name || '-';
    };

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
                case 'merchant':
                    comparison = (a.merchant || '').localeCompare(b.merchant || '');
                    break;
                case 'category':
                    const catA = getCategoryName(a.categoryId);
                    const catB = getCategoryName(b.categoryId);
                    comparison = catA.localeCompare(catB);
                    break;
                case 'account':
                    const accA = getAccountName(a.accountId);
                    const accB = getAccountName(b.accountId);
                    comparison = accA.localeCompare(accB);
                    break;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [transactions, sortField, sortDirection, categories, accounts]);

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
        return sortDirection === 'asc'
            ? <ArrowUp className="ml-2 h-4 w-4 text-primary" />
            : <ArrowDown className="ml-2 h-4 w-4 text-primary" />;
    };

    return (
        <div className="rounded-md border bg-card">
            <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                <button
                                    onClick={() => handleSort('date')}
                                    className="flex items-center hover:text-foreground transition-colors"
                                >
                                    {t('add.date')}
                                    <SortIcon field="date" />
                                </button>
                            </th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                <button
                                    onClick={() => handleSort('merchant')}
                                    className="flex items-center hover:text-foreground transition-colors"
                                >
                                    {t('add.merchant')}
                                    <SortIcon field="merchant" />
                                </button>
                            </th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                <button
                                    onClick={() => handleSort('category')}
                                    className="flex items-center hover:text-foreground transition-colors"
                                >
                                    {t('add.category')}
                                    <SortIcon field="category" />
                                </button>
                            </th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                <button
                                    onClick={() => handleSort('account')}
                                    className="flex items-center hover:text-foreground transition-colors"
                                >
                                    {t('add.account')}
                                    <SortIcon field="account" />
                                </button>
                            </th>
                            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                                <div className="flex items-center justify-end">
                                    <button
                                        onClick={() => handleSort('amount')}
                                        className="flex items-center hover:text-foreground transition-colors"
                                    >
                                        {t('add.amount')}
                                        <SortIcon field="amount" />
                                    </button>
                                </div>
                            </th>
                            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {sortedTransactions.map((transaction) => (
                            <tr
                                key={transaction.id}
                                className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                            >
                                <td className="p-4 align-middle">{transaction.date}</td>
                                <td className="p-4 align-middle font-medium">{transaction.merchant || '-'}</td>
                                <td className="p-4 align-middle">
                                    <div className="flex items-center gap-2">
                                        <span>{categories.find(c => c.id === transaction.categoryId)?.icon}</span>
                                        <span>{getCategoryName(transaction.categoryId)}</span>
                                    </div>
                                </td>
                                <td className="p-4 align-middle">{getAccountName(transaction.accountId)}</td>
                                <td className={cn(
                                    "p-4 align-middle text-right font-bold",
                                    transaction.type === 'EXPENSE' ? "text-red-500" : "text-green-500"
                                )}>
                                    {transaction.type === 'EXPENSE' ? '-' : '+'}
                                    {formatCurrency(transaction.amount, transaction.currencyCode)}
                                </td>
                                <td className="p-4 align-middle text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => onEdit(transaction)}
                                            className="p-2 text-muted-foreground hover:text-primary transition-colors"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => onDelete(transaction.id)}
                                            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
