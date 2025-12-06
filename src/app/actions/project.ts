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

        // 将 Decimal 字段转换为数字以供前端使用
        return projects.map(p => ({
            ...p,
            totalBudget: p.totalBudget ? toNumber(p.totalBudget) : null,
        }));
    }, 'Failed to fetch projects');
}

// 兼容前端的输入类型
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

// 获取单个项目及所有相关数据
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

// 获取项目统计数据和损益分析（包含汇率转换）
export async function getProjectStats(id: string) {
    return withAuth(async (userId) => {
        // 获取项目及其交易和投资
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

        // 获取用户设置以确定本位币和汇率 API Key
        const userSettings = await prisma.settings.findUnique({
            where: { userId }
        });

        const baseCurrency = userSettings?.currency || 'CNY';

        // 导入服务端汇率转换
        const { convertAmount } = await import('@/lib/server-currency');

        // 计算支出（含汇率转换）
        let expenses = 0;
        for (const t of project.transactions.filter(t => t.type === 'EXPENSE')) {
            expenses += await convertAmount(toNumber(t.amount), t.currencyCode, baseCurrency);
        }

        // 计算收入（含汇率转换）
        let income = 0;
        for (const t of project.transactions.filter(t => t.type === 'INCOME')) {
            income += await convertAmount(toNumber(t.amount), t.currencyCode, baseCurrency);
        }

        // 计算转账（通常为同币种，但仍进行转换）
        let transfers = 0;
        for (const t of project.transactions.filter(t => t.type === 'TRANSFER')) {
            transfers += await convertAmount(toNumber(t.amount), t.currencyCode, baseCurrency);
        }

        // 计算关联资产的折旧（含汇率转换）
        let depreciation = 0;
        for (const i of project.investments.filter(i => i.type === 'ASSET' && i.purchasePrice && i.currentAmount)) {
            const depreciationAmount = toNumber(i.purchasePrice) - toNumber(i.currentAmount);
            depreciation += await convertAmount(depreciationAmount, i.currencyCode, baseCurrency);
        }

        const netResult = income - expenses - depreciation;

        // 计算旅行/事件项目的每日摊销成本
        let amortizedDailyCost = null;
        let projectDays = null;

        if ((project.type === 'TRIP' || project.type === 'EVENT') && project.endDate) {
            const start = new Date(project.startDate);
            const end = new Date(project.endDate);
            projectDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
            amortizedDailyCost = expenses / projectDays;
        }

        // 计算副业/工作的投资回报率 (ROI)
        let roi = null;
        if (project.type === 'SIDE_HUSTLE' || project.type === 'JOB') {
            const totalCost = expenses + depreciation;
            if (totalCost > 0) {
                roi = ((income - totalCost) / totalCost) * 100;
            }
        }

        // 预算使用率（假设预算以本位币计）
        const budget = toNumber(project.totalBudget);
        const budgetUtilization = budget
            ? (expenses / budget) * 100
            : null;

        return {
            projectId: id,
            projectType: project.type,
            baseCurrency, // 在响应中包含本位币

            // 总计（均转换为本位币）
            totalExpenses: expenses,
            totalIncome: income,
            totalTransfers: transfers,
            totalDepreciation: depreciation,
            netResult,

            // 交易数量
            transactionCount: project.transactions.length,
            assetCount: project.investments.length,

            // 预算
            budget: budget,
            budgetUtilization,
            budgetRemaining: budget ? budget - expenses : null,

            // 摊销 (适用于 TRIP/EVENT)
            projectDays,
            amortizedDailyCost,

            // 投资回报率 (适用于 JOB/SIDE_HUSTLE)
            roi,
        };
    }, 'Failed to calculate project stats');
}
