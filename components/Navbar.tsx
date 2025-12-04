'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Settings, PieChart, Repeat, List, TrendingUp, Wallet, Menu, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { useState, useRef, useEffect } from 'react';

export function Navbar() {
    const pathname = usePathname();
    const { t } = useTranslation();
    const isLoading = useStore((state) => state.isLoading);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Main navigation links
    const mainLinks = [
        { href: '/', label: t('nav.home'), icon: Home },
        { href: '/transactions', label: t('nav.transactions'), icon: List },
        { href: '/reports', label: t('nav.reports'), icon: PieChart },
    ];

    // Dropdown menu links
    const dropdownLinks = [
        { href: '/investments', label: t('nav.investments'), icon: TrendingUp },
        { href: '/accounts', label: t('nav.accounts'), icon: Wallet },
        { href: '/recurring', label: t('nav.recurring'), icon: Repeat },
    ];

    // Check if dropdown item is active
    const isDropdownActive = dropdownLinks.some(link => pathname === link.href);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

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
                {/* Main navigation links */}
                {mainLinks.map(({ href, label, icon: Icon }) => (
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

                {/* More dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors hover:text-primary md:flex-row md:text-sm md:gap-2",
                            isDropdownActive ? "text-primary" : "text-muted-foreground"
                        )}
                    >
                        <Menu className="h-5 w-5 md:h-4 md:w-4" />
                        <span className="flex items-center gap-1">
                            {t('nav.more')}
                            <ChevronDown className={cn(
                                "h-3 w-3 transition-transform hidden md:block",
                                isDropdownOpen && "rotate-180"
                            )} />
                        </span>
                    </button>

                    {/* Dropdown menu */}
                    {isDropdownOpen && (
                        <div className="absolute bottom-full md:bottom-auto md:top-full left-1/2 -translate-x-1/2 mb-2 md:mb-0 md:mt-2 w-48 bg-background border rounded-lg shadow-lg py-2 z-50">
                            {dropdownLinks.map(({ href, label, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    onClick={() => setIsDropdownOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent",
                                        pathname === href ? "text-primary bg-accent/50" : "text-muted-foreground"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{label}</span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Settings link */}
                <Link
                    href="/settings"
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors hover:text-primary md:flex-row md:text-sm md:gap-2",
                        pathname === '/settings' ? "text-primary" : "text-muted-foreground"
                    )}
                >
                    <Settings className="h-5 w-5 md:h-4 md:w-4" />
                    <span>{t('nav.settings')}</span>
                </Link>
            </div>
        </nav>
    );
}
