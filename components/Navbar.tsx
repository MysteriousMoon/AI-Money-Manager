'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Settings, PieChart, Repeat, List, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { useStore } from '@/lib/store';

export function Navbar() {
    const pathname = usePathname();
    const { t } = useTranslation();
    const isLoading = useStore((state) => state.isLoading);

    const links = [
        { href: '/', label: t('nav.home'), icon: Home },
        { href: '/transactions', label: t('nav.transactions'), icon: List },
        { href: '/investments', label: t('nav.investments'), icon: TrendingUp },
        { href: '/reports', label: t('nav.reports'), icon: PieChart },
        { href: '/recurring', label: t('nav.recurring'), icon: Repeat },
        { href: '/settings', label: t('nav.settings'), icon: Settings },
    ];

    // Hide navbar on login and register pages
    if (pathname === '/login' || pathname === '/register') {
        return null;
    }

    if (isLoading) {
        return null;
    }

    return (
        <nav className="fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-lg md:top-0 md:bottom-auto md:border-b md:border-t-0 z-50">
            <div className="container mx-auto flex h-16 items-center justify-around md:justify-center md:gap-8">
                {links.map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors hover:text-primary md:flex-row md:text-sm md:gap-2",
                            pathname === href ? "text-primary" : "text-muted-foreground"
                        )}
                    >
                        <Icon className="h-5 w-5 md:h-4 md:w-4" />
                        <span>{label}</span>
                    </Link>
                ))}
            </div>
        </nav>
    );
}
