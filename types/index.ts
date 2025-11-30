export interface Transaction {
    id: string;
    amount: number;
    currencyCode: string;
    categoryId: string;
    date: string; // ISO 8601 YYYY-MM-DD
    note?: string;
    merchant?: string;
    type: 'EXPENSE' | 'INCOME';
    source: 'MANUAL' | 'AI_SCAN' | 'RECURRING';
    investmentId?: string;
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
    frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';
    customIntervalDays?: number;
    startDate: string;
    nextDueDate: string;
    active: boolean;
}

export interface AppSettings {
    apiBaseUrl: string;
    apiKey: string;
    model: string;
    currency: string;
    exchangeRateApiKey: string;
    language: 'en' | 'zh';
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
};
