'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useCurrencyTotal } from '@/hooks/useCurrencyTotal';
import { Plus, ScanLine, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/currency';
import { cn, parseLocalDate } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { calculateDepreciation } from '@/lib/depreciation';
import { getMeIncMetrics } from '@/app/actions/dashboard';
import { useState, useEffect, useCallback } from 'react';

import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface DailyBurnRate {
  date: string;
  ordinaryCost: number;
  depreciationCost: number;
  projectCost: number;
  totalDailyCost: number;
}

export default function Dashboard() {
  const { transactions, settings, categories, isLoading, investments, accounts } = useStore();
  const { t } = useTranslation();

  // Me Inc. Metrics State
  const [metrics, setMetrics] = useState<{
    dailyBurnRate: DailyBurnRate[];
  } | null>(null);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  useEffect(() => {
    const fetchMetrics = async () => {
      const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
      try {
        const response = await getMeIncMetrics(startDate, endDate);
        if (response.success && response.data) {
          setMetrics(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    };
    fetchMetrics();
  }, [currentMonth, currentYear]);

  const averageBurnRate = useMemo(() => {
    if (!metrics?.dailyBurnRate?.length) return 0;
    const total = metrics.dailyBurnRate.reduce((sum: number, day: DailyBurnRate) => sum + day.totalDailyCost, 0);
    return total / metrics.dailyBurnRate.length;
  }, [metrics]);

  const thisMonthTransactions = useMemo(() => transactions.filter(t => {
    const d = parseLocalDate(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }), [transactions, currentMonth, currentYear]);

  const thisMonthExpenses = useMemo(() =>
    thisMonthTransactions.filter(t => {
      if (t.type !== 'EXPENSE') return false;
      // Exclude system asset categories (Investment, Depreciation) to prevent double-counting
      // These are tracked separately in the Investment module
      const category = categories.find(c => c.id === t.categoryId);
      if (category && (category.name === 'Investment' || category.name === 'Depreciation')) {
        return false;
      }
      return true;
    }),
    [thisMonthTransactions, categories]
  );

  const thisMonthIncomeList = useMemo(() => thisMonthTransactions.filter(t => t.type === 'INCOME'), [thisMonthTransactions]);

  // All-time calculations for Main Card
  const allTimeExpenses = useMemo(() =>
    transactions.filter(t => {
      if (t.type !== 'EXPENSE') return false;
      // Exclude system asset categories (Investment, Depreciation)
      const category = categories.find(c => c.id === t.categoryId);
      if (category && (category.name === 'Investment' || category.name === 'Depreciation')) {
        return false;
      }
      return true;
    }),
    [transactions, categories]
  );

  const allTimeIncomeList = useMemo(() => transactions.filter(t => t.type === 'INCOME'), [transactions]);

  const { total: thisMonthTotal, loading: loadingThis } = useCurrencyTotal(
    thisMonthExpenses,
    settings
  );

  const { total: thisMonthIncome, loading: loadingIncome } = useCurrencyTotal(
    thisMonthIncomeList,
    settings
  );

  const { total: allTimeTotal, loading: loadingAllTimeExpenses } = useCurrencyTotal(
    allTimeExpenses,
    settings
  );

  const { total: allTimeIncome, loading: loadingAllTimeIncome } = useCurrencyTotal(
    allTimeIncomeList,
    settings
  );

  // Investment Calculations - Match the logic from investments page
  const calculateInvestmentValue = useCallback((investment: typeof investments[0]): number => {
    // Handle ASSET type with depreciation
    if (investment.type === 'ASSET' && investment.purchasePrice && investment.salvageValue !== null && investment.usefulLife && investment.depreciationType) {
      const depResult = calculateDepreciation(
        investment.purchasePrice,
        investment.salvageValue,
        investment.usefulLife,
        investment.depreciationType as 'STRAIGHT_LINE' | 'DECLINING_BALANCE',
        investment.startDate
      );
      return depResult.bookValue;
    }

    // Handle DEPOSIT type with interest calculation
    if (investment.type === 'DEPOSIT' && investment.interestRate) {
      const principal = investment.initialAmount;
      const rate = investment.interestRate / 100;
      const start = new Date(investment.startDate);
      const end = investment.endDate ? new Date(investment.endDate) : new Date();
      const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
      const interest = principal * rate * Math.max(0, years);
      return principal + interest;
    }

    // For other types, use currentAmount if available, otherwise initialAmount
    return investment.currentAmount ?? investment.initialAmount;
  }, []);

  const activeInvestments = useMemo(() => investments.filter(i => i.status === 'ACTIVE'), [investments]);

  // 1. Financial Investments (Stocks, Funds, Deposits) - Exclude Assets
  const financialInvestmentItems = useMemo(() => {
    const financialInvestments = activeInvestments.filter(i => i.type !== 'ASSET');
    return financialInvestments.map(inv => ({
      amount: calculateInvestmentValue(inv),
      currencyCode: inv.currencyCode
    }));
  }, [activeInvestments, calculateInvestmentValue]);

  const { total: totalFinancialInvested, loading: loadingFinancialInvested } = useCurrencyTotal(financialInvestmentItems, settings);

  // 2. Fixed Assets
  const fixedAssetItems = useMemo(() => {
    const fixedAssets = activeInvestments.filter(i => i.type === 'ASSET');
    return fixedAssets.map(inv => ({
      amount: calculateInvestmentValue(inv),
      currencyCode: inv.currencyCode
    }));
  }, [activeInvestments, calculateInvestmentValue]);

  const { total: totalFixedAssets, loading: loadingFixedAssets } = useCurrencyTotal(fixedAssetItems, settings);

  // 3. Cash Savings (Exclude Investment and Asset accounts to avoid double counting)
  const cashAccountItems = useMemo(() => {
    const cashAccounts = accounts.filter(a => a.type !== 'INVESTMENT' && a.type !== 'ASSET');
    return cashAccounts.map(acc => ({
      amount: acc.currentBalance,
      currencyCode: acc.currencyCode
    }));
  }, [accounts]);

  const { total: totalCash, loading: loadingCash } = useCurrencyTotal(cashAccountItems, settings);

  // Total Net Worth (Capital Water Level)
  const totalNetWorth = totalCash + totalFinancialInvested + totalFixedAssets;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container max-w-7xl mx-auto p-4 pb-24 md:pt-24 space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground text-sm">
            {new Date().toLocaleDateString(settings.language === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>

      </header>

      {/* Main Card */}
      <div className="bg-primary text-primary-foreground rounded-2xl p-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-8">
          {/* Top Row: Balance and Invested */}
          <div className="grid grid-cols-2 gap-0 items-center border-b border-white/10 pb-6">
            <div className="pr-8 border-r border-white/10">
              <p className="text-primary-foreground/80 text-sm font-medium mb-1">{t('dashboard.balance')}</p>
              <div className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight whitespace-nowrap">
                {loadingCash ? '...' : formatCurrency(totalCash, settings.currency)}
              </div>
            </div>

            <div className="pl-8">
              <p className="text-primary-foreground/80 text-sm font-medium mb-1">{t('dashboard.invested')}</p>
              <div className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight whitespace-nowrap">
                {loadingFinancialInvested ? '...' : formatCurrency(totalFinancialInvested, settings.currency)}
              </div>
            </div>
          </div>

          {/* Bottom Row: Totals and Monthly */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-0">
            {/* Total Stats */}
            <div className="flex flex-col gap-2 justify-center md:pr-8 md:border-r border-white/10">
              <div className="flex justify-between items-baseline gap-4">
                <span className="text-primary-foreground/80 text-sm font-medium">{t('dashboard.total_income')}</span>
                <span className="text-lg font-semibold text-green-200 text-right">
                  {loadingAllTimeIncome ? '...' : formatCurrency(allTimeIncome, settings.currency)}
                </span>
              </div>
              <div className="flex justify-between items-baseline gap-4">
                <span className="text-primary-foreground/80 text-sm font-medium">{t('dashboard.total_expenses')}</span>
                <span className="text-lg font-semibold text-red-200 text-right">
                  {loadingAllTimeExpenses ? '...' : formatCurrency(allTimeTotal, settings.currency)}
                </span>
              </div>
            </div>

            {/* Monthly Stats */}
            <div className="flex flex-col gap-2 justify-center md:pl-8">
              <div className="flex justify-between items-baseline gap-4">
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="h-3 w-3 text-green-300" />
                  <span className="text-primary-foreground/80 text-sm font-medium">{t('dashboard.income')}</span>
                </div>
                <span className="text-lg font-semibold text-green-200 text-right">
                  {loadingIncome ? '...' : formatCurrency(thisMonthIncome, settings.currency)}
                </span>
              </div>
              <div className="flex justify-between items-baseline gap-4">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="h-3 w-3 text-red-300" />
                  <span className="text-primary-foreground/80 text-sm font-medium">{t('dashboard.spending')}</span>
                </div>
                <span className="text-lg font-semibold text-red-200 text-right">
                  {loadingThis ? '...' : formatCurrency(thisMonthTotal, settings.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Me Inc. Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('dashboard.daily_burn_rate')}</h3>
          <div className="text-2xl font-bold">
            {metrics ? formatCurrency(averageBurnRate, settings.currency) : '...'}
            <span className="text-xs font-normal text-muted-foreground ml-1">/ {t('reports.range.daily')}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('dashboard.burn_rate_desc')}
          </p>
        </div>
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('dashboard.capital_water_level')}</h3>
          <div className="text-2xl font-bold">
            {loadingFinancialInvested || loadingFixedAssets || loadingCash ? '...' : formatCurrency(totalNetWorth, settings.currency)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('dashboard.capital_desc')}
          </p>
        </div>
      </div>

      {/* Account Cards */}
      {accounts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">My Accounts</h2>
            <Link href="/accounts" className="text-sm text-primary hover:underline">Manage</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-visible md:snap-none">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="min-w-[200px] snap-start md:min-w-0 bg-card border rounded-xl p-4 flex flex-col gap-2"
                style={{ borderLeftWidth: '4px', borderLeftColor: account.color || '#3B82F6' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{account.icon || '🏦'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{account.name}</p>
                    {account.isDefault && (
                      <span className="text-xs text-muted-foreground">Default</span>
                    )}
                  </div>
                </div>
                <p className="text-lg font-bold">
                  {formatCurrency(account.currentBalance, account.currencyCode)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

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
