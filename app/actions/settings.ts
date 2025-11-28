'use server';

import { prisma } from '@/lib/db';
import { AppSettings, DEFAULT_SETTINGS } from '@/types';
import { getCurrentUser } from './auth';

export async function getSettings() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const settings = await prisma.settings.findUnique({
            where: { userId: user.id },
        });
        if (!settings) {
            // Create default settings for this user
            const newSettings = await prisma.settings.create({
                data: {
                    ...DEFAULT_SETTINGS,
                    userId: user.id,
                }
            });
            return { success: true, data: newSettings };
        }
        return { success: true, data: settings };
    } catch (error) {
        console.error('Failed to fetch settings:', error);
        return { success: false, error: 'Failed to fetch settings' };
    }
}

export async function updateSettings(settings: Partial<AppSettings>) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const existing = await prisma.settings.findUnique({
            where: { userId: user.id },
        });
        if (existing) {
            const updated = await prisma.settings.update({
                where: { userId: user.id },
                data: settings,
            });
            return { success: true, data: updated };
        } else {
            // Create if not exists
            const newSettings = await prisma.settings.create({
                data: {
                    ...DEFAULT_SETTINGS,
                    ...settings,
                    userId: user.id,
                }
            });
            return { success: true, data: newSettings };
        }
    } catch (error) {
        console.error('Failed to update settings:', error);
        return { success: false, error: 'Failed to update settings' };
    }
}
