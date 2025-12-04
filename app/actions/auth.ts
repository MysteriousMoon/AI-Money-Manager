'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const AUTH_COOKIE_NAME = 'auth_session';
// 30 days in seconds
const MAX_AGE = 60 * 60 * 24 * 30;

import { prisma } from '@/lib/db'

// Helper function to get current logged-in user
export async function getCurrentUser() {
    const cookieStore = await cookies();
    const userId = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!userId || userId === 'authenticated') {
        return null;
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        return user;
    } catch (error) {
        console.error('Failed to get current user:', error);
        return null;
    }
}

export async function withAuth<T>(
    handler: (userId: string) => Promise<T>,
    errorMessage: string = 'Action failed'
): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }
        const data = await handler(user.id);
        return { success: true, data };
    } catch (error: any) {
        console.error(errorMessage, error);
        return { success: false, error: errorMessage };
    }
}

export async function login(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Check User Table
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (user && user.password === password) {
        const cookieStore = await cookies();
        // Store userId instead of 'authenticated'
        cookieStore.set(AUTH_COOKIE_NAME, user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: MAX_AGE,
            path: '/',
            sameSite: 'lax',
        });
        // Also set admin session if user is admin, for convenience
        if (user.role === 'ADMIN') {
            cookieStore.set('admin_session', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24, // 1 day
                path: '/',
            })
        }
        // Return success instead of redirect to allow client-side full page reload
        return { success: true, error: '' };
    }

    return { success: false, error: 'Invalid email or password' };
}

export async function register(formData: FormData) {
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    const password = formData.get('password') as string;

    if (!email || !password || !name) {
        return { success: false, error: 'All fields are required' };
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return { success: false, error: 'Email already exists' };
        }

        const user = await prisma.user.create({
            data: {
                email,
                name,
                password, // Note: In a real app, hash this password!
                role: 'USER',
            },
        });

        // Auto-login after registration
        const cookieStore = await cookies();
        cookieStore.set(AUTH_COOKIE_NAME, user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: MAX_AGE,
            path: '/',
            sameSite: 'lax',
        });

        // Return success instead of redirect to allow client-side full page reload
        return { success: true, error: '' };
    } catch (error) {
        console.error('Registration failed:', error);
        return { success: false, error: 'Registration failed' };
    }
}


export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);
    redirect('/login');
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin'; // Fallback for dev

export async function loginAdmin(prevState: any, formData: FormData) {
    const password = formData.get('password') as string

    if (password === ADMIN_PASSWORD) {
        const cookieStore = await cookies()
        cookieStore.set('admin_session', 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        })
        redirect('/admin/users')
    } else {
        return { success: false, error: 'Invalid password' }
    }
}

export async function logoutAdmin() {
    const cookieStore = await cookies()
    cookieStore.delete('admin_session')
    redirect('/admin/login')
}
