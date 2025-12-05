'use client';

import { useState, useRef, useEffect, useTransition, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { recognizeReceipt } from '@/app/actions/recognize';
import { recognizeTransfer } from '@/app/actions/recognizeTransfer';
import { Camera, Upload, X, Loader2, Plus, Trash2, Save } from 'lucide-react';
import { cn, formatLocalDate } from '@/lib/utils';
import { Transaction } from '@/types';
import { useTranslation } from '@/lib/i18n';
import { CURRENCIES } from '@/lib/currency';
import { filterSystemCategories } from '@/lib/category-utils';

interface TransactionFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
    initialTab?: 'manual' | 'scan' | 'transfer';
    initialData?: Transaction;
    mode?: 'add' | 'edit';
}

export function TransactionForm({ onSuccess, onCancel, initialTab = 'manual', initialData, mode = 'add' }: TransactionFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const settings = useStore((state) => state.settings);
    const categories = useStore((state) => state.categories);
    const userCategories = filterSystemCategories(categories);
    const accounts = useStore((state) => state.accounts);
    const projects = useStore((state) => state.projects);
    const addTransaction = useStore((state) => state.addTransaction);
    const updateTransaction = useStore((state) => state.updateTransaction);

    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'manual' | 'scan' | 'transfer'>(initialTab);

    // Check if we're in transfer mode (from AI Transfer button)
    const isTransferMode = searchParams.get('mode') === 'transfer';

    // Form State (for manual entry)
    const [amount, setAmount] = useState(initialData?.amount.toString() || '');
    const [categoryId, setCategoryId] = useState(initialData?.categoryId || userCategories[0]?.id || '');
    const [accountId, setAccountId] = useState(initialData?.accountId || accounts.find(a => a.isDefault)?.id || accounts[0]?.id || '');
    const [currency, setCurrency] = useState(() => {
        if (initialData?.currencyCode) return initialData.currencyCode;
        const defaultAccount = accounts.find(a => a.isDefault) || accounts[0];
        return defaultAccount ? defaultAccount.currencyCode : settings.currency;
    });
    const [transferToAccountId, setTransferToAccountId] = useState(initialData?.transferToAccountId || '');
    const [targetAmount, setTargetAmount] = useState(initialData?.targetAmount?.toString() || '');
    const [targetCurrency, setTargetCurrency] = useState(initialData?.targetCurrencyCode || settings.currency);
    const [fee, setFee] = useState(initialData?.fee?.toString() || '');
    const [feeCurrency, setFeeCurrency] = useState(initialData?.feeCurrencyCode || settings.currency);
    const [date, setDate] = useState(initialData?.date || formatLocalDate(new Date()));
    const [merchant, setMerchant] = useState(initialData?.merchant || '');
    const [note, setNote] = useState(initialData?.note || '');
    const [projectId, setProjectId] = useState(initialData?.projectId || '');

    // v3.0: Smart Context - Track if user dismissed the context banner
    const [contextDismissed, setContextDismissed] = useState(false);

    // v3.0: Detect active TRIP/EVENT project based on current date
    const activeContextProject = useMemo(() => {
        const today = formatLocalDate(new Date());
        return projects.find(p =>
            (p.type === 'TRIP' || p.type === 'EVENT') &&
            p.status === 'ACTIVE' &&
            p.startDate <= today &&
            (!p.endDate || p.endDate >= today)
        );
    }, [projects]);

    // v3.0: Auto-select project if within active trip (only for new transactions)
    useEffect(() => {
        if (mode === 'add' && activeContextProject && !projectId && !contextDismissed) {
            setProjectId(activeContextProject.id);
        }
    }, [mode, activeContextProject, projectId, contextDismissed]);

    // Sync currency with account (only if not editing or if account changes)
    useEffect(() => {
        if (accountId && mode === 'add') {
            const account = accounts.find(a => a.id === accountId);
            if (account) {
                setCurrency(account.currencyCode);
            }
        }
    }, [accountId, accounts, mode]);

    // Scan State
    const [isScanning, setIsScanning] = useState(false);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [scanText, setScanText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Review State
    const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
    const [isReviewing, setIsReviewing] = useState(false);


    // Handle paste event for scan tab
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            if (activeTab !== 'scan') return;

            const items = e.clipboardData?.items;
            if (!items) return;

            const promises: Promise<string>[] = [];

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        const promise = new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                                const img = new Image();
                                img.onload = () => {
                                    const originalBase64 = event.target?.result as string;
                                    const sizeKB = Math.round(originalBase64.length / 1024);
                                    const sizeMB = sizeKB / 1024;

                                    if (sizeMB > 4) {
                                        const canvas = document.createElement('canvas');
                                        let width = img.width;
                                        let height = img.height;
                                        const MAX_SIZE = 1536;

                                        if (width > height) {
                                            if (width > MAX_SIZE) {
                                                height *= MAX_SIZE / width;
                                                width = MAX_SIZE;
                                            }
                                        } else {
                                            if (height > MAX_SIZE) {
                                                width *= MAX_SIZE / height;
                                                height = MAX_SIZE;
                                            }
                                        }

                                        canvas.width = width;
                                        canvas.height = height;
                                        const ctx = canvas.getContext('2d');
                                        ctx?.drawImage(img, 0, 0, width, height);

                                        const base64 = canvas.toDataURL('image/jpeg', 0.85);
                                        resolve(base64);
                                    } else {
                                        resolve(originalBase64);
                                    }
                                };
                                img.src = event.target?.result as string;
                            };
                            reader.readAsDataURL(blob);
                        });
                        promises.push(promise);
                    }
                }
            }

            if (promises.length > 0) {
                const base64Images = await Promise.all(promises);
                setPreviewUrls(prev => [...prev, ...base64Images]);
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [activeTab]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const promises: Promise<string>[] = [];

        Array.from(files).forEach(file => {
            const promise = new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const originalBase64 = event.target?.result as string;
                        const sizeKB = Math.round(originalBase64.length / 1024);
                        const sizeMB = sizeKB / 1024;

                        if (sizeMB > 4) {
                            const canvas = document.createElement('canvas');
                            let width = img.width;
                            let height = img.height;
                            const MAX_SIZE = 1536;

                            if (width > height) {
                                if (width > MAX_SIZE) {
                                    height *= MAX_SIZE / width;
                                    width = MAX_SIZE;
                                }
                            } else {
                                if (height > MAX_SIZE) {
                                    width *= MAX_SIZE / height;
                                    height = MAX_SIZE;
                                }
                            }

                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx?.drawImage(img, 0, 0, width, height);

                            const base64 = canvas.toDataURL('image/jpeg', 0.85);
                            resolve(base64);
                        } else {
                            resolve(originalBase64);
                        }
                    };
                    img.src = event.target?.result as string;
                };
                reader.readAsDataURL(file);
            });
            promises.push(promise);
        });

        const base64Images = await Promise.all(promises);
        setPreviewUrls(prev => [...prev, ...base64Images]);
    };

    const handleRemoveImage = (index: number) => {
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleScan = async () => {
        if (previewUrls.length === 0 && !scanText.trim()) return;

        setIsScanning(true);
        try {
            const defaultAccount = accounts.find(a => a.id === accountId) || accounts.find(a => a.isDefault) || accounts[0];
            const result = await recognizeReceipt(
                previewUrls,
                settings,
                userCategories.map(c => c.name),
                scanText,
                defaultAccount?.currencyCode || settings.currency,
                defaultAccount?.name || ''
            );

            if (result.success && result.data && result.data.length > 0) {
                // Create pending transactions for review
                const parsed = result.data.map(item => {
                    const matchedCategory = categories.find(c =>
                        c.name.toLowerCase() === item.category.toLowerCase()
                    );
                    const matchedAccount = accounts.find(a =>
                        a.name.toLowerCase() === (item.accountName || '').toLowerCase()
                    );

                    return {
                        id: crypto.randomUUID(),
                        amount: item.amount,
                        currencyCode: item.currency || settings.currency,
                        categoryId: matchedCategory?.id || userCategories[0]?.id || '',
                        accountId: matchedAccount?.id || accountId || accounts[0]?.id || '',
                        date: item.date || formatLocalDate(new Date()),
                        merchant: item.merchant,
                        note: item.summary,
                        type: (matchedCategory?.type as 'EXPENSE' | 'INCOME') || 'EXPENSE',
                        source: 'AI_SCAN' as const,
                    };
                });

                setPendingTransactions(parsed);
                setIsReviewing(true);
                setPreviewUrls([]);
                setScanText('');
            } else {
                alert(result.error || 'Failed to recognize receipt');
            }
        } catch (error) {
            console.error('Scan error:', error);
            alert('An error occurred during scanning');
        } finally {
            setIsScanning(false);
        }
    };

    const handleSaveAllPending = async () => {
        for (const tx of pendingTransactions) {
            await addTransaction(tx);
        }
        setPendingTransactions([]);
        setIsReviewing(false);
        if (onSuccess) {
            onSuccess();
        } else {
            router.push('/');
        }
    };

    const handleRemovePending = (id: string) => {
        setPendingTransactions(prev => prev.filter(tx => tx.id !== id));
        if (pendingTransactions.length <= 1) {
            setIsReviewing(false);
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const transactionData: any = {
            amount: parseFloat(amount),
            currencyCode: currency,
            categoryId: activeTab === 'transfer' ? undefined : categoryId,
            accountId: accountId || undefined,
            transferToAccountId: activeTab === 'transfer' ? (transferToAccountId || undefined) : undefined,
            targetAmount: (activeTab === 'transfer' && targetAmount) ? parseFloat(targetAmount) : undefined,
            targetCurrencyCode: (activeTab === 'transfer' && targetAmount) ? targetCurrency : undefined,
            fee: (activeTab === 'transfer' && fee) ? parseFloat(fee) : undefined,
            feeCurrencyCode: (activeTab === 'transfer' && fee) ? feeCurrency : undefined,
            date,
            merchant: activeTab === 'transfer' ? undefined : merchant,
            note,
            type: activeTab === 'transfer' ? 'TRANSFER' : (categories.find(c => c.id === categoryId)?.type as 'EXPENSE' | 'INCOME' || 'EXPENSE'),
            source: mode === 'edit' ? initialData?.source || 'MANUAL' : 'MANUAL',
            projectId: projectId || undefined,
        };

        if (mode === 'edit' && initialData) {
            await updateTransaction(initialData.id, transactionData);
        } else {
            await addTransaction({
                ...transactionData,
                id: crypto.randomUUID(),
            });
        }

        if (onSuccess) {
            onSuccess();
        } else {
            router.push('/');
        }
    };

    // Review mode UI
    if (isReviewing && pendingTransactions.length > 0) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{t('add.review_transactions')} ({pendingTransactions.length})</h3>
                    <button
                        onClick={handleSaveAllPending}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                        <Save className="h-4 w-4" />
                        {t('add.save_all')}
                    </button>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {pendingTransactions.map((tx) => {
                        const cat = categories.find(c => c.id === tx.categoryId);
                        const acc = accounts.find(a => a.id === tx.accountId);
                        return (
                            <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span>{cat?.icon}</span>
                                        <span className="font-medium truncate">{tx.merchant}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">{tx.note}</div>
                                    <div className="text-xs text-muted-foreground">{tx.date} • {acc?.name}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={cn("font-bold", tx.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500')}>
                                        {tx.type === 'INCOME' ? '+' : '-'}{new Intl.NumberFormat('en-US', { style: 'currency', currency: tx.currencyCode }).format(tx.amount)}
                                    </span>
                                    <button
                                        onClick={() => handleRemovePending(tx.id)}
                                        className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <button
                    onClick={() => { setPendingTransactions([]); setIsReviewing(false); }}
                    className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                    {t('common.cancel')}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* v3.0: Smart Context Banner */}
            {activeContextProject && !contextDismissed && mode === 'add' && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-project/10 dark:bg-project/20 border border-project/30 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-lg">{activeContextProject.type === 'TRIP' ? '✈️' : '📅'}</span>
                        <span>
                            {t('add.recording_for')} <strong className="text-project">{activeContextProject.name}</strong>
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setContextDismissed(true);
                            setProjectId('');
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {t('add.record_daily')}
                    </button>
                </div>
            )}

            <div className="flex bg-muted rounded-lg p-1 gap-1">
                <button
                    onClick={() => setActiveTab('manual')}
                    className={cn(
                        "flex-1 py-2 px-4 text-xs font-medium rounded-md transition-all duration-200",
                        activeTab === 'manual'
                            ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                >
                    {t('add.manual')}
                </button>
                <button
                    onClick={() => setActiveTab('scan')}
                    className={cn(
                        "flex-1 py-2 px-4 text-xs font-medium rounded-md transition-all duration-200",
                        activeTab === 'scan'
                            ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                >
                    {t('add.scan')}
                </button>
            </div>


            {activeTab === 'manual' && (
                <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-sm font-medium mb-1.5 block">{t('add.amount')}</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-bold"
                                    placeholder="0.00"
                                    required
                                />
                                <div className="h-10 flex items-center justify-center rounded-md border border-input bg-muted px-3 font-medium w-20">
                                    {currency}
                                </div>
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="text-sm font-medium mb-1.5 block">{t('add.category')}</label>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                {userCategories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.icon} {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1.5 block">{t('add.date')}</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1.5 block">{t('add.account')}</label>
                            <select
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                {accounts.map((a) => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="text-sm font-medium mb-1.5 block">{t('add.merchant')}</label>
                            <input
                                type="text"
                                value={merchant}
                                onChange={(e) => setMerchant(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder={t('add.optional')}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="text-sm font-medium mb-1.5 block">{t('add.note')}</label>
                            <input
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder={t('add.optional_desc')}
                            />
                        </div>

                        {/* Project Selection */}
                        {projects.length > 0 && (
                            <div className="col-span-2">
                                <label className="text-sm font-medium mb-1.5 block">{t('add.project')}</label>
                                <select
                                    value={projectId}
                                    onChange={(e) => setProjectId(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">{t('add.no_project')}</option>
                                    {projects
                                        .filter(p => p.status === 'ACTIVE')
                                        .map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.type === 'TRIP' ? '✈️' : p.type === 'JOB' ? '💼' : p.type === 'SIDE_HUSTLE' ? '✨' : '📅'} {p.name}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent rounded-md"
                            >
                                {t('common.cancel')}
                            </button>
                        )}
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md"
                        >
                            {t('add.save')}
                        </button>
                    </div>
                </form>
            )}

            {activeTab === 'scan' && (
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block">{t('add.scan_text_label') || '文字描述（可选）'}</label>
                        <textarea
                            value={scanText}
                            onChange={(e) => setScanText(e.target.value)}
                            placeholder={t('add.scan_text_placeholder') || '例如：星巴克咖啡 35元'}
                            className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-2 block">{t('add.scan_image_label') || '上传小票图片'}</label>
                        {previewUrls.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {previewUrls.map((url, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border bg-muted group">
                                        <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => handleRemoveImage(idx)}
                                            className="absolute top-1 right-1 bg-destructive/90 text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary hover:bg-muted/50 flex flex-col items-center justify-center gap-1 transition-colors"
                                >
                                    <Plus className="h-6 w-6 text-muted-foreground" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center space-y-3 py-6 border-2 border-dashed rounded-xl border-muted-foreground/25 bg-muted/50">
                                <div className="h-12 w-12 bg-background rounded-full flex items-center justify-center shadow-sm">
                                    <Camera className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4"
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    {t('add.upload_receipt')}
                                </button>
                                <p className="text-xs text-muted-foreground">{t('add.paste_hint') || '也可直接粘贴图片'}</p>
                            </div>
                        )}
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                    />
                    <button
                        onClick={handleScan}
                        disabled={(previewUrls.length === 0 && !scanText.trim()) || isScanning}
                        className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-11 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isScanning ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('add.analyzing')}
                            </>
                        ) : (
                            <>
                                <Camera className="mr-2 h-4 w-4" />
                                {t('add.scan_button')}
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
