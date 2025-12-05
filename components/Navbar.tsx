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
    const navRef = useRef<HTMLElement>(null);

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

    // 路由变化时自动关闭下拉菜单
    useEffect(() => {
        setIsDropdownOpen(false);
    }, [pathname]);

    // 交互优化：点击下拉菜单外部时关闭菜单
    // 关键修复：使用 mousedown 而非 touchstart，避免干扰 Link 组件的点击事件
    useEffect(() => {
        if (!isDropdownOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            // 只有在点击下拉菜单组件外部时才关闭
            if (dropdownRef.current && !dropdownRef.current.contains(target)) {
                setIsDropdownOpen(false);
            }
        };

        // 使用 mousedown 事件，不使用 touchstart
        // touchstart 会在 click 之前触发，干扰 Link 导航
        // 延迟添加监听器，避免打开菜单的点击事件立即关闭菜单
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 10);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    if (pathname === '/login' || pathname === '/register' || isLoading) {
        return null;
    }

    return (
        <nav ref={navRef} className="
            fixed bottom-6 left-4 right-4 z-50 select-none
            flex h-16 items-center px-2
            rounded-full 
            
            /* === 视觉核心：磨砂凝胶质感 === */
            /* 1. 边框高光 */
            border border-white/40 dark:border-white/10
            
            /* 2. 背景渐变 (80% -> 60% 不透明度)，保证文字清晰同时保留通透感 */
            bg-gradient-to-b from-white/80 to-white/60 
            dark:from-black/80 dark:to-black/60
            
            /* 3. 强力模糊与饱和度提升 */
            backdrop-blur-xl 
            backdrop-saturate-150
            
            /* 4. 柔和的弥散阴影 */
            shadow-[0_4px_30px_rgba(0,0,0,0.1)]
        ">

            {/* 顶层流光效果 (可选，增加润泽感) */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

            {/* Main links */}
            {mainLinks.map(({ href, label, icon: Icon }) => (
                <Link
                    key={href}
                    href={href}
                    // 布局优化：flex-1 + h-full 消除点击死区
                    className={cn(
                        "relative flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all duration-200 active:scale-95",
                        pathname === href ? "text-primary font-semibold" : "text-muted-foreground hover:text-primary"
                    )}
                >
                    <Icon className="h-5 w-5 md:h-4 md:w-4" />
                    <span className="text-[10px] md:text-xs">{label}</span>

                    {/* 选中时的底部微光指示器 (可选) */}
                    {pathname === href && (
                        <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary/50 blur-[1px]" />
                    )}
                </Link>
            ))}

            {/* Desktop Dropdown Links (Hidden on mobile) */}
            {dropdownLinks.map(({ href, label, icon: Icon }) => (
                <Link
                    key={href}
                    href={href}
                    className={cn(
                        "hidden md:flex flex-1 flex-col items-center justify-center gap-1 h-full transition-all duration-200 active:scale-95",
                        pathname === href ? "text-primary font-semibold" : "text-muted-foreground hover:text-primary"
                    )}
                >
                    <Icon className="h-5 w-5 md:h-4 md:w-4" />
                    <span className="text-[10px] md:text-xs">{label}</span>
                </Link>
            ))}

            {/* Mobile Dropdown Button */}
            <div className="flex-1 md:hidden h-full relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={cn(
                        "w-full h-full flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95 outline-none",
                        isDropdownActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-primary"
                    )}
                >
                    <Menu className="h-5 w-5 md:h-4 md:w-4" />
                    <span className="flex items-center gap-1 text-[10px]">
                        {t('nav.more')}
                    </span>
                </button>

                {isDropdownOpen && (
                    <div className="
                        absolute bottom-full right-0 mb-4 w-48 
                        /* 弹窗也保持一致的磨砂质感 */
                        bg-gradient-to-b from-white/90 to-white/70 
                        dark:from-black/90 dark:to-black/70
                        backdrop-blur-xl backdrop-saturate-150
                        border border-white/40 dark:border-white/10
                        
                        rounded-2xl shadow-xl py-2 z-50 
                        overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-bottom-right
                    ">
                        {dropdownLinks.map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setIsDropdownOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors active:bg-black/5 dark:active:bg-white/10",
                                    pathname === href ? "text-primary bg-primary/10" : "text-muted-foreground"
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
                    "flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all duration-200 active:scale-95",
                    pathname === '/settings' ? "text-primary font-semibold" : "text-muted-foreground hover:text-primary"
                )}
            >
                <Settings className="h-5 w-5 md:h-4 md:w-4" />
                <span className="text-[10px] md:text-xs">{t('nav.settings')}</span>
            </Link>
        </nav>
    );
}