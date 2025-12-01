'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, PiggyBank, Wallet } from 'lucide-react';
import { cn, formatLocalDate } from '@/lib/utils';
import { Investment } from '@prisma/client';
import { CURRENCIES } from '@/lib/currency';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function InvestmentsPage() {
    const { t } = useTranslation();
    const { investments, accounts, addInvestment, updateInvestment, deleteInvestment, closeInvestment, isLoading, settings } = useStore();
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

    // Redeem State
    const [redeemId, setRedeemId] = useState<string | null>(null);
    const [redeemAmount, setRedeemAmount] = useState('');

    const [redeemDate, setRedeemDate] = useState(formatLocalDate(new Date()));
    const [redeemAccountId, setRedeemAccountId] = useState(accounts.find(a => a.isDefault)?.id || accounts[0]?.id || '');

    // Delete confirmation state
    const [deleteId, setDeleteId] = useState<string | null>(null);


    const resetForm = () => {
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
        setIsAdding(false);
        setEditingId(null);
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
        setIsAdding(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const investmentData = {
            name,
            type,
            initialAmount: parseFloat(initialAmount),
            currentAmount: currentAmount ? parseFloat(currentAmount) : null,
            currencyCode,
            interestRate: interestRate ? parseFloat(interestRate) : null,
            startDate,
            endDate: endDate || null,
            note: note || null,
            accountId: accountId || null,
            status: 'ACTIVE',
        };

        if (editingId) {
            await updateInvestment(editingId, investmentData);
        } else {
            await addInvestment(investmentData);
        }
        resetForm();
        // Refresh page to ensure data is fully synced
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
        const stats = calculateReturn(investment);
        setRedeemAmount(stats.value.toFixed(2));
        setRedeemDate(formatLocalDate(new Date()));
    };

    const handleRedeemSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (redeemId && redeemAmount && redeemDate) {
            await closeInvestment(redeemId, parseFloat(redeemAmount), redeemDate, redeemAccountId || undefined);
            setRedeemId(null);
            setRedeemAmount('');
            setRedeemDate('');
        }
    };

    const calculateReturn = (investment: Investment) => {
        if (investment.type === 'DEPOSIT' && investment.interestRate) {
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

    const totalValue = investments.filter(i => i.status === 'ACTIVE').reduce((sum, inv) => sum + calculateReturn(inv).value, 0);
    const totalCost = investments.filter(i => i.status === 'ACTIVE').reduce((sum, inv) => sum + inv.initialAmount, 0);
    const totalProfit = totalValue - totalCost;

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="container max-w-2xl mx-auto p-4 pb-24 md:pt-24 space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{t('investments.title')}</h1>
                    <p className="text-muted-foreground text-sm">{t('investments.desc')}</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                    {isAdding ? <span className="flex items-center gap-1">{t('investments.cancel')}</span> : <span className="flex items-center gap-1"><Plus className="h-4 w-4" /> {t('investments.add')}</span>}
                </button>
            </header>

            {/* Portfolio Summary */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                    <div className="text-sm font-medium text-muted-foreground">{t('investments.total_value')}</div>
                    <div className="text-2xl font-bold mt-1">{settings.currency} {totalValue.toFixed(2)}</div>
                </div>
                <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                    <div className="text-sm font-medium text-muted-foreground">{t('investments.total_profit')}</div>
                    <div className={cn("text-2xl font-bold mt-1", totalProfit >= 0 ? "text-green-500" : "text-red-500")}>
                        {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Add/Edit Form */}
            {isAdding && (
                <form onSubmit={handleSubmit} className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm space-y-4 animate-in slide-in-from-top-2">
                    <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        {t('investments.deduct_notice')}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground">{t('investments.name')}</label>
                            <input
                                required
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Apple Stock, CD"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground">{t('investments.type')}</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                            >
                                <option value="DEPOSIT">{t('investments.type.deposit')}</option>
                                <option value="STOCK">{t('investments.type.stock')}</option>
                                <option value="OTHER">{t('investments.type.other')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-muted-foreground">Account</label>
                            <select
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                            >
                                {accounts.map(a => (
                                    <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground">{t('investments.initial_amount')}</label>
                            <div className="flex gap-2">
                                <select
                                    value={currencyCode}
                                    onChange={(e) => setCurrencyCode(e.target.value)}
                                    className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
                                >
                                    {CURRENCIES.map((c) => (
                                        <option key={c.code} value={c.code}>{c.code}</option>
                                    ))}
                                </select>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    value={initialAmount}
                                    onChange={(e) => setInitialAmount(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground">
                                {type === 'DEPOSIT' ? t('investments.interest_rate') : t('investments.current_value')}
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={type === 'DEPOSIT' ? interestRate : currentAmount}
                                onChange={(e) => type === 'DEPOSIT' ? setInterestRate(e.target.value) : setCurrentAmount(e.target.value)}
                                placeholder={type === 'DEPOSIT' ? "e.g. 3.5" : "Optional"}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                            />
                        </div>
                    </div>

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
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-muted-foreground">{t('investments.note')}</label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
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
                </form >
            )
            }

            {/* Redeem Modal */}
            {
                redeemId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <form onSubmit={handleRedeemSubmit} className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg space-y-4 animate-in zoom-in-95">
                            <h2 className="text-lg font-bold">{t('investments.redeem_title')}</h2>
                            <p className="text-sm text-muted-foreground">{t('investments.redeem_desc')}</p>

                            <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground flex items-center gap-2">
                                <Wallet className="h-4 w-4" />
                                {t('investments.return_notice')}
                            </div>

                            <div>
                                <label className="text-xs font-medium text-muted-foreground">{t('investments.final_amount')}</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    value={redeemAmount}
                                    onChange={(e) => setRedeemAmount(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
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
                                <label className="text-xs font-medium text-muted-foreground">Deposit To Account</label>
                                <select
                                    value={redeemAccountId}
                                    onChange={(e) => setRedeemAccountId(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                >
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                                    ))}
                                </select>
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
                                    {t('investments.confirm_redeem')}
                                </button>
                            </div>
                        </form>
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
                                    onClick={() => handleDelete(deleteId)}
                                    className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Investment List */}
            <div className="space-y-4">
                {investments.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        {t('investments.empty')}
                    </div>
                ) : (
                    [...investments]
                        .sort((a, b) => {
                            // Active investments first, closed ones last
                            if (a.status === 'ACTIVE' && b.status === 'CLOSED') return -1;
                            if (a.status === 'CLOSED' && b.status === 'ACTIVE') return 1;
                            // Within same status, sort by creation date (newest first)
                            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                        })
                        .map((inv) => {
                            const stats = calculateReturn(inv);
                            const isClosed = inv.status === 'CLOSED';
                            return (
                                <div key={inv.id} className={cn("rounded-lg border bg-card text-card-foreground shadow-sm p-4", isClosed && "opacity-60")}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                {inv.type === 'DEPOSIT' ? <PiggyBank className="h-5 w-5" /> :
                                                    inv.type === 'STOCK' ? <TrendingUp className="h-5 w-5" /> :
                                                        <Wallet className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <h3 className="font-medium flex items-center gap-2">
                                                    {inv.name}
                                                    {isClosed && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full uppercase">Closed</span>}
                                                </h3>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span className="px-1.5 py-0.5 rounded-full bg-muted border uppercase">
                                                        {inv.type === 'STOCK' ? t('investments.type.stock') :
                                                            inv.type === 'DEPOSIT' ? t('investments.type.deposit') :
                                                                inv.type === 'FUND' ? t('investments.type.fund') :
                                                                    t('investments.type.other')}
                                                    </span>
                                                    <span>{inv.currencyCode}</span>
                                                    <span>• {inv.startDate} {inv.endDate ? ` - ${inv.endDate}` : ''}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!isClosed && (
                                                <>
                                                    <button onClick={() => handleRedeemClick(inv)} className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded hover:bg-primary/20">
                                                        {t('investments.redeem')}
                                                    </button>
                                                    <button onClick={() => handleEdit(inv)} className="p-2 text-muted-foreground hover:text-primary">
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                            <button onClick={() => handleDeleteClick(inv.id)} className="p-2 text-muted-foreground hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t">
                                        <div>
                                            <div className="text-xs text-muted-foreground">{t('investments.initial')}</div>
                                            <div className="font-medium">{inv.initialAmount.toFixed(2)}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">{isClosed ? t('investments.final_amount') : t('investments.current_est')}</div>
                                            <div className="font-medium">{stats.value.toFixed(2)}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">{t('investments.return')}</div>
                                            <div className={cn("font-medium flex items-center gap-1", stats.profit >= 0 ? "text-green-500" : "text-red-500")}>
                                                {stats.profit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                {stats.profit.toFixed(2)} ({stats.percent.toFixed(1)}%)
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                )}
            </div>
        </div >
    );
}
