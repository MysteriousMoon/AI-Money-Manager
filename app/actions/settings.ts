'use server';

import { prisma } from '@/lib/db';
import { AppSettings, DEFAULT_SETTINGS } from '@/types';

export async function getSettings() {
    try {
        const settings = await prisma.settings.findFirst();
        if (!settings) {
            // Create default settings
            const newSettings = await prisma.settings.create({
                data: DEFAULT_SETTINGS
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
        const existing = await prisma.settings.findFirst();
        if (existing) {
            const updated = await prisma.settings.update({
                where: { id: existing.id },
                data: settings,
            });
            return { success: true, data: updated };
        } else {
            // Should not happen if getSettings is called first, but handle it
            const newSettings = await prisma.settings.create({
                data: { ...DEFAULT_SETTINGS, ...settings }
            });
            return { success: true, data: newSettings };
        }
    } catch (error) {
        console.error('Failed to update settings:', error);
        return { success: false, error: 'Failed to update settings' };
    }
}
