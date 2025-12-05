'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { useCurrencyTotal } from '@/hooks/useCurrencyTotal';
import { parseLocalDate } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { calculateDepreciation } from '@/lib/depreciation';
import { getMeIncMetrics } from '@/app/actions/dashboard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Widgets
import { TotalBalanceCard } from '@/components/dashboard/TotalBalanceCard';
import { MonthlyFlowCard } from '@/components/dashboard/MonthlyFlowCard';
import { CapitalWaterLevelCard } from '@/components/dashboard/CapitalWaterLevelCard';
import { RecentTransactionsWidget } from '@/components/dashboard/RecentTransactionsWidget';
import { QuickActionsWidget } from '@/components/dashboard/QuickActionsWidget';
import { ExpenseCompositionChart } from '@/components/dashboard/ExpenseCompositionChart';

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
      const category = categories.find(c => c.id === t.categoryId);
      if (category && (category.name === 'Investment' || category.name === 'Depreciation')) {
        return false;
      }
      return true;
    }),
    [thisMonthTransactions, categories]
  );

  const thisMonthIncomeList = useMemo(() => thisMonthTransactions.filter(t => t.type === 'INCOME'), [thisMonthTransactions]);

  const allTimeExpenses = useMemo(() =>
    transactions.filter(t => {
      if (t.type !== 'EXPENSE') return false;
      const category = categories.find(c => c.id === t.categoryId);
      if (category && (category.name === 'Investment' || category.name === 'Depreciation')) {
        return false;
      }
      return true;
    }),
    [transactions, categories]
  );

  const allTimeIncomeList = useMemo(() => transactions.filter(t => t.type === 'INCOME'), [transactions]);

  const { total: thisMonthTotal, loading: loadingThis } = useCurrencyTotal(thisMonthExpenses, settings);
  const { total: thisMonthIncome, loading: loadingIncome } = useCurrencyTotal(thisMonthIncomeList, settings);
  const { total: allTimeTotal, loading: loadingAllTimeExpenses } = useCurrencyTotal(allTimeExpenses, settings);
  const { total: allTimeIncome, loading: loadingAllTimeIncome } = useCurrencyTotal(allTimeIncomeList, settings);

  const calculateInvestmentValue = useCallback((investment: typeof investments[0]): number => {
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

    if (investment.type === 'DEPOSIT' && investment.interestRate) {
      const principal = investment.initialAmount;
      const rate = investment.interestRate / 100;
      const start = new Date(investment.startDate);
      const end = investment.endDate ? new Date(investment.endDate) : new Date();
      const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
      const interest = principal * rate * Math.max(0, years);
      return principal + interest;
    }

    return investment.currentAmount ?? investment.initialAmount;
  }, []);

  const activeInvestments = useMemo(() => investments.filter(i => i.status === 'ACTIVE'), [investments]);

  const financialInvestmentItems = useMemo(() => {
    const financialInvestments = activeInvestments.filter(i => i.type !== 'ASSET');
    return financialInvestments.map(inv => ({
      amount: calculateInvestmentValue(inv),
      currencyCode: inv.currencyCode
    }));
  }, [activeInvestments, calculateInvestmentValue]);

  const { total: totalFinancialInvested, loading: loadingFinancialInvested } = useCurrencyTotal(financialInvestmentItems, settings);

  const fixedAssetItems = useMemo(() => {
    const fixedAssets = activeInvestments.filter(i => i.type === 'ASSET');
    return fixedAssets.map(inv => ({
      amount: calculateInvestmentValue(inv),
      currencyCode: inv.currencyCode
    }));
  }, [activeInvestments, calculateInvestmentValue]);

  const { total: totalFixedAssets, loading: loadingFixedAssets } = useCurrencyTotal(fixedAssetItems, settings);

  const cashAccountItems = useMemo(() => {
    const cashAccounts = accounts.filter(a => a.type !== 'INVESTMENT' && a.type !== 'ASSET');
    return cashAccounts.map(acc => ({
      amount: acc.currentBalance,
      currencyCode: acc.currencyCode
    }));
  }, [accounts]);

  const { total: totalCash, loading: loadingCash } = useCurrencyTotal(cashAccountItems, settings);

  const totalNetWorth = totalCash + totalFinancialInvested + totalFixedAssets;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-4 md:space-y-8 bg-gray-50 dark:bg-background min-h-screen transition-colors duration-300">
      <header className="mb-4 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{t('dashboard.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {new Date().toLocaleDateString(settings.language === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', year: 'numeric' })}
        </p>
      </header>

      {/* KPI Row (2x2 on mobile, 4 cols on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <div className="h-32 md:h-40">
          <TotalBalanceCard
            totalCash={totalCash}
            totalFinancialInvested={totalFinancialInvested}
            thisMonthIncome={thisMonthIncome}
            thisMonthTotal={thisMonthTotal}
            allTimeIncome={allTimeIncome}
            allTimeTotal={allTimeTotal}
            settings={settings}
            loading={loadingCash || loadingFinancialInvested}
          />
        </div>
        <div className="h-32 md:h-40">
          <MonthlyFlowCard
            income={thisMonthIncome}
            expenses={thisMonthTotal}
            settings={settings}
            loading={loadingIncome || loadingThis}
          />
        </div>
        <div className="h-32 md:h-40">
          <CapitalWaterLevelCard
            totalNetWorth={totalNetWorth}
            settings={settings}
            loading={loadingFinancialInvested || loadingFixedAssets || loadingCash}
          />
        </div>
        <div className="h-32 md:h-40">
          <QuickActionsWidget />
        </div>
      </div>

      {/* Main View Row (stacked on mobile, 2/3 + 1/3 on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Recent Transactions (2/3 width on desktop) */}
        <div className="lg:col-span-2 h-[400px] md:h-[450px]">
          <RecentTransactionsWidget
            transactions={transactions}
            categories={categories}
            accounts={accounts}
          />
        </div>

        {/* Expense Composition (1/3 width on desktop) */}
        <div className="lg:col-span-1 h-[300px] md:h-[450px]">
          <ExpenseCompositionChart
            transactions={thisMonthExpenses}
            categories={categories}
            settings={settings}
          />
        </div>
      </div>
    </div>
  );
}
