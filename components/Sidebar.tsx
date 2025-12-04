'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Settings, PieChart, Repeat, List, TrendingUp, Wallet, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { useStore } from '@/lib/store';

export function Sidebar() {
    const pathname = usePathname();
    const { t } = useTranslation();
    const isLoading = useStore((state) => state.isLoading);

    // Main navigation links
    const links = [
        { href: '/', label: t('nav.home'), icon: Home },
        { href: '/transactions', label: t('nav.transactions'), icon: List },
        { href: '/reports', label: t('nav.reports'), icon: PieChart },
        { href: '/investments', label: t('nav.investments'), icon: TrendingUp },
        { href: '/accounts', label: t('nav.accounts'), icon: Wallet },
        { href: '/projects', label: t('nav.projects'), icon: Wallet },
        { href: '/recurring', label: t('nav.recurring'), icon: Repeat },
    ];

    if (isLoading) return null;

    return (
        <aside className="hidden md:flex flex-col w-64 border-r bg-card h-screen sticky top-0">
            <div className="p-6 border-b">
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    {t('app.title')}
                </h1>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                <div className="mb-6 px-3">
                    <Link
                        href="?action=add"
                        scroll={false}
                        className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-md font-medium transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        {t('dashboard.manual_add')}
                    </Link>
                </div>

                <div className="space-y-1">
                    <p className="px-4 text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                        {t('nav.menu')}
                    </p>
                    {links.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                pathname === href
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            <span>{label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            <div className="p-4 border-t">
                <Link
                    href="/settings"
                    className={cn(
                        "flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                        pathname === '/settings'
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                >
                    <Settings className="h-4 w-4" />
                    <span>{t('nav.settings')}</span>
                </Link>
            </div>
        </aside>
    );
}
