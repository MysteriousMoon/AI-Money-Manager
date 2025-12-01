'use client';

import { useState, useRef, useEffect, Suspense, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { recognizeReceipt } from '@/app/actions/recognize';
import { recognizeTransfer } from '@/app/actions/recognizeTransfer';
import { Camera, Upload, Check, X, Loader2, Plus, Trash2, Edit2, Save, ArrowRightLeft } from 'lucide-react';
import { cn, formatLocalDate } from '@/lib/utils';
import { Transaction } from '@/types';
import { useTranslation } from '@/lib/i18n';
import { CURRENCIES, formatCurrency } from '@/lib/currency';

function AddTransactionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const settings = useStore((state) => state.settings);
    const categories = useStore((state) => state.categories);
    const accounts = useStore((state) => state.accounts);
    const addTransaction = useStore((state) => state.addTransaction);

    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'manual' | 'scan' | 'transfer'>(() => {
        // Check URL param on initial load
        const tab = searchParams.get('tab');
        if (tab === 'transfer') return 'transfer';
        if (tab === 'scan') return 'scan';
        return 'manual';
    });

    // Check if we're in transfer mode (from AI Transfer button)
    const isTransferMode = searchParams.get('mode') === 'transfer';



    // Handle paste event
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

                                    // Only compress if larger than 4MB
                                    if (sizeMB > 4) {
                                        console.log(`[Paste] Compressing image (${sizeMB.toFixed(2)} MB)`);
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
                                        console.log(`[Paste] Using original image (${sizeMB.toFixed(2)} MB, under 4MB threshold)`);
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

    // Form State (for manual entry)
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
    const [accountId, setAccountId] = useState(accounts.find(a => a.isDefault)?.id || accounts[0]?.id || '');
    const [currency, setCurrency] = useState(() => {
        const defaultAccount = accounts.find(a => a.isDefault) || accounts[0];
        return defaultAccount ? defaultAccount.currencyCode : settings.currency;
    });
    const [transferToAccountId, setTransferToAccountId] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [targetCurrency, setTargetCurrency] = useState(settings.currency);
    const [fee, setFee] = useState('');
    const [feeCurrency, setFeeCurrency] = useState(settings.currency);
    const [date, setDate] = useState(formatLocalDate(new Date()));
    const [merchant, setMerchant] = useState('');
    const [note, setNote] = useState('');

    // Sync currency with account when account changes (including initial load if needed)
    useEffect(() => {
        if (accountId) {
            const account = accounts.find(a => a.id === accountId);
            if (account) {
                setCurrency(account.currencyCode);
            }
        } else if (accounts.length > 0) {
            // If no account selected but accounts exist (e.g. initial load), select default
            const defaultAccount = accounts.find(a => a.isDefault) || accounts[0];
            if (defaultAccount) {
                setAccountId(defaultAccount.id);
                setCurrency(defaultAccount.currencyCode);
            }
        }
    }, [accountId, accounts]);
    // Scan State
    const [isScanning, setIsScanning] = useState(false);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    const [scanText, setScanText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Review State
    const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
    const [isReviewing, setIsReviewing] = useState(false);

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

                        // Only compress if larger than 4MB
                        if (sizeMB > 4) {
                            console.log(`[Upload] Compressing image (${sizeMB.toFixed(2)} MB)`);
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
                            console.log(`[Upload] Using original image (${sizeMB.toFixed(2)} MB, under 4MB threshold)`);
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

    const handleStartRecognition = () => {
        if (previewUrls.length === 0 && !scanText.trim()) return;
        processImages(previewUrls, scanText);
    };

    const transactions = useStore((state) => state.transactions);

    const processImages = async (base64Images: string[], text: string = '') => {
        setIsScanning(true);
        try {
            console.log('[processImages] Starting image processing...');
            console.log('[processImages] Transfer mode:', isTransferMode);
            console.log('[processImages] Number of images:', base64Images.length);
            console.log('[processImages] Text input length:', text.length);

            // TRANSFER MODE: Call recognizeTransfer
            if (isTransferMode) {
                const accountNames = accounts.map(a => a.name);
                const result = await recognizeTransfer(base64Images, settings, accountNames, text, settings.currency);
                console.log('[processImages] Transfer recognition result:', result);

                if (result.success && result.data) {
                    // Navigate to transfer tab with pre-filled data
                    const data = result.data;

                    // Try to match accounts
                    const fromAccount = accounts.find(a =>
                        a.name.toLowerCase() === data.fromAccount.toLowerCase() ||
                        data.fromAccount.toLowerCase().includes(a.name.toLowerCase())
                    );
                    const toAccount = accounts.find(a =>
                        a.name.toLowerCase() === data.toAccount.toLowerCase() ||
                        data.toAccount.toLowerCase().includes(a.name.toLowerCase())
                    );

                    // Pre-fill the transfer form
                    setActiveTab('transfer');
                    if (fromAccount) setAccountId(fromAccount.id);
                    if (toAccount) setTransferToAccountId(toAccount.id);
                    setAmount(data.amount.toString());
                    setCurrency(data.currency);
                    if (data.targetAmount) setTargetAmount(data.targetAmount.toString());
                    if (data.targetCurrency) setTargetCurrency(data.targetCurrency);
                    if (data.fee) setFee(data.fee.toString());
                    if (data.feeCurrency) setFeeCurrency(data.feeCurrency);
                    if (data.date) setDate(data.date);
                    if (data.note) setNote(data.note);

                    // Clear scan inputs
                    setPreviewUrls([]);
                    setScanText('');

                    alert('转账信息已识别！请检查并提交。');
                } else {
                    console.error('[processImages] Transfer recognition failed:', result.error);
                    alert('识别失败: ' + result.error);
                    setPreviewUrls([]);
                }
                return;
            }

            // NORMAL MODE: Call recognizeReceipt
            const categoryNames = categories.map(c => c.name);
            console.log('[processImages] Categories:', categoryNames);

            const defaultAccount = accounts.find(a => a.id === settings.defaultAccountId);
            const defaultAccountName = defaultAccount ? defaultAccount.name : '';

            const result = await recognizeReceipt(base64Images, settings, categoryNames, text, settings.currency, defaultAccountName);
            console.log('[processImages] Recognition result:', result);

            if (result.success && result.data) {
                console.log('[processImages] Recognition successful, processing', result.data.length, 'transactions');
                const newTransactions: Transaction[] = result.data.map(data => {
                    // Try to match category
                    const matchedCategory = categories.find(c =>
                        c.name.toLowerCase().includes(data.category.toLowerCase()) ||
                        data.category.toLowerCase().includes(c.name.toLowerCase())
                    );

                    // Try to match account
                    let matchedAccountId = settings.defaultAccountId || '';
                    if (data.accountName) {
                        const matchedAccount = accounts.find(a =>
                            a.name.toLowerCase() === data.accountName?.toLowerCase() ||
                            data.accountName?.toLowerCase().includes(a.name.toLowerCase())
                        );
                        if (matchedAccount) {
                            matchedAccountId = matchedAccount.id;
                        }
                    }

                    return {
                        id: crypto.randomUUID(),
                        amount: data.amount,
                        currencyCode: data.currency || settings.currency,
                        categoryId: matchedCategory ? matchedCategory.id : (categories[0]?.id || ''),
                        date: data.date || new Date().toISOString().split('T')[0],
                        merchant: data.merchant || '',
                        note: data.summary || '',
                        type: matchedCategory ? (matchedCategory.type as 'EXPENSE' | 'INCOME') : 'EXPENSE',
                        source: 'AI_SCAN',
                        accountId: matchedAccountId || undefined,
                    };
                });

                setPendingTransactions(newTransactions);
                setIsReviewing(true);
            } else {
                console.error('[processImages] Recognition failed:', result.error);
                alert('Recognition failed: ' + result.error);
                setPreviewUrls([]);
            }
        } catch (error) {
            console.error('[processImages] Unexpected error:', error);
            console.error('[processImages] Error stack:', error instanceof Error ? error.stack : 'N/A');
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert('An error occurred during processing: ' + errorMessage);
            setPreviewUrls([]);
        } finally {
            setIsScanning(false);
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newTransaction: Transaction = {
            id: crypto.randomUUID(),
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
            source: 'MANUAL',
        };
        addTransaction(newTransaction);
        startTransition(() => {
            router.push('/');
        });
    };

    const handleUpdatePending = (id: string, updates: Partial<Transaction>) => {
        setPendingTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const handleDeletePending = (id: string) => {
        setPendingTransactions(prev => prev.filter(t => t.id !== id));
        if (pendingTransactions.length <= 1) {
            setIsReviewing(false);
            setPreviewUrls([]);
        }
    };

    const handleSaveAll = async () => {
        // Save all transactions
        const promises = pendingTransactions.map(t => addTransaction(t));
        await Promise.all(promises);

        // Clear state to prevent duplicates
        setPendingTransactions([]);
        setPreviewUrls([]);
        setScanText('');
        setIsReviewing(false);

        // Redirect
        startTransition(() => {
            router.push('/');
        });
    };

    const handleAddManualTransaction = () => {
        const newTx: Transaction = {
            id: crypto.randomUUID(),
            amount: 0,
            currencyCode: settings.currency,
            categoryId: categories[0]?.id || '',
            date: new Date().toISOString().split('T')[0],
            merchant: '',
            note: '',
            type: categories[0]?.type as 'EXPENSE' | 'INCOME' || 'EXPENSE',
            source: 'MANUAL',
        };
        setPendingTransactions(prev => [...prev, newTx]);
    };

    if (isReviewing) {
        return (
            <div className="container max-w-md mx-auto p-4 pb-24 md:pt-24 space-y-6">
                <header className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">审核交易</h1>
                    <button onClick={() => { setIsReviewing(false); setPreviewUrls([]); setPendingTransactions([]); }} className="text-sm text-muted-foreground hover:text-foreground">取消</button>
                </header>

                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">识别的图片</span>
                        <span className="text-xs text-muted-foreground">{previewUrls.length} 张</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {previewUrls.map((url, idx) => (
                            <div key={idx} className="relative h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden border-2 border-background">
                                <img src={url} alt={`Receipt ${idx + 1}`} className="object-cover w-full h-full" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium text-muted-foreground">交易记录 ({pendingTransactions.length})</h2>
                        <button
                            onClick={handleAddManualTransaction}
                            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                        >
                            <Plus className="h-3 w-3" />
                            手动添加
                        </button>
                    </div>
                    {pendingTransactions.map((tx, index) => (
                        <div key={tx.id} className="bg-card rounded-lg border p-4 space-y-3 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{categories.find(c => c.id === tx.categoryId)?.icon || '📝'}</span>
                                    <h3 className="font-medium text-sm">交易 {index + 1}</h3>
                                    {tx.source === 'AI_SCAN' && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">AI识别</span>}
                                    {tx.source === 'MANUAL' && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">手动</span>}
                                </div>
                                <button onClick={() => handleDeletePending(tx.id)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">金额</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={tx.amount}
                                            onChange={(e) => handleUpdatePending(tx.id, { amount: parseFloat(e.target.value) || 0 })}
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-medium"
                                        />
                                        <select
                                            value={tx.currencyCode}
                                            onChange={(e) => handleUpdatePending(tx.id, { currencyCode: e.target.value })}
                                            className="h-9 rounded-md border border-input bg-background px-2 text-sm w-24"
                                        >
                                            {CURRENCIES.map((c) => (
                                                <option key={c.code} value={c.code}>{c.code}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">类别</label>
                                    <select
                                        value={tx.categoryId}
                                        onChange={(e) => {
                                            const newCategoryId = e.target.value;
                                            const category = categories.find(c => c.id === newCategoryId);
                                            handleUpdatePending(tx.id, {
                                                categoryId: newCategoryId,
                                                type: category?.type as 'EXPENSE' | 'INCOME' || 'EXPENSE'
                                            });
                                        }}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                    >
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">商家</label>
                                    <input
                                        type="text"
                                        value={tx.merchant || ''}
                                        onChange={(e) => handleUpdatePending(tx.id, { merchant: e.target.value })}
                                        placeholder="例如: 沃尔玛"
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">日期</label>
                                    <input
                                        type="date"
                                        value={tx.date}
                                        onChange={(e) => handleUpdatePending(tx.id, { date: e.target.value })}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('add.account')}</label>
                                    <select
                                        value={tx.accountId || ''}
                                        onChange={(e) => handleUpdatePending(tx.id, { accountId: e.target.value || undefined })}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                    >
                                        <option value="">{t('add.select_account')}</option>
                                        {accounts.map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">备注</label>
                                <input
                                    type="text"
                                    value={tx.note || ''}
                                    onChange={(e) => handleUpdatePending(tx.id, { note: e.target.value })}
                                    placeholder="商品详情..."
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-2">
                    <button
                        onClick={handleSaveAll}
                        disabled={pendingTransactions.length === 0}
                        className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-12 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        保存全部 ({pendingTransactions.length} 条)
                    </button>
                    <p className="text-xs text-center text-muted-foreground">
                        💡 提示: AI会自动将不同类别的商品拆分成多个交易
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container max-w-md mx-auto p-4 pb-24 md:pt-24 space-y-6">
            <header className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t('add.title')}</h1>
                <div className="flex bg-muted rounded-lg p-1 gap-1">
                    <button
                        onClick={() => {
                            setActiveTab('manual');
                            const params = new URLSearchParams(searchParams.toString());
                            params.set('tab', 'manual');
                            router.replace(`?${params.toString()}`);
                        }}
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
                        onClick={() => {
                            setActiveTab('scan');
                            const params = new URLSearchParams(searchParams.toString());
                            params.set('tab', 'scan');
                            router.replace(`?${params.toString()}`);
                        }}
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
            </header>

            {activeTab === 'scan' ? (
                <div className="space-y-4">
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div>
                            <label className="text-sm font-medium mb-2 block">
                                {isTransferMode ? '转账描述' : t('add.scan_text_label')}
                            </label>
                            <textarea
                                value={scanText}
                                onChange={(e) => setScanText(e.target.value)}
                                placeholder={isTransferMode
                                    ? '描述转账内容（如"从工商银行转500元到支付宝"）或粘贴转账信息...'
                                    : t('add.scan_text_placeholder')
                                }
                                className="w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">
                                {isTransferMode ? '上传转账截图（可选）' : t('add.scan_image_label')}
                            </label>
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
                                        <span className="text-xs text-muted-foreground">{t('add.upload_receipt')}</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center space-y-4 py-8 border-2 border-dashed rounded-xl border-muted-foreground/25 bg-muted/50">
                                    <div className="h-16 w-16 bg-background rounded-full flex items-center justify-center shadow-sm">
                                        <Camera className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4"
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        {t('add.upload_receipt')}
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleStartRecognition}
                            disabled={previewUrls.length === 0 && !scanText.trim()}
                            className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-12 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                    </div>
                </div>
            ) : (
                <form onSubmit={handleManualSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <label htmlFor="amount" className="text-sm font-medium">{t('add.amount')}</label>
                            <div className="flex gap-2">
                                <input
                                    id="amount"
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="block h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-semibold ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    required
                                />
                                {accountId ? (
                                    <div className="h-12 flex items-center justify-center rounded-md border border-input bg-muted px-3 text-sm font-medium w-24 text-muted-foreground">
                                        {currency}
                                    </div>
                                ) : (
                                    <select
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value)}
                                        className="h-12 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-24"
                                    >
                                        {CURRENCIES.map((c) => (
                                            <option key={c.code} value={c.code}>{c.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        {activeTab === 'transfer' ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">{t('add.from_account')}</label>
                                        <select
                                            value={accountId}
                                            onChange={(e) => {
                                                const newAccountId = e.target.value;
                                                // If selecting the same account as transfer target, swap them
                                                if (newAccountId === transferToAccountId) {
                                                    setTransferToAccountId(accountId);
                                                    // Update target currency for the swapped account
                                                    const oldAccount = accounts.find(a => a.id === accountId);
                                                    if (oldAccount) {
                                                        setTargetCurrency(oldAccount.currencyCode);
                                                        setFeeCurrency(oldAccount.currencyCode);
                                                    }
                                                }

                                                setAccountId(newAccountId);
                                                const account = accounts.find(a => a.id === newAccountId);
                                                if (account) {
                                                    setCurrency(account.currencyCode);
                                                }
                                            }}
                                            className="block h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                                        >
                                            {accounts.map((a) => (
                                                <option key={a.id} value={a.id}>
                                                    {a.icon} {a.name} ({formatCurrency(a.currentBalance, a.currencyCode)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">{t('add.transfer_to')}</label>
                                        <select
                                            value={transferToAccountId}
                                            onChange={(e) => {
                                                const newAccountId = e.target.value;
                                                setTransferToAccountId(newAccountId);
                                                const account = accounts.find(a => a.id === newAccountId);
                                                if (account) {
                                                    setTargetCurrency(account.currencyCode);
                                                    setFeeCurrency(account.currencyCode);
                                                }
                                            }}
                                            className="block h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                                            required
                                        >
                                            <option value="">{t('add.select_account')}</option>
                                            {accounts.filter(a => a.id !== accountId).map((a) => (
                                                <option key={a.id} value={a.id}>
                                                    {a.icon} {a.name} ({formatCurrency(a.currentBalance, a.currencyCode)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">{t('add.target_amount')}</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={targetAmount || ''}
                                            onChange={(e) => setTargetAmount(e.target.value)}
                                            className="block h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-semibold ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        />
                                        {transferToAccountId ? (
                                            <div className="h-12 flex items-center justify-center rounded-md border border-input bg-muted px-3 text-sm font-medium w-24 text-muted-foreground">
                                                {targetCurrency}
                                            </div>
                                        ) : (
                                            <select
                                                value={targetCurrency}
                                                onChange={(e) => setTargetCurrency(e.target.value)}
                                                className="h-12 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-24"
                                            >
                                                {CURRENCIES.map((c) => (
                                                    <option key={c.code} value={c.code}>{c.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">{t('add.fee')}</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={fee}
                                            onChange={(e) => setFee(e.target.value)}
                                            className="block h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-semibold ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        />
                                        <select
                                            value={feeCurrency}
                                            onChange={(e) => setFeeCurrency(e.target.value)}
                                            className="h-12 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-24"
                                        >
                                            {CURRENCIES.map((c) => (
                                                <option key={c.code} value={c.code}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">{t('add.account')}</label>
                                <select
                                    value={accountId}
                                    onChange={(e) => {
                                        const newAccountId = e.target.value;
                                        setAccountId(newAccountId);
                                        const account = accounts.find(a => a.id === newAccountId);
                                        if (account) {
                                            setCurrency(account.currencyCode);
                                        }
                                    }}
                                    className="block h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                                >
                                    {accounts.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.icon} {a.name} ({formatCurrency(a.currentBalance, a.currencyCode)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">{t('add.date')}</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="block h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">{t('add.category')}</label>
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="block h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                                    required={activeTab !== 'transfer'}
                                    disabled={activeTab === 'transfer'}
                                >
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.icon} {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {activeTab !== 'transfer' && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">{t('add.merchant')}</label>
                                <input
                                    type="text"
                                    value={merchant}
                                    onChange={(e) => setMerchant(e.target.value)}
                                    placeholder="e.g. Starbucks"
                                    className="block h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t('add.note')}</label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Optional description..."
                                rows={3}
                                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-12"
                    >
                        <Check className="mr-2 h-4 w-4" />
                        {t('add.save')}
                    </button>
                </form>
            )}
        </div>
    );
}

export default function AddTransactionPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <AddTransactionContent />
        </Suspense>
    );
}
