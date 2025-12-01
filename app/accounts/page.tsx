'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Plus, Edit2, Trash2, Check, X, ArrowRightLeft, Scan } from 'lucide-react';
import { formatCurrency, CURRENCIES } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';

const ACCOUNT_TYPES = [
    { value: 'BANK', labelKey: 'accounts.type.bank', icon: '🏦' },
    { value: 'DIGITAL_WALLET', labelKey: 'accounts.type.digital_wallet', icon: '📱' },
    { value: 'CASH', labelKey: 'accounts.type.cash', icon: '💵' },
    { value: 'CREDIT_CARD', labelKey: 'accounts.type.credit_card', icon: '💳' },
    { value: 'INVESTMENT', labelKey: 'accounts.type.investment', icon: '📈' },
    { value: 'OTHER', labelKey: 'accounts.type.other', icon: '📁' },
];

export default function AccountsPage() {
    const router = useRouter();
    const { accounts, settings, addAccount, updateAccount, deleteAccount, refreshAccounts } = useStore();
    const { t } = useTranslation();

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [type, setType] = useState('BANK');
    const [initialBalance, setInitialBalance] = useState('0');
    const [currencyCode, setCurrencyCode] = useState(settings.currency);
    const [icon, setIcon] = useState('🏦');
    const [color, setColor] = useState('#3B82F6');

    const resetForm = () => {
        setName('');
        setType('BANK');
        setInitialBalance('0');
        setCurrencyCode(settings.currency);
        setIcon('🏦');
        setColor('#3B82F6');
        setIsAdding(false);
        setEditingId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            await updateAccount(editingId, {
                name,
                type,
                initialBalance: parseFloat(initialBalance),
                currencyCode,
                icon,
                color,
            });
        } else {
            await addAccount({
                name,
                type,
                initialBalance: parseFloat(initialBalance),
                currencyCode,
                icon,
                color,
                isDefault: accounts.length === 0,
            });
        }
        resetForm();
        await refreshAccounts();
    };

    const handleEdit = (account: typeof accounts[0]) => {
        setName(account.name);
        setType(account.type);
        setInitialBalance(account.initialBalance.toString());
        setCurrencyCode(account.currencyCode);
        setIcon(account.icon || '🏦');
        setColor(account.color || '#3B82F6');
        setEditingId(account.id);
        setIsAdding(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm(t('accounts.delete_confirm'))) {
            await deleteAccount(id);
            await refreshAccounts();
        }
    };

    return (
        <div className="container max-w-2xl mx-auto p-4 pb-24 md:pt-24 space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{t('accounts.title')}</h1>
                    <p className="text-muted-foreground text-sm">{t('accounts.desc')}</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('accounts.add')}
                    </button>
                )}
            </header>

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => router.push('/add?tab=transfer')}
                    className="flex items-center justify-center gap-2 h-16 rounded-xl bg-card border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all font-medium text-primary"
                >
                    <ArrowRightLeft className="h-5 w-5" />
                    手动转账
                </button>
                <button
                    onClick={() => router.push('/add?tab=scan&mode=transfer')}
                    className="flex items-center justify-center gap-2 h-16 rounded-xl bg-card border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all font-medium text-primary"
                >
                    <Scan className="h-5 w-5" />
                    AI 转账
                </button>
            </div>

            {isAdding && (
                <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">{editingId ? t('accounts.edit_title') : t('accounts.new_title')}</h2>
                        <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">{t('accounts.name')}</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('accounts.name_placeholder')}
                                    className="mt-1 block h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">{t('accounts.type')}</label>
                                <select
                                    value={type}
                                    onChange={(e) => {
                                        setType(e.target.value);
                                        const selectedType = ACCOUNT_TYPES.find(t => t.value === e.target.value);
                                        if (selectedType) setIcon(selectedType.icon);
                                    }}
                                    className="mt-1 block h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    {ACCOUNT_TYPES.map((typeOption) => (
                                        <option key={typeOption.value} value={typeOption.value}>
                                            {typeOption.icon} {t(typeOption.labelKey)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">{t('accounts.initial_balance')}</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={initialBalance}
                                    onChange={(e) => setInitialBalance(e.target.value)}
                                    className="mt-1 block h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">{t('accounts.currency')}</label>
                                <select
                                    value={currencyCode}
                                    onChange={(e) => setCurrencyCode(e.target.value)}
                                    className="mt-1 block h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    {CURRENCIES.map((c) => (
                                        <option key={c.code} value={c.code}>
                                            {c.code}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">{t('accounts.icon')}</label>
                                <input
                                    type="text"
                                    value={icon}
                                    onChange={(e) => setIcon(e.target.value)}
                                    placeholder="🏦"
                                    maxLength={2}
                                    className="mt-1 block h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-center text-2xl"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">{t('accounts.color')}</label>
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="mt-1 block h-10 w-full rounded-md border border-input bg-background px-2 py-1"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="flex-1 inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10"
                            >
                                <Check className="h-4 w-4 mr-2" />
                                {editingId ? t('accounts.update') : t('accounts.create')}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-muted hover:bg-muted/80 h-10 px-4"
                            >
                                {t('accounts.cancel')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-3">
                {accounts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>{t('accounts.no_accounts')}</p>
                    </div>
                ) : (
                    accounts.map((account) => (
                        <div
                            key={account.id}
                            className="bg-card border rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className="h-12 w-12 rounded-full flex items-center justify-center text-2xl"
                                    style={{ backgroundColor: account.color || '#3B82F6' + '20' }}
                                >
                                    {account.icon || '🏦'}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold">{account.name}</h3>
                                        {account.isDefault && (
                                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                                {t('accounts.default')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {(() => {
                                            const typeObj = ACCOUNT_TYPES.find(t => t.value === account.type);
                                            return typeObj ? t(typeObj.labelKey) : account.type;
                                        })()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">{t('accounts.current_balance')}</p>
                                    <p className="text-lg font-bold">
                                        {formatCurrency(account.currentBalance, account.currencyCode)}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(account)}
                                        className="p-2 hover:bg-muted rounded-md"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(account.id)}
                                        className="p-2 hover:bg-destructive/10 text-destructive rounded-md"
                                        disabled={account.isDefault}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
