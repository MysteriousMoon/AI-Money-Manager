'use server';

import { prisma } from '@/lib/db';
import { Category, DEFAULT_CATEGORIES } from '@/types';
import { getCurrentUser, withAuth } from './auth';

export async function getCategories() {
    return withAuth(async (userId) => {
        const categories = await prisma.category.findMany({
            where: {
                userId: userId,
            },
        });
        if (categories.length === 0) {
            // Seed default categories for this user if none exist
            await prisma.category.createMany({
                data: DEFAULT_CATEGORIES.map(c => ({
                    id: c.id,
                    name: c.name,
                    icon: c.icon,
                    type: c.type,
                    isDefault: true,
                    userId: userId,
                }))
            });
            return DEFAULT_CATEGORIES;
        }
        return categories;
    }, 'Failed to fetch categories');
}

export async function addCategory(category: Category) {
    return withAuth(async (userId) => {
        return await prisma.category.create({
            data: {
                id: category.id,
                userId: userId,
                name: category.name,
                icon: category.icon,
                type: category.type,
                isDefault: false
            },
        });
    }, 'Failed to add category');
}

export async function deleteCategory(id: string) {
    return withAuth(async (userId) => {
        await prisma.category.delete({
            where: {
                id,
                userId: userId,
            },
        });
    }, 'Failed to delete category');
}

export async function updateCategory(id: string, updates: Partial<Category>) {
    return withAuth(async (userId) => {
        return await prisma.category.update({
            where: {
                id,
                userId: userId,
            },
            data: {
                name: updates.name,
                icon: updates.icon,
                type: updates.type,
            },
        });
    }, 'Failed to update category');
}
