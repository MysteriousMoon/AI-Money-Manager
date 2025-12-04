'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { Transaction, Category, Account } from '@/types';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { ArrowRight, Plus, Camera } from 'lucide-react';

interface RecentTransactionsWidgetProps {
    transactions: Transaction[];
    categories: Category[];
    accounts: Account[];
}

export function RecentTransactionsWidget({ transactions, categories, accounts }: RecentTransactionsWidgetProps) {
    const { t } = useTranslation();

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
                <h2 className="font-semibold text-gray-200">{t('dashboard.recent_transactions')}</h2>
                <div className="flex items-center gap-2">
                    <Link href="/add?mode=manual" className="inline-flex items-center justify-center rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3">
                        <Plus className="mr-1 h-3 w-3" />
                        {t('dashboard.manual_add')}
                    </Link>
                    <Link href="/add?mode=scan" className="inline-flex items-center justify-center rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3">
                        <Camera className="mr-1 h-3 w-3" />
                        {t('dashboard.scan_receipt')}
                    </Link>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-900/50 border-b border-gray-800">
                        <tr>
                            <th className="px-4 py-3 font-medium">{t('add.date')}</th>
                            <th className="px-4 py-3 font-medium">{t('add.category')}</th>
                            <th className="px-4 py-3 font-medium">{t('add.merchant')}</th>
                            <th className="px-4 py-3 font-medium text-right">{t('add.amount')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {transactions.slice(0, 7).map((tx) => {
                            const category = categories.find(c => c.id === tx.categoryId);
                            const account = accounts.find(a => a.id === tx.accountId);
                            return (
                                <tr key={tx.id} className="hover:bg-gray-800/30 transition-colors group">
                                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                                        {tx.date}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{category?.icon || '📄'}</span>
                                            <span className="text-gray-300">{category?.name || t('common.unknown')}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-300">
                                        {tx.merchant || '-'}
                                        {account && <span className="ml-2 text-xs text-gray-500">({account.name})</span>}
                                    </td>
                                    <td className={cn(
                                        "px-4 py-3 text-right font-medium",
                                        tx.type === 'INCOME' ? "text-emerald-400" : "text-gray-200"
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

            <div className="p-2 border-t border-gray-800 bg-gray-900/50 text-center">
                <Link href="/transactions" className="text-xs text-primary hover:text-primary/80 inline-flex items-center gap-1 transition-colors">
                    {t('dashboard.view_all')} <ArrowRight className="h-3 w-3" />
                </Link>
            </div>
        </div>
    );
}
