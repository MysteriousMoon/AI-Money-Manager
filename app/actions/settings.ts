'use server';

import { prisma } from '@/lib/db';
import { AppSettings, DEFAULT_SETTINGS } from '@/types';
import { getCurrentUser, withAuth } from './auth';

export async function getSettings() {
    return withAuth(async (userId) => {
        const settings = await prisma.settings.findUnique({
            where: { userId: userId },
        });
        if (!settings) {
            // Create default settings for this user
            return await prisma.settings.create({
                data: {
                    ...DEFAULT_SETTINGS,
                    userId: userId,
                }
            });
        }
        return settings;
    }, 'Failed to fetch settings');
}

export async function updateSettings(settings: Partial<AppSettings>) {
    return withAuth(async (userId) => {
        const existing = await prisma.settings.findUnique({
            where: { userId: userId },
        });
        if (existing) {
            return await prisma.settings.update({
                where: { userId: userId },
                data: settings,
            });
        } else {
            // Create if not exists
            return await prisma.settings.create({
                data: {
                    ...DEFAULT_SETTINGS,
                    ...settings,
                    userId: userId,
                }
            });
        }
    }, 'Failed to update settings');
}
