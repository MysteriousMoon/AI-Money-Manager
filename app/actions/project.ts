'use server';

import { prisma } from '@/lib/db';
import { Project } from '@prisma/client';
import { withAuth } from './auth';

export async function getProjects() {
    return withAuth(async (userId) => {
        return await prisma.project.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                _count: {
                    select: { transactions: true, investments: true }
                }
            }
        });
    }, 'Failed to fetch projects');
}

export async function createProject(data: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    return withAuth(async (userId) => {
        return await prisma.project.create({
            data: {
                ...data,
                userId: userId,
            },
        });
    }, 'Failed to create project');
}

export async function updateProject(id: string, data: Partial<Project>) {
    return withAuth(async (userId) => {
        const existing = await prisma.project.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== userId) {
            throw new Error('Project not found or unauthorized');
        }

        return await prisma.project.update({
            where: { id },
            data: data,
        });
    }, 'Failed to update project');
}

export async function deleteProject(id: string) {
    return withAuth(async (userId) => {
        const existing = await prisma.project.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== userId) {
            throw new Error('Project not found or unauthorized');
        }

        return await prisma.project.delete({
            where: { id },
        });
    }, 'Failed to delete project');
}
