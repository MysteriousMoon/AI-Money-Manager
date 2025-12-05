'use client';

import Link from 'next/link';
import { Plus, Camera } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export function QuickActionsWidget() {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 md:p-6 shadow-sm h-full flex flex-col justify-center gap-2 md:gap-3">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('common.actions')}</h3>
            <Link
                href="/add?mode=manual"
                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors shadow-sm"
            >
                <Plus className="h-4 w-4" />
                {t('dashboard.manual_add')}
            </Link>
            <Link
                href="/add?mode=scan"
                className="flex items-center justify-center gap-2 w-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
                <Camera className="h-4 w-4" />
                {t('dashboard.scan_receipt')}
            </Link>
            <p className="text-xs text-gray-600 text-center mt-1 hidden md:block">支持 AI 自动归类</p>
        </div>
    );
}

