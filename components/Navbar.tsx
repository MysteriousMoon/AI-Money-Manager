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

    const mainLinks = [
        { href: '/', label: t('nav.home'), icon: Home },
        { href: '/transactions', label: t('nav.transactions'), icon: List },
        { href: '/reports', label: t('nav.reports'), icon: PieChart },
    ];

    const dropdownLinks = [
        { href: '/investments', label: t('nav.investments'), icon: TrendingUp },
        { href: '/recurring', label: t('nav.recurring'), icon: Repeat },
        { href: '/projects', label: t('nav.projects'), icon: Wallet },
        { href: '/accounts', label: t('nav.accounts'), icon: Wallet },
    ];

    const isDropdownActive = dropdownLinks.some(link => pathname === link.href);

    // 修复 3: 增加 touchstart 监听，优化移动端“点击外部关闭”的体验
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside); // 新增
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside); // 新增
        };
    }, [isDropdownOpen]);

    if (pathname === '/login' || pathname === '/register' || isLoading) {
        return null;
    }

    return (
        <nav className="fixed bottom-6 left-4 right-4 rounded-full border border-white/20 shadow-2xl bg-white/10 dark:bg-black/10 backdrop-blur-3xl backdrop-saturate-150 z-50 select-none"> {/* Liquid Glass Effect */}
            {/* 修改点：
               1. 去掉了 justify-around，改用 grid 或 flex-1 均分 
               2. h-16 确保高度固定 
            */}
            <div className="flex h-16 items-center w-full px-2">

                {/* Main links */}
                {mainLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        // 修复 1: 添加 flex-1, h-full, w-full
                        // 让链接撑满父容器的分配空间，消除点击“死区”
                        // active:scale-95 增加点击时的按压反馈，手感更好
                        className={cn(
                            "flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all active:scale-95",
                            pathname === href ? "text-primary" : "text-muted-foreground hover:text-primary"
                        )}
                    >
                        <Icon className="h-5 w-5 md:h-4 md:w-4" />
                        <span className="text-[10px] md:text-xs font-medium">{label}</span>
                    </Link>
                ))}

                {/* Desktop Dropdown Links (Hidden on mobile) */}
                {dropdownLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className={cn(
                            "hidden md:flex flex-1 flex-col items-center justify-center gap-1 h-full transition-all active:scale-95",
                            pathname === href ? "text-primary" : "text-muted-foreground hover:text-primary"
                        )}
                    >
                        <Icon className="h-5 w-5 md:h-4 md:w-4" />
                        <span className="text-[10px] md:text-xs font-medium">{label}</span>
                    </Link>
                ))}

                {/* Mobile Dropdown Button */}
                <div className="flex-1 md:hidden h-full" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        // 同样撑满高度和宽度
                        className={cn(
                            "w-full h-full flex flex-col items-center justify-center gap-1 transition-all active:scale-95",
                            isDropdownActive ? "text-primary" : "text-muted-foreground hover:text-primary"
                        )}
                    >
                        <Menu className="h-5 w-5 md:h-4 md:w-4" />
                        <span className="flex items-center gap-1 text-[10px] font-medium">
                            {t('nav.more')}
                        </span>
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute bottom-full right-0 mb-4 w-48 bg-white/20 dark:bg-black/20 backdrop-blur-3xl backdrop-saturate-150 border border-white/20 rounded-2xl shadow-xl py-2 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-bottom-right">
                            {/* 这里的菜单样式也稍微优化了一下圆角和动画 */}
                            {dropdownLinks.map(({ href, label, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    onClick={() => setIsDropdownOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors active:bg-accent/80",
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

                {/* Settings */}
                <Link
                    href="/settings"
                    className={cn(
                        "flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all active:scale-95",
                        pathname === '/settings' ? "text-primary" : "text-muted-foreground hover:text-primary"
                    )}
                >
                    <Settings className="h-5 w-5 md:h-4 md:w-4" />
                    <span className="text-[10px] md:text-xs font-medium">{t('nav.settings')}</span>
                </Link>
            </div>
        </nav>
    );
}