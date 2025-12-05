'use client';

import { useMemo, useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { parseLocalDate } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { getMeIncMetrics, getDashboardSummary } from '@/app/actions/dashboard';
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

interface DashboardSummary {
  baseCurrency: string;
  totalCash: number;
  totalFinancialInvested: number;
  totalFixedAssets: number;
  totalNetWorth: number;
  thisMonthExpenses: number;
  thisMonthIncome: number;
  thisMonthNet: number;
  allTimeExpenses: number;
  allTimeIncome: number;
  allTimeNet: number;
  assetDetails: Array<{
    id: string;
    name: string;
    startDate: string;
    currentValue: number;
    dailyDep: number;
    originalCurrency: string;
  }>;
}

export default function Dashboard() {
  const { transactions, settings, categories, isLoading, accounts } = useStore();
  const { t } = useTranslation();

  // Server-side calculated summary
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Me Inc. Metrics State
  const [metrics, setMetrics] = useState<{
    dailyBurnRate: DailyBurnRate[];
  } | null>(null);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Fetch all server-side data
  useEffect(() => {
    const fetchData = async () => {
      setLoadingSummary(true);

      try {
        // Fetch summary (with currency conversion)
        const summaryResponse = await getDashboardSummary();
        if (summaryResponse.success && summaryResponse.data) {
          setSummary(summaryResponse.data);
        }

        // Fetch metrics for burn rate
        const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
        const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
        const metricsResponse = await getMeIncMetrics(startDate, endDate);
        if (metricsResponse.success && metricsResponse.data) {
          setMetrics(metricsResponse.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoadingSummary(false);
      }
    };

    fetchData();
  }, [currentMonth, currentYear]);

  const averageBurnRate = useMemo(() => {
    if (!metrics?.dailyBurnRate?.length) return 0;
    const total = metrics.dailyBurnRate.reduce((sum: number, day: DailyBurnRate) => sum + day.totalDailyCost, 0);
    return total / metrics.dailyBurnRate.length;
  }, [metrics]);

  // Filter this month's expenses for the pie chart (still need raw data for breakdown)
  const thisMonthExpenses = useMemo(() =>
    transactions.filter(t => {
      if (t.type !== 'EXPENSE') return false;
      const d = parseLocalDate(t.date);
      if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return false;
      const category = categories.find(c => c.id === t.categoryId);
      if (category && (category.name === 'Investment' || category.name === 'Depreciation')) {
        return false;
      }
      return true;
    }),
    [transactions, categories, currentMonth, currentYear]
  );

  if (isLoading || loadingSummary) {
    return <LoadingSpinner />;
  }

  // Use server-calculated values
  const totalCash = summary?.totalCash ?? 0;
  const totalFinancialInvested = summary?.totalFinancialInvested ?? 0;
  const totalFixedAssets = summary?.totalFixedAssets ?? 0;
  const totalNetWorth = summary?.totalNetWorth ?? 0;
  const thisMonthIncome = summary?.thisMonthIncome ?? 0;
  const thisMonthTotal = summary?.thisMonthExpenses ?? 0;
  const allTimeIncome = summary?.allTimeIncome ?? 0;
  const allTimeTotal = summary?.allTimeExpenses ?? 0;

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
            loading={false}
          />
        </div>
        <div className="h-32 md:h-40">
          <MonthlyFlowCard
            income={thisMonthIncome}
            expenses={thisMonthTotal}
            settings={settings}
            loading={false}
          />
        </div>
        <div className="h-32 md:h-40">
          <CapitalWaterLevelCard
            totalNetWorth={totalNetWorth}
            settings={settings}
            loading={false}
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
