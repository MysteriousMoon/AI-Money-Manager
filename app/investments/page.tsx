'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, PiggyBank, Wallet, Laptop } from 'lucide-react';
import { cn, formatLocalDate } from '@/lib/utils';
import { Investment } from '@prisma/client';
import { CURRENCIES } from '@/lib/currency';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PageHeader } from '@/components/ui/page-header';
import { ContentContainer } from '@/components/ui/content-container';
import { calculateDepreciation } from '@/lib/depreciation';
import { useCurrencyTotal } from '@/hooks/useCurrencyTotal';
import { useEffect } from 'react';

export default function InvestmentsPage() {
    const { t } = useTranslation();
    const { investments, accounts, projects, addInvestment, updateInvestment, deleteInvestment, closeInvestment, recordDepreciation, isLoading, settings } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [type, setType] = useState('DEPOSIT'); // DEPOSIT, STOCK, OTHER
    const [initialAmount, setInitialAmount] = useState('');
    const [currentAmount, setCurrentAmount] = useState('');
    const [currencyCode, setCurrencyCode] = useState(settings.currency);
    const [interestRate, setInterestRate] = useState('');
    const [startDate, setStartDate] = useState(formatLocalDate(new Date()));
    const [endDate, setEndDate] = useState('');
    const [note, setNote] = useState('');
    const [accountId, setAccountId] = useState(accounts.find(a => a.isDefault)?.id || accounts[0]?.id || '');
    const [projectId, setProjectId] = useState('');

    // Asset specific state
    const [purchasePrice, setPurchasePrice] = useState('');
    const [usefulLife, setUsefulLife] = useState('');
    const [salvageValue, setSalvageValue] = useState('');
    const [depreciationType, setDepreciationType] = useState<'STRAIGHT_LINE' | 'DECLINING_BALANCE'>('STRAIGHT_LINE');

    // Effect to lock currency to selected account
    useEffect(() => {
        if (accountId) {
            const account = accounts.find(a => a.id === accountId);
            if (account) {
                setCurrencyCode(account.currencyCode);
            }
        }
    }, [accountId, accounts]);

    // Action States
    const [redeemId, setRedeemId] = useState<string | null>(null);
    const [redeemAmount, setRedeemAmount] = useState('');
    const [redeemDate, setRedeemDate] = useState(formatLocalDate(new Date()));
    const [redeemAccountId, setRedeemAccountId] = useState('');

    const [updateValueId, setUpdateValueId] = useState<string | null>(null);
    const [newValue, setNewValue] = useState('');

    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Depreciation State
    const [depreciationId, setDepreciationId] = useState<string | null>(null);
    const [depreciationAmount, setDepreciationAmount] = useState('');
    const [depreciationDate, setDepreciationDate] = useState(formatLocalDate(new Date()));

    const resetForm = () => {
        setIsAdding(false);
        setEditingId(null);
        setName('');
        setType('DEPOSIT');
        setInitialAmount('');
        setCurrentAmount('');
        setCurrencyCode(settings.currency);
        setInterestRate('');
        setStartDate(formatLocalDate(new Date()));
        setEndDate('');
        setNote('');
        setAccountId(accounts.find(a => a.isDefault)?.id || accounts[0]?.id || '');
        setProjectId('');
        setPurchasePrice('');
        setUsefulLife('');
        setSalvageValue('');
        setDepreciationType('STRAIGHT_LINE');
    };

    const handleEdit = (investment: Investment) => {
        setEditingId(investment.id);
        setName(investment.name);
        setType(investment.type);
        setInitialAmount(investment.initialAmount.toString());
        setCurrentAmount(investment.currentAmount?.toString() || '');
        setCurrencyCode(investment.currencyCode);
        setInterestRate(investment.interestRate?.toString() || '');
        setStartDate(investment.startDate);
        setEndDate(investment.endDate || '');
        setNote(investment.note || '');
        setAccountId((investment as any).accountId || accounts.find(a => a.isDefault)?.id || '');
        setProjectId((investment as any).projectId || '');
        setPurchasePrice(investment.purchasePrice?.toString() || '');
        setUsefulLife(investment.usefulLife?.toString() || '');
        setSalvageValue(investment.salvageValue?.toString() || '');
        setDepreciationType((investment.depreciationType as 'STRAIGHT_LINE' | 'DECLINING_BALANCE') || 'STRAIGHT_LINE');
        setIsAdding(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const investmentData: any = {
            name,
            type,
            initialAmount: type === 'ASSET' ? parseFloat(purchasePrice) : parseFloat(initialAmount),
            currentAmount: currentAmount ? parseFloat(currentAmount) : null,
            currencyCode,
            interestRate: interestRate ? parseFloat(interestRate) : null,
            startDate,
            endDate: endDate || null,
            note: note || null,
            accountId: accountId || null,
            projectId: projectId || null,
            status: 'ACTIVE',
            // Asset-specific fields
            purchasePrice: type === 'ASSET' && purchasePrice ? parseFloat(purchasePrice) : null,
            usefulLife: type === 'ASSET' && usefulLife ? parseInt(usefulLife) : null,
            salvageValue: type === 'ASSET' && salvageValue ? parseFloat(salvageValue) : null,
            depreciationType: type === 'ASSET' ? depreciationType : null,
        };

        if (editingId) {
            await updateInvestment(editingId, investmentData);
        } else {
            await addInvestment(investmentData);
        }
        resetForm();
        window.location.reload();
    };

    const handleDelete = async (id: string) => {
        await deleteInvestment(id);
        setDeleteId(null);
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
    };

    const handleRedeemClick = (investment: Investment) => {
        setRedeemId(investment.id);
        setRedeemAmount(investment.currentAmount?.toString() || investment.initialAmount.toString());
        setRedeemDate(formatLocalDate(new Date()));
        setRedeemAccountId(accounts.find(a => a.isDefault)?.id || accounts[0]?.id || '');
    };

    const handleRedeemSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (redeemId && redeemAmount) {
            await closeInvestment(redeemId, parseFloat(redeemAmount), redeemDate, redeemAccountId);
            setRedeemId(null);
            setRedeemAmount('');
            window.location.reload();
        }
    };

    const handleUpdateValueClick = (investment: Investment) => {
        setUpdateValueId(investment.id);
        setNewValue(investment.currentAmount?.toString() || investment.initialAmount.toString());
    };

    const handleUpdateValueSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (updateValueId && newValue) {
            await updateInvestment(updateValueId, { currentAmount: parseFloat(newValue) });
            setUpdateValueId(null);
            setNewValue('');
            window.location.reload();
        }
    };

    const handleDepreciationClick = (investment: Investment) => {
        // Calculate suggested depreciation based on daily rate * days since last
        const result = calculateDepreciation(
            investment.purchasePrice || 0,
            investment.salvageValue || 0,
            investment.usefulLife || 5,
            (investment.depreciationType as any) || 'STRAIGHT_LINE',
            investment.startDate,
            new Date().toISOString().split('T')[0]
        );

        // Suggest daily amount for now, or maybe monthly? 
        // Let's suggest 30 days worth if it's been a while, or just 1 day?
        // Better: Suggest amount based on "Since Last Depreciation Date"
        // But for simplicity, let's just show the daily rate and let user multiply?
        // Or just pre-fill with 0 and let user decide.
        // Actually, let's calculate the amount since last depreciation date.

        const lastDate = (investment as any).lastDepreciationDate || investment.startDate;
        const today = new Date().toISOString().split('T')[0];

        // Re-calculate but with start date as lastDate? No, depreciation formula depends on total age.
        // We need (Total Depreciation Today) - (Total Depreciation at Last Date).

        const resultToday = calculateDepreciation(
            investment.purchasePrice || 0,
            investment.salvageValue || 0,
            investment.usefulLife || 5,
            (investment.depreciationType as any) || 'STRAIGHT_LINE',
            investment.startDate,
            today
        );

        const resultLast = calculateDepreciation(
            investment.purchasePrice || 0,
            investment.salvageValue || 0,
            investment.usefulLife || 5,
            (investment.depreciationType as any) || 'STRAIGHT_LINE',
            investment.startDate,
            lastDate
        );

        const suggestedAmount = Math.max(0, resultToday.accumulatedDepreciation - resultLast.accumulatedDepreciation);

        setDepreciationId(investment.id);
        setDepreciationAmount(suggestedAmount.toFixed(2));
        setDepreciationDate(today);
    };

    const handleDepreciationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (depreciationId && depreciationAmount) {
            await recordDepreciation(depreciationId, parseFloat(depreciationAmount), depreciationDate);
            setDepreciationId(null);
            setDepreciationAmount('');
            window.location.reload();
        }
    };

    const calculateReturn = (investment: Investment) => {
        // Handle ASSET type with depreciation
        if (investment.type === 'ASSET' && investment.purchasePrice && investment.salvageValue !== null && investment.usefulLife && investment.depreciationType) {
            const depResult = calculateDepreciation(
                investment.purchasePrice,
                investment.salvageValue,
                investment.usefulLife,
                investment.depreciationType as 'STRAIGHT_LINE' | 'DECLINING_BALANCE',
                investment.startDate
            );
            // For assets, the "profit" is negative (depreciation loss)
            return {
                value: depResult.bookValue,
                profit: depResult.bookValue - investment.purchasePrice,
                percent: ((depResult.bookValue - investment.purchasePrice) / investment.purchasePrice) * 100,
                depreciation: depResult.accumulatedDepreciation,
                dailyDepreciation: depResult.dailyDepreciation,
                remainingLife: depResult.remainingLife
            };
        } else if (investment.type === 'DEPOSIT' && investment.interestRate) {
            // Simple interest estimation for display
            const principal = investment.initialAmount;
            const rate = investment.interestRate / 100;
            // Calculate duration in years (approx)
            const start = new Date(investment.startDate);
            const end = investment.endDate ? new Date(investment.endDate) : new Date();
            const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
            const interest = principal * rate * Math.max(0, years);
            return {
                value: principal + interest,
                profit: interest,
                percent: (interest / principal) * 100
            };
        } else if (investment.currentAmount) {
            const profit = investment.currentAmount - investment.initialAmount;
            return {
                value: investment.currentAmount,
                profit,
                percent: (profit / investment.initialAmount) * 100
            };
        }
        return { value: investment.initialAmount, profit: 0, percent: 0 };
    };

    const activeInvestments = investments.filter(i => i.status === 'ACTIVE');

    // Convert all investments to currency items with proper conversion
    const investmentItems = activeInvestments.map(inv => ({
        amount: calculateReturn(inv).value,
        currencyCode: inv.currencyCode
    }));

    const initialCostItems = activeInvestments.map(inv => ({
        amount: inv.initialAmount,
        currencyCode: inv.currencyCode
    }));

    const { total: totalValue } = useCurrencyTotal(investmentItems, settings);
    const { total: totalCost } = useCurrencyTotal(initialCostItems, settings);
    const totalProfit = totalValue - totalCost;

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <ContentContainer>
            <PageHeader
                title={t('investments.title')}
                description={t('investments.desc')}
                action={
                    <button
                        onClick={() => setIsAdding(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        {t('investments.add')}
                    </button>
                }
            />

            {/* Portfolio Summary */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                    <div className="text-sm font-medium text-muted-foreground">{t('investments.total_value')}</div>
                    <div className="text-2xl font-bold mt-1">{settings.currency} {totalValue.toFixed(2)}</div>
                </div>
                <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                    <div className="text-sm font-medium text-muted-foreground">{t('investments.total_profit')}</div>
                    <div className={cn("text-2xl font-bold mt-1", totalProfit >= 0 ? "text-green-500" : "text-red-500")}>
                        {totalProfit >= 0 ? '+' : ''}{settings.currency} {totalProfit.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Investment List */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('investments.active_assets')}</h3>
                {activeInvestments.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/10">
                        {t('investments.empty')}
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {activeInvestments.map((investment) => {
                            const metrics = calculateReturn(investment);
                            return (
                                <div key={investment.id} className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                                    <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                {investment.type === 'ASSET' ? <Laptop className="h-4 w-4" /> :
                                                    investment.type === 'STOCK' ? <TrendingUp className="h-4 w-4" /> :
                                                        investment.type === 'DEPOSIT' ? <PiggyBank className="h-4 w-4" /> :
                                                            <Wallet className="h-4 w-4" />}
                                            </div>
                                            <div>
                                                <div className="font-medium">{investment.name}</div>
                                                <div className="text-xs text-muted-foreground">{t(`investments.type.${investment.type.toLowerCase()}`)}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleEdit(investment)} className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground">
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDeleteClick(investment.id)} className="p-1.5 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-sm text-muted-foreground">{t('investments.current_value')}</span>
                                            <span className="text-lg font-bold">
                                                {investment.currencyCode} {metrics.value.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-sm text-muted-foreground">{t('investments.cost_basis')}</span>
                                            <span className="text-sm">
                                                {investment.currencyCode} {(investment.purchasePrice || investment.initialAmount).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-sm text-muted-foreground">{t('investments.return')}</span>
                                            <span className={cn("text-sm font-medium", metrics.profit >= 0 ? "text-green-500" : "text-red-500")}>
                                                {metrics.profit >= 0 ? '+' : ''}{metrics.profit.toFixed(2)} ({metrics.percent.toFixed(2)}%)
                                            </span>
                                        </div>

                                        {/* Asset Specific Details */}
                                        {investment.type === 'ASSET' && (
                                            <div className="pt-2 border-t text-xs space-y-1">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">{t('investments.daily_depreciation')}</span>
                                                    <span>{metrics.dailyDepreciation?.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">{t('investments.remaining_life')}</span>
                                                    <span>{Math.ceil(metrics.remainingLife || 0)} {t('investments.days')}</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-3 flex gap-2">
                                            {investment.type === 'ASSET' ? (
                                                <button
                                                    onClick={() => handleDepreciationClick(investment)}
                                                    className="flex-1 px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-muted transition-colors"
                                                >
                                                    {t('investments.record_depreciation')}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleUpdateValueClick(investment)}
                                                    className="flex-1 px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-muted transition-colors"
                                                >
                                                    {t('investments.update_value')}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleRedeemClick(investment)}
                                                className="flex-1 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
                                            >
                                                {investment.type === 'ASSET' ? t('investments.sell') : t('investments.redeem')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
                        <h2 className="text-lg font-bold mb-4">{editingId ? t('investments.edit') : t('investments.add')}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">{t('investments.name')}</label>
                                <input
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Apple Stock, CD"
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('investments.type')}</label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    >
                                        <option value="DEPOSIT">{t('investments.type.deposit')}</option>
                                        <option value="STOCK">{t('investments.type.stock')}</option>
                                        <option value="FUND">{t('investments.type.fund')}</option>
                                        <option value="ASSET">{t('investments.type.asset')}</option>
                                        <option value="OTHER">{t('investments.type.other')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('investments.account')}</label>
                                    <select
                                        required
                                        value={accountId}
                                        onChange={(e) => setAccountId(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    >
                                        <option value="" disabled>{t('investments.select_account')}</option>
                                        {accounts.map(a => (
                                            <option key={a.id} value={a.id}>
                                                {a.icon} {a.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Notice about transaction type */}
                            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground flex gap-2">
                                <Wallet className="h-4 w-4 flex-shrink-0" />
                                <span>
                                    {type === 'ASSET'
                                        ? t('investments.depreciation_transfer_notice')
                                        : t('investments.transfer_notice')}
                                </span>
                            </div>

                            {type === 'ASSET' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground">{t('investments.purchase_price')}</label>
                                            <div className="flex gap-2">
                                                <div className="w-20 flex items-center justify-center rounded-md border border-input bg-muted px-2 py-1 text-sm opacity-70 cursor-not-allowed font-medium">
                                                    {currencyCode}
                                                </div>
                                                <input
                                                    required
                                                    type="number"
                                                    step="0.01"
                                                    value={purchasePrice}
                                                    onChange={(e) => setPurchasePrice(e.target.value)}
                                                    placeholder={t('investments.placeholder.price')}
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground">{t('investments.useful_life')}</label>
                                            <input
                                                required
                                                type="number"
                                                value={usefulLife}
                                                onChange={(e) => setUsefulLife(e.target.value)}
                                                placeholder={t('investments.placeholder.years')}
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground">{t('investments.salvage_value')}</label>
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                value={salvageValue}
                                                onChange={(e) => setSalvageValue(e.target.value)}
                                                placeholder={t('investments.placeholder.salvage')}
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground">{t('investments.depreciation_type')}</label>
                                            <select
                                                value={depreciationType}
                                                onChange={(e) => setDepreciationType(e.target.value as any)}
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                            >
                                                <option value="STRAIGHT_LINE">{t('investments.straight_line')}</option>
                                                <option value="DECLINING_BALANCE">{t('investments.declining_balance')}</option>
                                            </select>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground">{t('investments.amount')}</label>
                                        <div className="flex gap-2">
                                            <div className="w-20 flex items-center justify-center rounded-md border border-input bg-muted px-2 py-1 text-sm opacity-70 cursor-not-allowed font-medium">
                                                {currencyCode}
                                            </div>
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                value={initialAmount}
                                                onChange={(e) => setInitialAmount(e.target.value)}
                                                placeholder="0.00"
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                            />
                                        </div>
                                    </div>
                                    {type === 'DEPOSIT' && (
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground">{t('investments.rate')}</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={interestRate}
                                                onChange={(e) => setInterestRate(e.target.value)}
                                                placeholder={t('investments.placeholder.rate')}
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('investments.start_date')}</label>
                                    <input
                                        required
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('investments.end_date')}</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        placeholder="yyyy-mm-dd"
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-muted-foreground">{t('add.project')}</label>
                                <select
                                    value={projectId}
                                    onChange={(e) => setProjectId(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                >
                                    <option value="">{t('add.project_none')}</option>
                                    {projects.filter(p => p.status === 'ACTIVE').map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-muted-foreground">{t('investments.note')}</label>
                                <input
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                                >
                                    {t('investments.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                                >
                                    {editingId ? t('investments.update') : t('investments.add')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Redeem Modal */}
            {redeemId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-lg space-y-4 animate-in zoom-in-95">
                        <h2 className="text-lg font-bold">{t('investments.redeem')}</h2>
                        <form onSubmit={handleRedeemSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">{t('investments.final_amount')}</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    value={redeemAmount}
                                    onChange={(e) => setRedeemAmount(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">{t('investments.end_date')}</label>
                                <input
                                    required
                                    type="date"
                                    value={redeemDate}
                                    onChange={(e) => setRedeemDate(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">{t('investments.account')}</label>
                                <select
                                    value={redeemAccountId}
                                    onChange={(e) => setRedeemAccountId(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                >
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.id}>
                                            {a.icon} {a.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                                {t('investments.redeem_transfer_notice')}
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setRedeemId(null)}
                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                                >
                                    {t('investments.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                                >
                                    {t('investments.confirm')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Update Value Modal */}
            {
                updateValueId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-lg space-y-4 animate-in zoom-in-95">
                            <h2 className="text-lg font-bold">{t('investments.update_value_title')}</h2>
                            <form onSubmit={handleUpdateValueSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('investments.current_est')}</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={newValue}
                                        onChange={(e) => setNewValue(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                        autoFocus
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setUpdateValueId(null)}
                                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                                    >
                                        {t('investments.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                                    >
                                        {t('investments.update')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Record Depreciation Modal */}
            {
                depreciationId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-lg space-y-4 animate-in zoom-in-95">
                            <h2 className="text-lg font-bold">{t('investments.record_depreciation')}</h2>
                            <form onSubmit={handleDepreciationSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('investments.depreciation_amount')}</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={depreciationAmount}
                                        onChange={(e) => setDepreciationAmount(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('investments.depreciation_date')}</label>
                                    <input
                                        required
                                        type="date"
                                        value={depreciationDate}
                                        onChange={(e) => setDepreciationDate(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    />
                                </div>

                                <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                                    {t('investments.depreciation_confirm')}
                                </div>

                                <div className="flex justify-end gap-2 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setDepreciationId(null)}
                                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                                    >
                                        {t('investments.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                                    >
                                        {t('investments.confirm')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                deleteId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-lg space-y-4 animate-in zoom-in-95">
                            <h2 className="text-lg font-bold">{t('investments.delete_confirm')}</h2>
                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setDeleteId(null)}
                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                                >
                                    {t('investments.cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(deleteId!)}
                                    className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </ContentContainer>
    );
}
