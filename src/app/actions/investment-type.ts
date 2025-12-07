'use server';

import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/app/actions/auth';
import { revalidatePath } from 'next/cache';

export interface InvestmentTypeInput {
    name: string;
    category: string;
}

export async function getInvestmentTypes() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        const types = await prisma.investmentType.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        });

        return { success: true, data: types };
    } catch (error) {
        console.error('Failed to get investment types:', error);
        return { success: false, error: 'Failed to get investment types' };
    }
}

export async function addInvestmentType(data: InvestmentTypeInput) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        const newType = await prisma.investmentType.create({
            data: {
                userId: user.id,
                name: data.name,
                category: data.category,
            },
        });

        revalidatePath('/settings');
        revalidatePath('/investments');
        return { success: true, data: newType };
    } catch (error) {
        console.error('Failed to add investment type:', error);
        return { success: false, error: 'Failed to add investment type' };
    }
}

export async function updateInvestmentType(id: string, data: Partial<InvestmentTypeInput>) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        const updatedType = await prisma.investmentType.update({
            where: { id, userId: user.id },
            data: {
                ...data,
            },
        });

        revalidatePath('/settings');
        revalidatePath('/investments');
        return { success: true, data: updatedType };
    } catch (error) {
        console.error('Failed to update investment type:', error);
        return { success: false, error: 'Failed to update investment type' };
    }
}

export async function deleteInvestmentType(id: string) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        // Optional: Check if used by any investments first?
        // Actually, schema has SetNull on delete relation for optional link, 
        // but if we link investments, we might want to warn user.
        // For now, let's just delete. The investments will keep their hardcoded 'type' string 
        // but lose the link to the custom type definition.

        await prisma.investmentType.delete({
            where: { id, userId: user.id },
        });

        revalidatePath('/settings');
        revalidatePath('/investments');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete investment type:', error);
        return { success: false, error: 'Failed to delete investment type' };
    }
}
