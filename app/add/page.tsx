'use client';

import { useState, useRef, useEffect, Suspense, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { recognizeReceipt } from '@/app/actions/recognize';
import { Camera, Upload, Check, X, Loader2, Plus, Trash2, Edit2, Save } from 'lucide-react';
import { cn, formatLocalDate } from '@/lib/utils';
import { Transaction } from '@/types';
import { useTranslation } from '@/lib/i18n';
import { CURRENCIES } from '@/lib/currency';

function AddTransactionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const settings = useStore((state) => state.settings);
    const categories = useStore((state) => state.categories);
    const addTransaction = useStore((state) => state.addTransaction);

    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'manual' | 'scan'>('manual');

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'scan') {
            setActiveTab('scan');
        }
    }, [searchParams]);

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
    const [currency, setCurrency] = useState(settings.currency);
    const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
    const [date, setDate] = useState(formatLocalDate(new Date()));
    const [merchant, setMerchant] = useState('');
    const [note, setNote] = useState('');

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
            console.log('[processImages] Number of images:', base64Images.length);
            console.log('[processImages] Text input length:', text.length);
            console.log('[processImages] Settings:', {
                apiBaseUrl: settings.apiBaseUrl,
                model: settings.model,
                hasApiKey: !!settings.apiKey,
                apiKeyLength: settings.apiKey?.length || 0
            });

            const categoryNames = categories.map(c => c.name);
            console.log('[processImages] Categories:', categoryNames);

            const result = await recognizeReceipt(base64Images, settings, categoryNames, text);
            console.log('[processImages] Recognition result:', result);

            if (result.success && result.data) {
                console.log('[processImages] Recognition successful, processing', result.data.length, 'transactions');
                const newTransactions: Transaction[] = result.data.map(data => {
                    // Try to match category
                    const matchedCategory = categories.find(c =>
                        c.name.toLowerCase().includes(data.category.toLowerCase()) ||
                        data.category.toLowerCase().includes(c.name.toLowerCase())
                    );

                    return {
                        id: crypto.randomUUID(),
                        amount: data.amount,
                        currencyCode: data.currency || settings.currency,
                        categoryId: matchedCategory ? matchedCategory.id : (categories[0]?.id || ''),
                        date: data.date || new Date().toISOString().split('T')[0],
                        merchant: data.merchant || '',
                        note: data.summary || '',
                        type: 'EXPENSE',
                        source: 'AI_SCAN',
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
            categoryId,
            date,
            merchant,
            note,
            type: 'EXPENSE',
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

    const handleSaveAll = () => {
        pendingTransactions.forEach(t => addTransaction(t));
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
            type: 'EXPENSE',
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
                                        onChange={(e) => handleUpdatePending(tx.id, { categoryId: e.target.value })}
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
                <div className="flex bg-muted rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={cn(
                            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                            activeTab === 'manual' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {t('add.manual')}
                    </button>
                    <button
                        onClick={() => setActiveTab('scan')}
                        className={cn(
                            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                            activeTab === 'scan' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {t('add.scan')}
                    </button>
                </div>
            </header>

            {activeTab === 'scan' ? (
                <div className="space-y-4">
                    {isScanning ? (
                        <div className="flex flex-col items-center justify-center space-y-8 py-12 border-2 border-dashed rounded-xl border-muted-foreground/25 bg-muted/50">
                            <div className="text-center space-y-4">
                                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                                <p className="text-muted-foreground animate-pulse">{t('add.analyzing')}</p>
                            </div>
                        </div>
                    ) : previewUrls.length > 0 ? (
                        <>
                            <div className="border-2 border-dashed rounded-xl border-muted-foreground/25 bg-muted/50 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-medium">已选择 {previewUrls.length} 张图片</h3>
                                    <button
                                        onClick={() => setPreviewUrls([])}
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        清空
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {previewUrls.map((url, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border bg-background group">
                                            <img src={url} alt={`Receipt ${idx + 1}`} className="object-cover w-full h-full" />
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
                                        <span className="text-xs text-muted-foreground">添加</span>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">补充文字说明 (可选)</label>
                                <textarea
                                    value={scanText}
                                    onChange={(e) => setScanText(e.target.value)}
                                    placeholder="可以粘贴或输入文字说明，帮助AI更准确识别..."
                                    className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                                />
                            </div>
                            <button
                                onClick={handleStartRecognition}
                                className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-12"
                            >
                                <Camera className="mr-2 h-4 w-4" />
                                开始识别 ({previewUrls.length} 张)
                            </button>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center justify-center space-y-8 py-12 border-2 border-dashed rounded-xl border-muted-foreground/25 bg-muted/50">
                                <div className="h-32 w-32 bg-background rounded-full flex items-center justify-center shadow-sm">
                                    <Camera className="h-12 w-12 text-muted-foreground" />
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="font-medium">{t('add.take_photo')}</h3>
                                    <p className="text-xs text-muted-foreground max-w-[200px]">
                                        支持一次上传多张图片进行识别
                                    </p>
                                </div>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-8"
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    {t('add.upload_receipt')}
                                </button>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">补充文字说明 (可选)</label>
                                <textarea
                                    value={scanText}
                                    onChange={(e) => setScanText(e.target.value)}
                                    placeholder="可以粘贴或输入文字说明，帮助AI更准确识别..."
                                    className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                                />
                            </div>
                        </div>
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />
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
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="h-12 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-24"
                                >
                                    {CURRENCIES.map((c) => (
                                        <option key={c.code} value={c.code}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

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
                                    required
                                >
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.icon} {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

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
