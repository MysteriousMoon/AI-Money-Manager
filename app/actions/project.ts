'use server';

import { prisma } from '@/lib/db';
import { Project } from '@prisma/client';
import { withAuth } from './auth';
import { toNumber } from '@/lib/decimal';

export async function getProjects() {
    return withAuth(async (userId) => {
        const projects = await prisma.project.findMany({
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

        // Convert Decimal fields to numbers for frontend consumption
        return projects.map(p => ({
            ...p,
            totalBudget: p.totalBudget ? toNumber(p.totalBudget) : null,
        }));
    }, 'Failed to fetch projects');
}

// Frontend-compatible input type
export interface ProjectInput {
    name: string;
    description?: string | null;
    status: string;
    type: string;
    startDate: string;
    endDate?: string | null;
    totalBudget?: number | null;
    currencyCode?: string | null;
}

export async function createProject(data: ProjectInput) {
    return withAuth(async (userId) => {
        return await prisma.project.create({
            data: {
                ...data,
                userId: userId,
            },
        });
    }, 'Failed to create project');
}

export async function updateProject(id: string, data: Partial<ProjectInput>) {
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

// Get project statistics and P&L analysis with currency conversion
export async function getProjectStats(id: string) {
    return withAuth(async (userId) => {
        // Fetch project with transactions and investments
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

        // Fetch user settings for base currency and exchange rate API key
        const userSettings = await prisma.settings.findUnique({
            where: { userId }
        });

        const baseCurrency = userSettings?.currency || 'CNY';

        // Import server currency conversion
        const { convertAmount } = await import('@/lib/server-currency');

        // Calculate expenses with currency conversion
        let expenses = 0;
        for (const t of project.transactions.filter(t => t.type === 'EXPENSE')) {
            expenses += await convertAmount(toNumber(t.amount), t.currencyCode, baseCurrency);
        }

        // Calculate income with currency conversion
        let income = 0;
        for (const t of project.transactions.filter(t => t.type === 'INCOME')) {
            income += await convertAmount(toNumber(t.amount), t.currencyCode, baseCurrency);
        }

        // Calculate transfers (usually same currency, but convert anyway)
        let transfers = 0;
        for (const t of project.transactions.filter(t => t.type === 'TRANSFER')) {
            transfers += await convertAmount(toNumber(t.amount), t.currencyCode, baseCurrency);
        }

        // Calculate depreciation from linked assets with currency conversion
        let depreciation = 0;
        for (const i of project.investments.filter(i => i.type === 'ASSET' && i.purchasePrice && i.currentAmount)) {
            const depreciationAmount = toNumber(i.purchasePrice) - toNumber(i.currentAmount);
            depreciation += await convertAmount(depreciationAmount, i.currencyCode, baseCurrency);
        }

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

        // Calculate ROI for SIDE_HUSTLE/JOB
        let roi = null;
        if (project.type === 'SIDE_HUSTLE' || project.type === 'JOB') {
            const totalCost = expenses + depreciation;
            if (totalCost > 0) {
                roi = ((income - totalCost) / totalCost) * 100;
            }
        }

        // Budget utilization (budget is assumed to be in base currency)
        const budget = toNumber(project.totalBudget);
        const budgetUtilization = budget
            ? (expenses / budget) * 100
            : null;

        return {
            projectId: id,
            projectType: project.type,
            baseCurrency, // Include base currency in response

            // Totals (all converted to base currency)
            totalExpenses: expenses,
            totalIncome: income,
            totalTransfers: transfers,
            totalDepreciation: depreciation,
            netResult,

            // Transaction counts
            transactionCount: project.transactions.length,
            assetCount: project.investments.length,

            // Budget
            budget: budget,
            budgetUtilization,
            budgetRemaining: budget ? budget - expenses : null,

            // Amortization (for TRIP/EVENT)
            projectDays,
            amortizedDailyCost,

            // ROI (for JOB/SIDE_HUSTLE)
            roi,
        };
    }, 'Failed to calculate project stats');
}
