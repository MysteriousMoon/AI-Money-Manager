'use client';

import { useState, useEffect } from 'react';
import { Save, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getSystemSettings, updateSystemSettings } from '@/app/actions/system';
import { testExchangeRateApi } from '@/lib/server-currency';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { ContentContainer } from '@/components/ui/content-container';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function AdminSettingsPage() {
    const [exchangeRateApiKey, setExchangeRateApiKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            const result = await getSystemSettings();
            if (result.success && result.data) {
                setExchangeRateApiKey(result.data.exchangeRateApiKey || '');
            }
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const result = await updateSystemSettings({ exchangeRateApiKey });
            if (result.success) {
                setMessage({ type: 'success', text: 'Settings saved successfully!' });
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to save' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        if (!exchangeRateApiKey) {
            setMessage({ type: 'error', text: 'Please enter an API key first' });
            return;
        }
        setTesting(true);
        setMessage(null);
        try {
            const result = await testExchangeRateApi(exchangeRateApiKey);
            if (result.success) {
                setMessage({ type: 'success', text: 'API key is valid!' });
            } else {
                setMessage({ type: 'error', text: result.error || 'Invalid API key' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Test failed' });
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <ContentContainer>
            <PageHeader
                title="System Settings"
                description="Global configuration for all users"
                action={
                    <Link
                        href="/admin/users"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Admin
                    </Link>
                }
            />

            <div className="max-w-2xl space-y-6">
                {/* Exchange Rate API */}
                <section className="bg-card border rounded-xl p-6 space-y-4">
                    <h2 className="text-lg font-semibold">Exchange Rate API</h2>
                    <p className="text-sm text-muted-foreground">
                        Configure the ExchangeRate-API key for currency conversion.
                        Get a free API key at <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">exchangerate-api.com</a>
                    </p>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">API Key</label>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                value={exchangeRateApiKey}
                                onChange={(e) => setExchangeRateApiKey(e.target.value)}
                                placeholder="Enter your API key..."
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                            <button
                                onClick={handleTest}
                                disabled={testing || !exchangeRateApiKey}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-3 disabled:opacity-50"
                            >
                                <RefreshCw className={cn("h-4 w-4", testing && "animate-spin")} />
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            If not configured, fallback rates will be used for currency conversion.
                        </p>
                    </div>

                    {message && (
                        <div className={cn(
                            "p-3 rounded-md text-sm",
                            message.type === 'success' ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                        )}>
                            {message.text}
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4"
                    >
                        {saving ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Settings
                    </button>
                </section>
            </div>
        </ContentContainer>
    );
}
