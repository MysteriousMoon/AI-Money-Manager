'use server';

import { prisma } from '@/lib/db';
import { getCurrentUser } from './auth';

export async function getSystemSettings() {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        let settings = await prisma.systemSettings.findUnique({
            where: { id: 'default' }
        });

        if (!settings) {
            settings = await prisma.systemSettings.create({
                data: { id: 'default' }
            });
        }

        return { success: true, data: settings };
    } catch (error) {
        console.error('Failed to get system settings:', error);
        return { success: false, error: 'Failed to get system settings' };
    }
}

export async function updateSystemSettings(data: { exchangeRateApiKey?: string }) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const settings = await prisma.systemSettings.upsert({
            where: { id: 'default' },
            update: {
                exchangeRateApiKey: data.exchangeRateApiKey,
                updatedBy: user.id
            },
            create: {
                id: 'default',
                exchangeRateApiKey: data.exchangeRateApiKey,
                updatedBy: user.id
            }
        });

        return { success: true, data: settings };
    } catch (error) {
        console.error('Failed to update system settings:', error);
        return { success: false, error: 'Failed to update system settings' };
    }
}
