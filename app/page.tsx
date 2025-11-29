'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useCurrencyTotal } from '@/hooks/useCurrencyTotal';
import { Plus, ScanLine, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/currency';
import { cn, parseLocalDate } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Dashboard() {
  const { transactions, settings, categories, isLoading } = useStore();
  const { t } = useTranslation();

  // Filter for current month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthTransactions = useMemo(() => transactions.filter(t => {
    const d = parseLocalDate(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }), [transactions, currentMonth, currentYear]);

  const lastMonthTransactions = useMemo(() => transactions.filter(t => {
    const d = parseLocalDate(t.date);
    // Handle Jan -> Dec wrap
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
  }), [transactions, currentMonth, currentYear]);

  const thisMonthExpenses = useMemo(() => thisMonthTransactions.filter(t => t.type === 'EXPENSE'), [thisMonthTransactions]);
  const thisMonthIncomeList = useMemo(() => thisMonthTransactions.filter(t => t.type === 'INCOME'), [thisMonthTransactions]);

  const { total: thisMonthTotal, loading: loadingThis } = useCurrencyTotal(
    thisMonthExpenses,
    settings
  );



  const { total: thisMonthIncome, loading: loadingIncome } = useCurrencyTotal(
    thisMonthIncomeList,
    settings
  );



  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 pb-24 md:pt-24 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground text-sm">
            {now.toLocaleDateString(settings.language === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link href="/settings" className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
          <span className="sr-only">{t('nav.settings')}</span>
          <div className="h-4 w-4 bg-primary rounded-full" />
        </Link>
      </header>

      {/* Main Card */}
      <div className="bg-primary text-primary-foreground rounded-2xl p-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-2 gap-8 items-center">
          <div className="pr-8">
            <p className="text-primary-foreground/80 text-sm font-medium mb-1">{t('dashboard.balance')}</p>
            <div className="text-4xl font-bold tracking-tight">
              {loadingThis || loadingIncome ? '...' : formatCurrency(thisMonthIncome - thisMonthTotal, settings.currency)}
            </div>
          </div>

          <div className="flex flex-col gap-2 justify-center">
            <div className="flex justify-between items-baseline gap-4">
              <span className="text-primary-foreground/80 text-sm font-medium">{t('dashboard.total_income')}</span>
              <span className="text-lg font-semibold text-green-200 text-right">
                {loadingIncome ? '...' : formatCurrency(thisMonthIncome, settings.currency)}
              </span>
            </div>
            <div className="flex justify-between items-baseline gap-4">
              <span className="text-primary-foreground/80 text-sm font-medium">{t('dashboard.total_expenses')}</span>
              <span className="text-lg font-semibold text-red-200 text-right">
                {loadingThis ? '...' : formatCurrency(thisMonthTotal, settings.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <ArrowDownRight className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium">{t('dashboard.income')}</span>
          </div>
          <p className="text-xl font-bold">
            {loadingIncome ? '...' : formatCurrency(thisMonthIncome, settings.currency)}
          </p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <ArrowUpRight className="h-4 w-4 text-red-500" />
            <span className="text-xs font-medium">{t('dashboard.spending')}</span>
          </div>
          <p className="text-xl font-bold">
            {loadingThis ? '...' : formatCurrency(thisMonthTotal, settings.currency)}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/add" className="flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 p-4 rounded-xl transition-colors font-medium">
          <Plus className="h-5 w-5" />
          {t('dashboard.manual_add')}
        </Link>
        <Link href="/add?tab=scan" className="flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 p-4 rounded-xl transition-colors font-medium">
          <ScanLine className="h-5 w-5" />
          {t('dashboard.scan_receipt')}
        </Link>
      </div>

      {/* Recent Transactions */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('dashboard.recent_transactions')}</h2>
          <Link href="/reports" className="text-sm text-primary hover:underline">{t('dashboard.view_all')}</Link>
        </div>

        <div className="space-y-3">
          {transactions.slice(0, 5).map((t) => {
            const category = categories.find(c => c.id === t.categoryId);
            return (
              <div key={t.id} className="flex items-center justify-between p-3 bg-card border rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xl">
                    {category?.icon || '📄'}
                  </div>
                  <div>
                    <p className="font-medium line-clamp-1">{t.merchant || category?.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{t.date}</p>
                  </div>
                </div>
                <div className={cn(
                  "font-bold",
                  t.type === 'INCOME' ? "text-green-600" : "text-foreground"
                )}>
                  {t.type === 'INCOME' ? '+' : '-'}
                  {formatCurrency(t.amount, t.currencyCode)}
                </div>
              </div>
            );
          })}

          {transactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {t('dashboard.no_transactions')}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
