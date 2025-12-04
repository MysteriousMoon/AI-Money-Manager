'use server';

import { prisma } from '@/lib/db';
import { RecurringRule } from '@/types';
import { revalidatePath } from 'next/cache';
import { getCurrentUser, withAuth } from './auth';

export async function getRecurringRules() {
    return withAuth(async (userId) => {
        const rules = await prisma.recurringRule.findMany({
            where: {
                userId: userId,
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map Prisma model to our Type
        return rules.map(rule => ({
            id: rule.id,
            name: rule.name,
            amount: rule.amount,
            currencyCode: rule.currencyCode,
            categoryId: rule.categoryId,
            frequency: rule.frequency as RecurringRule['frequency'],
            interval: rule.interval,
            startDate: rule.startDate,
            nextRunDate: rule.nextRunDate,
            isActive: rule.isActive,
            accountId: rule.accountId || undefined,
            merchant: rule.merchant || undefined
        }));
    }, 'Failed to fetch recurring rules');
}

export async function addRecurringRule(rule: RecurringRule) {
    return withAuth(async (userId) => {
        const newRule = await prisma.recurringRule.create({
            data: {
                id: rule.id,
                userId: userId,
                name: rule.name,
                amount: rule.amount,
                currencyCode: rule.currencyCode,
                categoryId: rule.categoryId,
                frequency: rule.frequency,
                startDate: rule.startDate,
                nextRunDate: rule.nextRunDate,
                isActive: rule.isActive,
                accountId: rule.accountId,
                interval: rule.interval || 1,
                merchant: rule.merchant,
            }
        });
        revalidatePath('/recurring');
        return newRule;
    }, 'Failed to add recurring rule');
}

export async function updateRecurringRule(id: string, updates: Partial<RecurringRule>) {
    return withAuth(async (userId) => {
        // Map updates to Prisma fields
        const prismaUpdates: any = {};
        if (updates.name) prismaUpdates.name = updates.name;
        if (updates.amount) prismaUpdates.amount = updates.amount;
        if (updates.currencyCode) prismaUpdates.currencyCode = updates.currencyCode;
        if (updates.categoryId) prismaUpdates.categoryId = updates.categoryId;
        if (updates.frequency) prismaUpdates.frequency = updates.frequency;
        if (updates.interval) prismaUpdates.interval = updates.interval;
        if (updates.startDate) prismaUpdates.startDate = updates.startDate;
        if (updates.nextRunDate) prismaUpdates.nextRunDate = updates.nextRunDate;
        if (updates.isActive !== undefined) prismaUpdates.isActive = updates.isActive;
        if (updates.accountId) prismaUpdates.accountId = updates.accountId;
        if (updates.merchant) prismaUpdates.merchant = updates.merchant;

        const updatedRule = await prisma.recurringRule.update({
            where: {
                id,
                userId: userId,
            },
            data: prismaUpdates
        });
        revalidatePath('/recurring');
        return updatedRule;
    }, 'Failed to update recurring rule');
}

export async function deleteRecurringRule(id: string) {
    return withAuth(async (userId) => {
        await prisma.recurringRule.delete({
            where: {
                id,
                userId: userId,
            }
        });
        revalidatePath('/recurring');
    }, 'Failed to delete recurring rule');
}
