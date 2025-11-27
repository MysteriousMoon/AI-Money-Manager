'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const AUTH_COOKIE_NAME = 'auth_session';
// 30 days in seconds
const MAX_AGE = 60 * 60 * 24 * 30;

export async function login(formData: FormData) {
    const password = formData.get('password') as string;
    const envPassword = process.env.AUTH_PASSWORD;

    if (!envPassword) {
        // If no password is set in env, we can't authenticate.
        // In a real scenario, you might want to allow access or fail closed.
        // Here we fail closed for security.
        return { error: 'Authentication not configured.' };
    }

    if (password === envPassword) {
        const cookieStore = await cookies();
        cookieStore.set(AUTH_COOKIE_NAME, 'authenticated', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: MAX_AGE,
            path: '/',
            sameSite: 'lax',
        });
        redirect('/');
    } else {
        return { error: 'Invalid password' };
    }
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);
    redirect('/login');
}
