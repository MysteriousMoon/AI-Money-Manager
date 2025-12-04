'use client';

import Link from 'next/link';
import { Plus, Camera } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export function QuickActionsWidget() {
    const { t } = useTranslation();

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm h-full flex flex-col justify-center gap-3">
            <h3 className="text-gray-400 text-sm font-medium mb-1">{t('common.actions')}</h3>
            <Link
                href="/add?mode=manual"
                className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-md text-sm font-medium transition-colors"
            >
                <Plus className="h-4 w-4" />
                {t('dashboard.manual_add')}
            </Link>
            <Link
                href="/add?mode=scan"
                className="flex items-center justify-center gap-2 w-full border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-200 h-10 rounded-md text-sm font-medium transition-colors"
            >
                <Camera className="h-4 w-4" />
                {t('dashboard.scan_receipt')}
            </Link>
        </div>
    );
}
