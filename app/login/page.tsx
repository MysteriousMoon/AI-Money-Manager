'use client';

import { useActionState, useEffect } from 'react';
import { login } from '@/app/actions/auth';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useStore } from '@/lib/store';

const initialState = {
    error: '',
    success: false,
};

export default function LoginPage() {
    const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
        return await login(formData);
    }, initialState);
    const { t } = useTranslation();
    const isLoading = useStore((state) => state.isLoading);

    // Force full page reload on successful login
    useEffect(() => {
        if (state?.success) {
            window.location.href = '/';
        }
    }, [state?.success]);

    if (isLoading) {
        return null;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
            <div className="max-w-md w-full space-y-8 bg-gray-900 p-6">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-white">
                        {t('auth.login')}
                    </h2>
                </div>
                <form className="mt-8 space-y-6" action={formAction}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="sr-only">
                                {t('auth.email_placeholder')}
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none block w-full px-3 py-3 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-800 text-white"
                                placeholder={t('auth.email_placeholder')}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                {t('auth.password_placeholder')}
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none block w-full px-3 py-3 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-800 text-white"
                                placeholder={t('auth.password_placeholder')}
                            />
                        </div>
                    </div>

                    {state?.error && (
                        <div className="rounded-md bg-red-500/10 p-4 border border-red-500/20">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-400">
                                        {state.error}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-md text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            {isPending ? t('auth.logging_in') : t('auth.login')}
                        </button>
                    </div>
                </form>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-700" />
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-400 mb-4">
                        {t('auth.dont_have_account')}
                    </p>
                    <Link
                        href="/register"
                        className="w-full flex justify-center py-3 px-4 border border-gray-600 text-sm font-bold rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                    >
                        {t('auth.sign_up')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
