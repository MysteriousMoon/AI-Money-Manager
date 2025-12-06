export interface Transaction {
    id: string;
    amount: number;
    currencyCode: string;
    categoryId?: string;
    date: string; // ISO 8601 YYYY-MM-DD
    note?: string;
    merchant?: string;
    type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
    source: 'MANUAL' | 'AI_SCAN' | 'RECURRING';
    accountId?: string;
    transferToAccountId?: string;
    targetAmount?: number;
    targetCurrencyCode?: string;
    fee?: number;
    feeCurrencyCode?: string;
    investmentId?: string;
    investment?: any; // Using any to avoid importing Prisma types here for now, or we can import if needed
    projectId?: string;
    excludeFromAnalytics?: boolean;
    // v3.0: Split Transactions
    splitParentId?: string;
}


export interface Category {
    id: string;
    name: string;
    icon: string; // Emoji or Icon Name
    type: 'EXPENSE' | 'INCOME';
}

export interface RecurringRule {
    id: string;
    name: string;
    amount: number;
    currencyCode: string;
    categoryId: string;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    interval: number;
    startDate: string;
    lastRunDate?: string | null;
    nextRunDate: string;
    isActive: boolean;
    accountId?: string | null;
    merchant?: string | null;
    projectId?: string | null;
}

export type Settings = AppSettings;

export interface AppSettings {
    apiBaseUrl: string;
    apiKey: string;
    model: string;
    currency: string;
    exchangeRateApiKey: string;
    language: 'en' | 'zh';
    defaultAccountId?: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
    { id: '1', name: 'Food & Dining', icon: '🍽️', type: 'EXPENSE' },
    { id: '2', name: 'Groceries', icon: '🛒', type: 'EXPENSE' },
    { id: '3', name: 'Transport', icon: '🚗', type: 'EXPENSE' },
    { id: '4', name: 'Digital & Tech', icon: '💻', type: 'EXPENSE' },
    { id: '5', name: 'Housing', icon: '🏠', type: 'EXPENSE' },
    { id: '6', name: 'Entertainment', icon: '🎬', type: 'EXPENSE' },
    { id: '7', name: 'Medical', icon: '💊', type: 'EXPENSE' },
    { id: '8', name: 'Game', icon: '🎮', type: 'EXPENSE' },
    { id: '9', name: 'Salary', icon: '💰', type: 'INCOME' },
];

export const DEFAULT_SETTINGS: AppSettings = {
    apiBaseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o',
    currency: 'CNY',
    exchangeRateApiKey: 'f97bc1648959b6f3dbe8749b',
    language: 'en',
    defaultAccountId: undefined,
};

export interface Account {
    id: string;
    name: string;
    type: string;
    balance?: number; // This might be initialBalance or currentBalance depending on usage
    currencyCode: string;
    isDefault?: boolean;
    // ...existing code...
    currentBalance: number;
}

export interface Investment {
    id: string;
    userId: string;
    name: string;
    type: string;
    initialAmount: number;
    currentAmount?: number | null;
    currencyCode: string;
    interestRate?: number | null;
    accountId?: string | null;
    startDate: string;
    endDate?: string | null;
    status: string;
    note?: string | null;
    // v3.0: Write-off Support
    writtenOffDate?: string | null;
    writtenOffReason?: string | null;
    // Fixed Asset Depreciation Fields
    depreciationType?: string | null;
    usefulLife?: number | null;
    salvageValue?: number | null;
    purchasePrice?: number | null;
    lastDepreciationDate?: string | null;
    createdAt: Date;
    updatedAt: Date;
    projectId?: string | null;
}

export interface Project {
    id: string;
    userId: string;
    name: string;
    description?: string | null;
    type: string;
    status: string;
    startDate: string;
    endDate?: string | null;
    totalBudget?: number | null;
    currencyCode?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

