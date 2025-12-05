'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TransactionForm } from './TransactionForm';
import { useTranslation } from '@/lib/i18n';
import { X } from 'lucide-react';

export function TransactionModal() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useTranslation();

    const isOpen = searchParams.get('action') === 'add';

    const handleClose = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('action');
        router.replace(`${pathname}?${params.toString()}`);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-background w-full max-w-lg rounded-xl shadow-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">{t('add.title')}</h2>
                    <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-4">
                    <TransactionForm onSuccess={handleClose} onCancel={handleClose} />
                </div>
            </div>
        </div>
    );
}
