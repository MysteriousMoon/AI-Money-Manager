'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './auth';
import { cookies } from 'next/headers';

async function isAdmin() {
    const currentUser = await getCurrentUser();
    if (currentUser?.role === 'ADMIN') return true;

    const cookieStore = await cookies();
    const adminSession = cookieStore.get('admin_session')?.value;
    return adminSession === 'true';
}

export async function createUser(formData: FormData) {
    if (!await isAdmin()) {
        return { error: 'Unauthorized' };
    }

    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as string;

    if (!email || !password) {
        return { error: 'Email and password are required' };
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return { error: 'User already exists' };
        }

        await prisma.user.create({
            data: {
                email,
                name,
                password, // 注意：在真实应用中，请对密码进行哈希处理！
                role: role || 'USER',
                accounts: {
                    create: {
                        name: 'Cash',
                        type: 'CASH',
                        initialBalance: 0,
                        currencyCode: 'CNY',
                        isDefault: true,
                        color: '#10B981', // Emerald-500
                        icon: '💵'
                    }
                }
            },
        });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Failed to create user:', error);
        return { error: 'Failed to create user' };
    }
}

export async function deleteUser(userId: string) {
    if (!await isAdmin()) {
        return { error: 'Unauthorized' };
    }

    const currentUser = await getCurrentUser();
    if (currentUser && userId === currentUser.id) {
        return { error: 'Cannot delete yourself' };
    }

    try {
        await prisma.user.delete({
            where: { id: userId },
        });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete user:', error);
        return { error: 'Failed to delete user' };
    }
}

export async function updateUser(userId: string, formData: FormData) {
    if (!await isAdmin()) {
        return { error: 'Unauthorized' };
    }

    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    const role = formData.get('role') as string;
    const password = formData.get('password') as string;

    if (!email) {
        return { error: 'Email is required' };
    }

    try {
        const data: any = {
            email,
            name,
            role,
        };

        // 仅在提供新密码时更新密码
        if (password && password.trim() !== '') {
            data.password = password;
        }

        await prisma.user.update({
            where: { id: userId },
            data,
        });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Failed to update user:', error);
        return { error: 'Failed to update user' };
    }
}

export async function getUsers() {
    if (!await isAdmin()) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return { success: true, data: users };
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return { success: false, error: 'Failed to fetch users' };
    }
}

export async function getUser(id: string) {
    if (!await isAdmin()) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id },
        });
        if (!user) return { success: false, error: 'User not found' };
        return { success: true, data: user };
    } catch (error) {
        console.error('Failed to fetch user:', error);
        return { success: false, error: 'Failed to fetch user' };
    }
}
