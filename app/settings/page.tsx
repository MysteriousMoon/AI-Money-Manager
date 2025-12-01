'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Save, RefreshCw, Moon, Sun, Laptop, List, ArrowRight, LogOut } from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { getExchangeRate } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { useTheme } from 'next-themes';

export default function SettingsPage() {
    const { settings, updateSettings, accounts } = useStore();
    const { t } = useTranslation();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [formData, setFormData] = useState(settings);
    const [isSaved, setIsSaved] = useState(false);
    const [isLoadingRates, setIsLoadingRates] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setFormData(settings);
    }, [settings]);

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
        <div className="container max-w-2xl mx-auto p-4 pb-24 md:pt-24 space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
                <p className="text-muted-foreground">{t('settings.desc')}</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Account Settings */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold border-b pb-2">{t('settings.account_preferences')}</h2>
                    <div className="grid gap-2">
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

                {/* AI Configuration */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold border-b pb-2">{t('settings.ai_config')}</h2>

                    <div className="grid gap-2">
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

                    <div className="grid gap-2">
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

                    <div className="grid gap-2">
                        <label htmlFor="model" className="text-sm font-medium">{t('settings.model')}</label>
                        <input
                            id="model"
                            name="model"
                            value={formData.model}
                            onChange={handleChange}
                            placeholder="gpt-4o"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                    </div>


                </section>

                {/* Currency Configuration */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold border-b pb-2">{t('settings.currency_loc')}</h2>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium">{t('settings.theme')}</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setTheme('light')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors",
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
                                    "flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors",
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
                                    "flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors",
                                    mounted && theme === 'system' ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                                )}
                            >
                                <Laptop className="h-4 w-4" />
                                {t('settings.theme.system')}
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-2">
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

                    <div className="grid gap-2">
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

                    {/* Data Management */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold border-b pb-2">{t('settings.data_management')}</h2>
                        <div className="grid gap-4">
                            <a
                                href="/categories"
                                className="flex items-center justify-between p-4 rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-muted/50 transition-colors"
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

                    <div className="grid gap-2">
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
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                            >
                                <RefreshCw className={cn("h-4 w-4", isLoadingRates && "animate-spin")} />
                            </button>
                        </div>
                    </div>
                </section>

                <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full md:w-auto"
                >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaved ? t('settings.saved') : t('settings.save')}
                </button>
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
        </div>
    );
}
