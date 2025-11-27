'use server';

import { prisma } from '@/lib/db';
import { RecurringRule } from '@/types';
import { revalidatePath } from 'next/cache';

export async function getRecurringRules() {
    try {
        const rules = await prisma.recurringRule.findMany({
            orderBy: { createdAt: 'desc' }
        });

        // Map Prisma model to our Type
        const mappedRules = rules.map(rule => ({
            id: rule.id,
            name: rule.name,
            amount: rule.amount,
            currencyCode: rule.currencyCode,
            categoryId: rule.categoryId,
            frequency: rule.frequency as RecurringRule['frequency'],
            startDate: rule.startDate,
            nextDueDate: rule.nextRunDate,
            active: rule.isActive
        }));

        return { success: true, data: mappedRules };
    } catch (error) {
        console.error('Failed to fetch recurring rules:', error);
        return { success: false, error: 'Failed to fetch recurring rules' };
    }
}

export async function addRecurringRule(rule: RecurringRule) {
    try {
        const newRule = await prisma.recurringRule.create({
            data: {
                id: rule.id,
                name: rule.name,
                amount: rule.amount,
                currencyCode: rule.currencyCode,
                categoryId: rule.categoryId,
                frequency: rule.frequency,
                startDate: rule.startDate,
                nextRunDate: rule.nextDueDate,
                isActive: rule.active,
                // Default values for fields not in UI yet
                interval: 1,
            }
        });
        revalidatePath('/recurring');
        return { success: true, data: newRule };
    } catch (error) {
        console.error('Failed to add recurring rule:', error);
        return { success: false, error: 'Failed to add recurring rule' };
    }
}

export async function updateRecurringRule(id: string, updates: Partial<RecurringRule>) {
    try {
        // Map updates to Prisma fields
        const prismaUpdates: any = {};
        if (updates.name) prismaUpdates.name = updates.name;
        if (updates.amount) prismaUpdates.amount = updates.amount;
        if (updates.currencyCode) prismaUpdates.currencyCode = updates.currencyCode;
        if (updates.categoryId) prismaUpdates.categoryId = updates.categoryId;
        if (updates.frequency) prismaUpdates.frequency = updates.frequency;
        if (updates.startDate) prismaUpdates.startDate = updates.startDate;
        if (updates.nextDueDate) prismaUpdates.nextRunDate = updates.nextDueDate;
        if (updates.active !== undefined) prismaUpdates.isActive = updates.active;

        const updatedRule = await prisma.recurringRule.update({
            where: { id },
            data: prismaUpdates
        });
        revalidatePath('/recurring');
        return { success: true, data: updatedRule };
    } catch (error) {
        console.error('Failed to update recurring rule:', error);
        return { success: false, error: 'Failed to update recurring rule' };
    }
}

export async function deleteRecurringRule(id: string) {
    try {
        await prisma.recurringRule.delete({
            where: { id }
        });
        revalidatePath('/recurring');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete recurring rule:', error);
        return { success: false, error: 'Failed to delete recurring rule' };
    }
}
