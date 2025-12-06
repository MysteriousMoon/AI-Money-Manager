'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { Transaction, Category, Account } from '@/types';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

interface RecentTransactionsWidgetProps {
    transactions: Transaction[];
    categories: Category[];
    accounts: Account[];
}

export function RecentTransactionsWidget({ transactions, categories, accounts }: RecentTransactionsWidgetProps) {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
            {/* Header with View All link */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('dashboard.recent_transactions')}</h3>
                <Link href="/transactions" className="text-sm text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1">
                    {t('dashboard.view_all')} <ArrowRight className="h-3 w-3" />
                </Link>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 font-medium">{t('add.date')}</th>
                            <th className="px-4 py-3 font-medium">{t('add.category')}</th>
                            <th className="px-4 py-3 font-medium hidden md:table-cell">{t('add.merchant')}</th>
                            <th className="px-4 py-3 font-medium text-right">{t('add.amount')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {transactions.slice(0, 6).map((tx) => {
                            const category = categories.find(c => c.id === tx.categoryId);
                            const account = accounts.find(a => a.id === tx.accountId);
                            return (
                                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs md:text-sm">
                                        {tx.date}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base md:text-lg">{category?.icon || '📄'}</span>
                                            <span className="text-gray-700 dark:text-gray-300 text-xs md:text-sm truncate max-w-[80px] md:max-w-none">{category?.name || t('common.unknown')}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 hidden md:table-cell">
                                        {tx.merchant || '-'}
                                        {account && <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">({account.name})</span>}
                                    </td>
                                    <td className={cn(
                                        "px-4 py-3 text-right font-medium text-xs md:text-sm whitespace-nowrap",
                                        tx.type === 'INCOME' ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-gray-200"
                                    )}>
                                        {tx.type === 'INCOME' ? '+' : '-'}
                                        {formatCurrency(tx.amount, tx.currencyCode)}
                                    </td>
                                </tr>
                            );
                        })}
                        {transactions.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                    {t('dashboard.no_transactions')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

