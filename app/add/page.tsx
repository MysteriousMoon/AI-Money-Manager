'use client';

import { Suspense } from 'react';
import { useTranslation } from '@/lib/i18n';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

function AddTransactionContent() {
    const { t } = useTranslation();

    return (
        <div className="container md:max-w-5xl mx-auto p-4 pb-24 md:p-8 space-y-6">
            <header className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t('add.title')}</h1>
            </header>

            <div className="bg-card border rounded-xl shadow-sm p-6">
                <TransactionForm />
            </div>
        </div>
    );
}

export default function AddTransactionPage() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <AddTransactionContent />
        </Suspense>
    );
}
