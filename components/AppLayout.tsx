'use client';

import { Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { usePathname } from "next/navigation";
import { TransactionModal } from "@/components/transactions/TransactionModal";

export function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = pathname === '/login' || pathname === '/register';
    const isAdminPage = pathname?.startsWith('/admin');

    if (isAuthPage || isAdminPage) {
        return <main className="flex-1">{children}</main>;
    }

    return (
        <div className="flex min-h-screen bg-background">
            {/* Desktop Sidebar */}
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <main className="flex-1 pb-28 md:pb-0">
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Nav */}
            <div className="md:hidden">
                <Navbar />
            </div>

            <Suspense fallback={null}>
                <TransactionModal />
            </Suspense>
        </div>
    );
}
