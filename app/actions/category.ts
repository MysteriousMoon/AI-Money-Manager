'use server';

import { prisma } from '@/lib/db';
import { Category, DEFAULT_CATEGORIES } from '@/types';
import { getCurrentUser } from './auth';

export async function getCategories() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const categories = await prisma.category.findMany({
            where: {
                userId: user.id,
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
                    userId: user.id,
                }))
            });
            return { success: true, data: DEFAULT_CATEGORIES };
        }
        return { success: true, data: categories };
    } catch (error) {
        console.error('Failed to fetch categories:', error);
        return { success: false, error: 'Failed to fetch categories' };
    }
}

export async function addCategory(category: Category) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const newCategory = await prisma.category.create({
            data: {
                id: category.id,
                userId: user.id,
                name: category.name,
                icon: category.icon,
                type: category.type,
                isDefault: false
            },
        });
        return { success: true, data: newCategory };
    } catch (error) {
        console.error('Failed to add category:', error);
        return { success: false, error: 'Failed to add category' };
    }
}

export async function deleteCategory(id: string) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        await prisma.category.delete({
            where: {
                id,
                userId: user.id,
            },
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to delete category:', error);
        return { success: false, error: 'Failed to delete category' };
    }
}

export async function updateCategory(id: string, updates: Partial<Category>) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const updatedCategory = await prisma.category.update({
            where: {
                id,
                userId: user.id,
            },
            data: {
                name: updates.name,
                icon: updates.icon,
                type: updates.type,
            },
        });
        return { success: true, data: updatedCategory };
    } catch (error) {
        console.error('Failed to update category:', error);
        return { success: false, error: 'Failed to update category' };
    }
}
