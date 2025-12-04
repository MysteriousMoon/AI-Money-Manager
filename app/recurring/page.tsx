'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { RecurringRule, Transaction } from '@/types';
import { Plus, Trash2, Edit2, Check, X, Calendar, RefreshCw, Camera, Upload, Loader2 } from 'lucide-react';
import { cn, formatLocalDate } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { CURRENCIES } from '@/lib/currency';
import { recognizeRecurring } from '@/app/actions/recognizeRecurring';
import { filterSystemCategories } from '@/lib/category-utils';

import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function RecurringPage() {
    const { recurringRules, categories, accounts, addRecurringRule, updateRecurringRule, deleteRecurringRule, addTransaction, settings, isLoading } = useStore();
    const userCategories = filterSystemCategories(categories); // Filter out system categories
    const { t } = useTranslation();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'manual' | 'scan'>('manual');

    // Form State
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState(userCategories[0]?.id || '');
    const [accountId, setAccountId] = useState(accounts.find(a => a.isDefault)?.id || accounts[0]?.id || '');
    const [currencyCode, setCurrencyCode] = useState(settings.currency);
    const [frequency, setFrequency] = useState<RecurringRule['frequency']>('MONTHLY');
    const [startDate, setStartDate] = useState(formatLocalDate(new Date()));

    // Scan State
    const [isScanning, setIsScanning] = useState(false);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [scanText, setScanText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check for due bills on mount
    useEffect(() => {
        checkDueBills();
    }, [recurringRules]);

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
                                        console.log(`[Recurring Paste] Compressing image (${sizeMB.toFixed(2)} MB)`);
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
                                        console.log(`[Recurring Paste] Using original image (${sizeMB.toFixed(2)} MB, under 4MB threshold)`);
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

    const checkDueBills = () => {
        const today = formatLocalDate(new Date());
        let processed = false;

        recurringRules.forEach(rule => {
            if (rule.isActive && rule.nextRunDate <= today) {
                // Generate transaction
                const newTransaction: Transaction = {
                    id: crypto.randomUUID(),
                    amount: rule.amount,
                    currencyCode: rule.currencyCode,
                    categoryId: rule.categoryId,
                    accountId: rule.accountId || undefined,
                    date: rule.nextRunDate,
                    merchant: rule.name,
                    type: categories.find(c => c.id === rule.categoryId)?.type as 'EXPENSE' | 'INCOME' || 'EXPENSE',
                    source: 'RECURRING',
                    note: 'Auto-generated recurring bill',
                };
                addTransaction(newTransaction);

                // Calculate next due date
                // Fix timezone issue when creating date from string
                // Actually, since we store YYYY-MM-DD, we should parse it carefully or just manipulate the string/date
                // But since we want to add months/years, we need a Date object.
                // Let's use a simple approach: treat the string as local date components
                const [y, m, d] = rule.nextRunDate.split('-').map(Number);
                const nextDateObj = new Date(y, m - 1, d); // Local date

                if (rule.frequency === 'WEEKLY') nextDateObj.setDate(nextDateObj.getDate() + 7);
                else if (rule.frequency === 'MONTHLY') nextDateObj.setMonth(nextDateObj.getMonth() + 1);
                else if (rule.frequency === 'YEARLY') nextDateObj.setFullYear(nextDateObj.getFullYear() + 1);

                updateRecurringRule(rule.id, {
                    nextRunDate: formatLocalDate(nextDateObj)
                });
                processed = true;
            }
        });

        if (processed) {
            // alert('Recurring bills processed!');
        }
    };

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
                            console.log(`[Recurring Upload] Compressing image (${sizeMB.toFixed(2)} MB)`);
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
                            console.log(`[Recurring Upload] Using original image (${sizeMB.toFixed(2)} MB, under 4MB threshold)`);
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
            const result = await recognizeRecurring(
                previewUrls,
                settings,
                userCategories.map(c => c.name),
                scanText,
                settings.currency
            );

            if (result.success && result.data && result.data.length > 0) {
                const data = result.data[0];
                setName(data.name);
                setAmount(data.amount.toString());
                setCurrencyCode(data.currency || settings.currency);
                setFrequency(data.frequency);
                if (data.startDate) setStartDate(data.startDate);

                // Match category
                const matchedCategory = categories.find(c =>
                    c.name.toLowerCase() === data.category.toLowerCase()
                );
                if (matchedCategory) {
                    setCategoryId(matchedCategory.id);
                }

                setActiveTab('manual'); // Switch to form to review
                setPreviewUrls([]); // Clear images
            } else {
                alert(result.error || 'Failed to recognize recurring bill');
            }
        } catch (error) {
            console.error('Scan error:', error);
            alert('An error occurred during scanning');
        } finally {
            setIsScanning(false);
        }
    };

    const resetForm = () => {
        setName('');
        setAmount('');
        setCategoryId(userCategories[0]?.id || '');
        setAccountId(accounts.find(a => a.isDefault)?.id || accounts[0]?.id || '');
        setCurrencyCode(settings.currency);
        setFrequency('MONTHLY');
        setStartDate(formatLocalDate(new Date()));
        setIsAdding(false);
        setEditingId(null);
        setActiveTab('manual');
        setPreviewUrls([]);
        setScanText('');
    };

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        addRecurringRule({
            id: crypto.randomUUID(),
            name,
            amount: parseFloat(amount),
            currencyCode,
            categoryId,
            accountId: accountId || undefined,
            frequency,
            interval: 1,
            startDate,
            nextRunDate: startDate,
            isActive: true,
        });
        resetForm();
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            updateRecurringRule(editingId, {
                name,
                amount: parseFloat(amount),
                currencyCode,
                categoryId,
                accountId: accountId || undefined,
                frequency,
                startDate, // Note: changing start date doesn't reset nextDueDate automatically here, might want to logic that
            });
            resetForm();
        }
    };

    const startEdit = (rule: RecurringRule) => {
        setEditingId(rule.id);
        setName(rule.name);
        setAmount(rule.amount.toString());
        setCategoryId(rule.categoryId);
        setAccountId(rule.accountId || accounts.find(a => a.isDefault)?.id || '');
        setCurrencyCode(rule.currencyCode);
        setFrequency(rule.frequency);
        setStartDate(rule.startDate);
        setIsAdding(false);
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="container max-w-2xl mx-auto p-4 pb-24 md:pt-24 space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{t('recurring.title')}</h1>
                    <p className="text-muted-foreground text-sm">{t('recurring.desc')}</p>
                </div>
                <button
                    onClick={() => {
                        if (isAdding) {
                            setIsAdding(false);
                            setEditingId(null);
                        } else {
                            setCurrencyCode(settings.currency);
                            setIsAdding(true);
                        }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                    {isAdding ? (
                        <span className="flex items-center gap-1">{t('recurring.cancel')}</span>
                    ) : (
                        <span className="flex items-center gap-1">
                            <Plus className="h-4 w-4" /> {t('recurring.add_button')}
                        </span>
                    )}
                </button>
            </header>

            {/* Add Form (only for adding new, not editing) */}
            {isAdding && !editingId && (
                <div className="bg-muted/50 p-4 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2">
                    {/* Tabs */}
                    <div className="flex p-1 bg-background rounded-lg border mb-4">
                        <button
                            onClick={() => setActiveTab('manual')}
                            className={cn(
                                "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                                activeTab === 'manual' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t('add.manual')}
                        </button>
                        <button
                            onClick={() => setActiveTab('scan')}
                            className={cn(
                                "flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2",
                                activeTab === 'scan' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Camera className="h-4 w-4" />
                            {t('add.scan')}
                        </button>
                    </div>

                    {activeTab === 'manual' ? (
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('recurring.name')}</label>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Netflix, Rent..."
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('add.amount')}</label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('add.category')}</label>
                                    <select
                                        value={categoryId}
                                        onChange={(e) => setCategoryId(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    >
                                        {userCategories.map(c => (
                                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('add.account')}</label>
                                    <select
                                        value={accountId}
                                        onChange={(e) => setAccountId(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    >
                                        {accounts.map(a => (
                                            <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('add.currency')}</label>
                                    <select
                                        value={currencyCode}
                                        onChange={(e) => setCurrencyCode(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    >
                                        {CURRENCIES.map((c) => (
                                            <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('recurring.frequency')}</label>
                                    <select
                                        value={frequency}
                                        onChange={(e) => setFrequency(e.target.value as any)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    >
                                        <option value="WEEKLY">{t('recurring.frequency.weekly')}</option>
                                        <option value="MONTHLY">{t('recurring.frequency.monthly')}</option>
                                        <option value="YEARLY">{t('recurring.frequency.yearly')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('recurring.start_date')}</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                                >
                                    {t('recurring.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                                >
                                    {t('recurring.add_rule')}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <label className="text-sm font-medium mb-2 block">{t('recurring.scan_text_label')}</label>
                                <textarea
                                    value={scanText}
                                    onChange={(e) => setScanText(e.target.value)}
                                    placeholder={t('recurring.scan_text_placeholder')}
                                    className="w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">{t('add.scan_image_label')}</label>
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
                        </div>
                    )}
                </div>
            )}



            <div className="space-y-3">
                {recurringRules.map((rule) => {
                    const category = categories.find(c => c.id === rule.categoryId);
                    const isEditing = editingId === rule.id;

                    return (
                        <div
                            key={rule.id}
                            className="bg-card border rounded-lg overflow-hidden"
                        >
                            {!isEditing ? (
                                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 group gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                            <RefreshCw className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold truncate">{rule.name}</h3>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                <span>{category?.icon} {category?.name}</span>
                                                <span>•</span>
                                                <span>{rule.frequency}</span>
                                                <span>•</span>
                                                <span>{t('recurring.next')}: {rule.nextRunDate}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-4 pl-14 md:pl-0">
                                        <span className="font-bold text-lg">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: rule.currencyCode }).format(rule.amount)}
                                        </span>

                                        <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => startEdit(rule)}
                                                className="p-2 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Delete this recurring rule?')) {
                                                        deleteRecurringRule(rule.id);
                                                    }
                                                }}
                                                className="p-2 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-muted/30">
                                    <form onSubmit={handleUpdate} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-medium text-muted-foreground">{t('recurring.name')}</label>
                                                <input
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    placeholder="Netflix, Rent..."
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-muted-foreground">{t('add.amount')}</label>
                                                <input
                                                    type="number"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-muted-foreground">{t('add.category')}</label>
                                                <select
                                                    value={categoryId}
                                                    onChange={(e) => setCategoryId(e.target.value)}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                >
                                                    {userCategories.map(c => (
                                                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-muted-foreground">{t('add.currency')}</label>
                                                <select
                                                    value={currencyCode}
                                                    onChange={(e) => setCurrencyCode(e.target.value)}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                >
                                                    {CURRENCIES.map((c) => (
                                                        <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-muted-foreground">{t('recurring.frequency')}</label>
                                                <select
                                                    value={frequency}
                                                    onChange={(e) => setFrequency(e.target.value as any)}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                >
                                                    <option value="WEEKLY">{t('recurring.frequency.weekly')}</option>
                                                    <option value="MONTHLY">{t('recurring.frequency.monthly')}</option>
                                                    <option value="YEARLY">{t('recurring.frequency.yearly')}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-muted-foreground">{t('recurring.start_date')}</label>
                                                <input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={resetForm}
                                                className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                                            >
                                                {t('recurring.cancel')}
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                                            >
                                                {t('recurring.update')}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    );
                })}

                {recurringRules.length === 0 && !isAdding && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>{t('recurring.empty')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
