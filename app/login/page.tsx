'use client';

import { useActionState } from 'react';
import { login } from '@/app/actions/auth';
import { Lock } from 'lucide-react';

const initialState = {
    error: '',
};

export default function LoginPage() {
    const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
        return await login(formData);
    }, initialState);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
                        <Lock className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
                        Sign in to your account
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Please enter your password to continue
                    </p>
                </div>
                <form className="mt-8 space-y-6" action={formAction}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    {state?.error && (
                        <div className="text-red-500 text-sm text-center">
                            {state.error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPending ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
