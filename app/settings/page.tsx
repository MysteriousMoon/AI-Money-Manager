'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Save, RefreshCw, Moon, Sun, Laptop, List, ArrowRight, LogOut } from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { fetchAIModels } from '@/app/actions/ai';
import { getExchangeRate } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { useTheme } from 'next-themes';
import { PageHeader } from '@/components/ui/page-header';
import { ContentContainer } from '@/components/ui/content-container';

import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function SettingsPage() {
    const { settings, updateSettings, accounts, isLoading } = useStore();
    const { t } = useTranslation();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [formData, setFormData] = useState(settings);
    const [isSaved, setIsSaved] = useState(false);
    const [isLoadingRates, setIsLoadingRates] = useState(false);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [availableModels, setAvailableModels] = useState<string[]>([]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <LoadingSpinner size={48} />
            </div>
        );
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setIsSaved(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateSettings(formData);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    const handleTestRates = async () => {
        setIsLoadingRates(true);
        try {
            // Force fetch rates
            localStorage.removeItem('expense_tracker_rates');
            await getExchangeRate('USD', formData.currency, formData);
            alert('Exchange rates fetched successfully!');
        } catch (error) {
            alert('Failed to fetch rates. Check your API Key.');
        } finally {
            setIsLoadingRates(false);
        }
    };

    return (
        <ContentContainer>
            <PageHeader
                title={t('settings.title')}
                description={t('settings.desc')}
                action={
                    <button
                        type="submit"
                        form="settings-form"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                        disabled={isSaved}
                    >
                        {isSaved ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        {isSaved ? t('settings.saved') : t('settings.save')}
                    </button>
                }
            />

            <form id="settings-form" onSubmit={handleSubmit} className="space-y-6">

                {/* General & Appearance */}
                <section className="bg-card border rounded-xl p-6 space-y-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Laptop className="h-5 w-5 text-primary" />
                        {t('settings.currency_loc')}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="language" className="text-sm font-medium">{t('settings.language')}</label>
                            <select
                                id="language"
                                name="language"
                                value={formData.language}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="en">English</option>
                                <option value="zh">中文 (Chinese)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="currency" className="text-sm font-medium">{t('settings.base_currency')}</label>
                            <select
                                id="currency"
                                name="currency"
                                value={formData.currency}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="CNY">CNY (¥)</option>
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="JPY">JPY (¥)</option>
                                <option value="GBP">GBP (£)</option>
                                <option value="CAD">CAD ($)</option>
                                <option value="AUD">AUD ($)</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('settings.theme')}</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setTheme('light')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors flex-1 justify-center",
                                    mounted && theme === 'light' ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                                )}
                            >
                                <Sun className="h-4 w-4" />
                                {t('settings.theme.light')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setTheme('dark')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors flex-1 justify-center",
                                    mounted && theme === 'dark' ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                                )}
                            >
                                <Moon className="h-4 w-4" />
                                {t('settings.theme.dark')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setTheme('system')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors flex-1 justify-center",
                                    mounted && theme === 'system' ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                                )}
                            >
                                <Laptop className="h-4 w-4" />
                                {t('settings.theme.system')}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Account Preferences */}
                <section className="bg-card border rounded-xl p-6 space-y-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <List className="h-5 w-5 text-primary" />
                        {t('settings.account_preferences')}
                    </h2>
                    <div className="space-y-2">
                        <label htmlFor="defaultAccountId" className="text-sm font-medium">{t('settings.default_account')}</label>
                        <select
                            id="defaultAccountId"
                            name="defaultAccountId"
                            value={formData.defaultAccountId || ''}
                            onChange={handleChange}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="">{t('settings.none')}</option>
                            {accounts.map(account => (
                                <option key={account.id} value={account.id}>
                                    {account.name} ({account.currencyCode})
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground">{t('settings.default_account_help')}</p>
                    </div>
                </section>

                {/* AI & Integration */}
                <section className="bg-card border rounded-xl p-6 space-y-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 text-primary" />
                        {t('settings.ai_config')}
                    </h2>

                    <div className="space-y-2">
                        <label htmlFor="apiKey" className="text-sm font-medium">{t('settings.api_key')}</label>
                        <input
                            id="apiKey"
                            name="apiKey"
                            type="password"
                            value={formData.apiKey}
                            onChange={handleChange}
                            placeholder="sk-..."
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                        <p className="text-xs text-muted-foreground">{t('settings.api_key_help')}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="apiBaseUrl" className="text-sm font-medium">{t('settings.base_url')}</label>
                            <input
                                id="apiBaseUrl"
                                name="apiBaseUrl"
                                value={formData.apiBaseUrl}
                                onChange={handleChange}
                                placeholder="https://api.openai.com/v1"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="model" className="text-sm font-medium">{t('settings.model')}</label>
                            <div className="flex gap-2">
                                <input
                                    id="model"
                                    name="model"
                                    value={formData.model}
                                    onChange={handleChange}
                                    placeholder="gpt-4o"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!formData.apiBaseUrl || !formData.apiKey) {
                                            alert(t('settings.api_config_required'));
                                            return;
                                        }
                                        setIsLoadingModels(true);
                                        try {
                                            const result = await fetchAIModels(formData.apiBaseUrl, formData.apiKey);
                                            if (result.success && result.models) {
                                                setAvailableModels(result.models);
                                                alert(t('settings.models_fetched'));
                                            } else {
                                                alert(result.error || t('settings.models_fetch_failed'));
                                            }
                                        } catch (e) {
                                            alert(t('settings.models_fetch_failed'));
                                        } finally {
                                            setIsLoadingModels(false);
                                        }
                                    }}
                                    disabled={isLoadingModels}
                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-3"
                                    title={t('settings.detect_models')}
                                >
                                    <RefreshCw className={cn("h-4 w-4", isLoadingModels && "animate-spin")} />
                                </button>
                            </div>
                            {availableModels.length > 0 && (
                                <div className="rounded-md border bg-muted/50 p-2 max-h-40 overflow-y-auto space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground px-2 mb-1">{t('settings.available_models')}</p>
                                    {availableModels.map((model) => (
                                        <button
                                            key={model}
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, model }));
                                                setAvailableModels([]); // Close list after selection
                                            }}
                                            className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-background hover:shadow-sm transition-all"
                                        >
                                            {model}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="exchangeRateApiKey" className="text-sm font-medium">{t('settings.exchange_api_key')}</label>
                        <div className="flex gap-2">
                            <input
                                id="exchangeRateApiKey"
                                name="exchangeRateApiKey"
                                type="password"
                                value={formData.exchangeRateApiKey}
                                onChange={handleChange}
                                placeholder={t('settings.exchange_key_placeholder')}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                            <button
                                type="button"
                                onClick={handleTestRates}
                                disabled={isLoadingRates || !formData.exchangeRateApiKey}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-3"
                            >
                                <RefreshCw className={cn("h-4 w-4", isLoadingRates && "animate-spin")} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Data Management */}
                <section className="bg-card border rounded-xl p-6 space-y-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <List className="h-5 w-5 text-primary" />
                        {t('settings.data_management')}
                    </h2>
                    <div className="grid gap-4">
                        <a
                            href="/categories"
                            className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-primary/10 rounded-full">
                                    <List className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-medium">{t('settings.manage_categories')}</h3>
                                    <p className="text-sm text-muted-foreground">{t('settings.manage_categories_desc')}</p>
                                </div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </a>
                    </div>
                </section>
            </form>

            <div className="border-t pt-8">
                <form action={logout}>
                    <button
                        type="submit"
                        className="flex items-center justify-center w-full md:w-auto px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-md transition-colors"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        {t('settings.sign_out')}
                    </button>
                </form>
            </div>
        </ContentContainer>
    );
}
