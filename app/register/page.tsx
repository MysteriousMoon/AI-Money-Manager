'use client';

import { useActionState, useEffect } from 'react';
import { register } from '@/app/actions/auth';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { useStore } from '@/lib/store';

const initialState = {
    error: '',
    success: false,
};

// Wrapper to match useActionState signature
async function registerAction(prevState: any, formData: FormData) {
    const result = await register(formData);
    if (result?.error) {
        return { error: result.error, success: false };
    }
    return { error: '', success: result?.success || false };
}

export default function RegisterPage() {
    const [state, action, pending] = useActionState(registerAction, initialState);
    const { t } = useTranslation();
    const isLoading = useStore((state) => state.isLoading);

    // Force full page reload on successful registration
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
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-white">
                        {t('auth.create_account')}
                    </h2>
                </div>

                <div className="bg-gray-900 py-8 px-4 rounded-lg sm:px-10">
                    <form action={action} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 sr-only">
                                {t('auth.email_label')}
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="appearance-none block w-full px-3 py-3 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-800 text-white"
                                    placeholder={t('auth.email_label')}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-300 sr-only">
                                {t('auth.name_label')}
                            </label>
                            <div className="mt-1">
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    className="appearance-none block w-full px-3 py-3 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-800 text-white"
                                    placeholder={t('auth.name_label')}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 sr-only">
                                {t('auth.password_placeholder')}
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    className="appearance-none block w-full px-3 py-3 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-800 text-white"
                                    placeholder={t('auth.password_placeholder')}
                                />
                            </div>
                        </div>

                        {state.error && (
                            <div className="text-red-500 text-sm text-center">
                                {state.error}
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={pending}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                                {pending ? t('auth.creating_account') : t('auth.sign_up')}
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
                            {t('auth.already_have_account')}
                        </p>
                        <Link
                            href="/login"
                            className="w-full flex justify-center py-3 px-4 border border-gray-600 text-sm font-bold rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                        >
                            {t('auth.login')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
