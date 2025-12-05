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

// Get single project with all related data
export async function getProjectById(id: string) {
    return withAuth(async (userId) => {
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                transactions: {
                    orderBy: { date: 'desc' },
                    include: {
                        account: true,
                    }
                },
                investments: true,
            }
        });

        if (!project || project.userId !== userId) {
            throw new Error('Project not found or unauthorized');
        }

        return project;
    }, 'Failed to fetch project');
}

// Get project statistics and P&L analysis
export async function getProjectStats(id: string) {
    return withAuth(async (userId) => {
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                transactions: true,
                investments: true,
            }
        });

        if (!project || project.userId !== userId) {
            throw new Error('Project not found or unauthorized');
        }

        // Calculate basic stats
        const expenses = project.transactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + t.amount, 0);

        const income = project.transactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + t.amount, 0);

        const transfers = project.transactions
            .filter(t => t.type === 'TRANSFER')
            .reduce((sum, t) => sum + t.amount, 0);

        // Calculate depreciation from linked assets
        const depreciation = project.investments
            .filter(i => i.type === 'ASSET' && i.purchasePrice && i.currentAmount)
            .reduce((sum, i) => sum + ((i.purchasePrice || 0) - (i.currentAmount || 0)), 0);

        const netResult = income - expenses - depreciation;

        // Calculate amortized daily cost for TRIP/EVENT projects
        let amortizedDailyCost = null;
        let projectDays = null;

        if ((project.type === 'TRIP' || project.type === 'EVENT') && project.endDate) {
            const start = new Date(project.startDate);
            const end = new Date(project.endDate);
            projectDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
            amortizedDailyCost = expenses / projectDays;
        }

        // Calculate ROI for SIDE_HUSTLE
        let roi = null;
        if (project.type === 'SIDE_HUSTLE' || project.type === 'JOB') {
            const totalCost = expenses + depreciation;
            if (totalCost > 0) {
                roi = ((income - totalCost) / totalCost) * 100;
            }
        }

        // Budget utilization
        const budgetUtilization = project.totalBudget
            ? (expenses / project.totalBudget) * 100
            : null;

        return {
            projectId: id,
            projectType: project.type,

            // Totals
            totalExpenses: expenses,
            totalIncome: income,
            totalTransfers: transfers,
            totalDepreciation: depreciation,
            netResult,

            // Transaction counts
            transactionCount: project.transactions.length,
            assetCount: project.investments.length,

            // Budget
            budget: project.totalBudget,
            budgetUtilization,
            budgetRemaining: project.totalBudget ? project.totalBudget - expenses : null,

            // Amortization (for TRIP/EVENT)
            projectDays,
            amortizedDailyCost,

            // ROI (for JOB/SIDE_HUSTLE)
            roi,
        };
    }, 'Failed to calculate project stats');
}
