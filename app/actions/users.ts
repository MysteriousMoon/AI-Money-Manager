'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getUsers() {
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
        })
        return { success: true, data: users }
    } catch (error) {
        console.error('Failed to fetch users:', error)
        return { success: false, error: 'Failed to fetch users' }
    }
}

export async function getUser(id: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
        })
        if (!user) return { success: false, error: 'User not found' }
        return { success: true, data: user }
    } catch (error) {
        console.error('Failed to fetch user:', error)
        return { success: false, error: 'Failed to fetch user' }
    }
}

export async function createUser(formData: FormData) {
    const email = formData.get('email') as string
    const name = formData.get('name') as string
    const role = formData.get('role') as string
    const password = formData.get('password') as string

    if (!email) {
        return { success: false, error: 'Email is required' }
    }

    try {
        await prisma.user.create({
            data: {
                email,
                name,
                role: role || 'USER',
                password: password || '123456',
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
        })
        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        console.error('Failed to create user:', error)
        return { success: false, error: 'Failed to create user' }
    }
}

export async function updateUser(id: string, formData: FormData) {
    const email = formData.get('email') as string
    const name = formData.get('name') as string
    const role = formData.get('role') as string
    const password = formData.get('password') as string

    if (!email) {
        return { success: false, error: 'Email is required' }
    }

    try {
        const data: any = {
            email,
            name,
            role,
        }
        if (password) {
            data.password = password
        }

        await prisma.user.update({
            where: { id },
            data,
        })
        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        console.error('Failed to update user:', error)
        return { success: false, error: 'Failed to update user' }
    }
}

export async function deleteUser(id: string) {
    try {
        await prisma.user.delete({
            where: { id },
        })
        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        console.error('Failed to delete user:', error)
        return { success: false, error: 'Failed to delete user' }
    }
}
