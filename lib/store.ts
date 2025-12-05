import { create } from 'zustand';
import { Transaction, Category, RecurringRule, AppSettings, DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from '@/types';
import { Investment, Project } from '@prisma/client';
import { getTransactions, addTransaction, deleteTransaction } from '@/app/actions/transaction';
import { getCategories, addCategory, deleteCategory, updateCategory } from '@/app/actions/category';
import { getSettings, updateSettings } from '@/app/actions/settings';
import { getRecurringRules, addRecurringRule, updateRecurringRule, deleteRecurringRule } from '@/app/actions/recurring';
import { getInvestments } from '@/app/actions/investment';
import { getAccounts, createAccount, updateAccount, deleteAccount, type AccountWithBalance } from '@/app/actions/account';
import { getProjects, createProject, updateProject, deleteProject } from '@/app/actions/project';

// Helper to map raw transaction data to Transaction type with investment links
function mapTransactions(rawTransactions: any[], investments: Investment[]): Transaction[] {
    return rawTransactions.map((tx) => ({
        ...tx,
        note: tx.note ?? undefined,
        merchant: tx.merchant ?? undefined,
        investment: tx.investmentId ? investments.find((i) => i.id === tx.investmentId) : undefined
    }));
}

interface AppState {
    transactions: Transaction[];
    categories: Category[];
    recurringRules: RecurringRule[];
    investments: Investment[];
    projects: Project[];
    accounts: AccountWithBalance[];
    settings: AppSettings;
    isLoading: boolean;

    // Actions
    fetchInitialData: () => Promise<void>;

    addTransaction: (transaction: Transaction) => Promise<void>;
    updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>; // TODO: Implement update action
    deleteTransaction: (id: string) => Promise<void>;

    addCategory: (category: Category) => Promise<void>;
    updateCategory: (id: string, updates: Partial<Category>) => Promise<void>; // TODO: Implement update action
    deleteCategory: (id: string) => Promise<void>;

    addRecurringRule: (rule: RecurringRule) => Promise<void>;
    updateRecurringRule: (id: string, updates: Partial<RecurringRule>) => Promise<void>;
    deleteRecurringRule: (id: string) => Promise<void>;

    addInvestment: (investment: Omit<Investment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateInvestment: (id: string, updates: Partial<Investment>) => Promise<void>;
    deleteInvestment: (id: string) => Promise<void>;
    closeInvestment: (id: string, finalAmount: number, endDate: string, accountId?: string) => Promise<void>;
    writeOffInvestment: (id: string, writeOffDate: string, reason: string) => Promise<void>;
    recordDepreciation: (id: string, amount: number, date: string) => Promise<void>;

    addAccount: (account: Omit<AccountWithBalance, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'currentBalance'>) => Promise<void>;
    updateAccount: (id: string, updates: Partial<Omit<AccountWithBalance, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'currentBalance'>>) => Promise<void>;
    deleteAccount: (id: string) => Promise<void>;
    refreshAccounts: () => Promise<void>;

    updateSettings: (updates: Partial<AppSettings>) => Promise<void>;

    // Project Actions
    addProject: (project: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
    transactions: [],
    categories: [], // Initialize empty, will fetch
    recurringRules: [],
    investments: [],
    projects: [],
    accounts: [],
    settings: DEFAULT_SETTINGS,
    isLoading: true,

    fetchInitialData: async () => {
        set({ isLoading: true });
        try {
            const [txRes, catRes, setRes, recRes, invRes, accRes, projRes] = await Promise.all([
                getTransactions(),
                getCategories(),
                getSettings(),
                getRecurringRules(),
                getInvestments(),
                getAccounts(),
                getProjects()
            ]);

            const investments = invRes.success && invRes.data ? invRes.data : [];

            set({
                transactions: txRes.success && txRes.data ? mapTransactions(txRes.data, investments) : [],
                categories: catRes.success && catRes.data ? catRes.data.map((c: any) => ({
                    ...c,
                    type: c.type as Category['type']
                })) : DEFAULT_CATEGORIES,
                recurringRules: recRes.success && recRes.data ? recRes.data as RecurringRule[] : [],
                investments: investments,
                projects: projRes.success && projRes.data ? projRes.data : [],
                accounts: accRes.success && accRes.data ? accRes.data : [],
                settings: setRes.success && setRes.data ? setRes.data as AppSettings : DEFAULT_SETTINGS,
                isLoading: false
            });
        } catch (error) {
            console.error('Failed to fetch initial data', error);
            set({ isLoading: false });
        }
    },

    addTransaction: async (transaction) => {
        // Optimistic update
        set((state) => ({ transactions: [transaction, ...state.transactions] }));
        const res = await addTransaction(transaction);
        if (!res.success) {
            // Revert on failure (simplified)
            console.error(res.error);
            // In a real app, we'd revert the state here
        }
    },
    updateTransaction: async (id, updates) => {
        set((state) => ({
            transactions: state.transactions.map((t) => t.id === id ? { ...t, ...updates } : t)
        }));
        const res = await import('@/app/actions/transaction').then(mod => mod.updateTransaction(id, updates));
        if (!res.success) {
            console.error(res.error);
            // Revert state if needed (omitted for simplicity)
        }
    },
    deleteTransaction: async (id) => {
        set((state) => ({
            transactions: state.transactions.filter((t) => t.id !== id)
        }));
        await deleteTransaction(id);
    },

    addCategory: async (category) => {
        set((state) => ({ categories: [...state.categories, category] }));
        await addCategory(category);
    },
    updateCategory: async (id, updates) => {
        set((state) => ({
            categories: state.categories.map((c) => c.id === id ? { ...c, ...updates } : c)
        }));
        await updateCategory(id, updates);
    },
    deleteCategory: async (id) => {
        set((state) => ({
            categories: state.categories.filter((c) => c.id !== id)
        }));
        await deleteCategory(id);
    },

    addRecurringRule: async (rule) => {
        set((state) => ({
            recurringRules: [...state.recurringRules, rule]
        }));
        await addRecurringRule(rule);
    },
    updateRecurringRule: async (id, updates) => {
        set((state) => ({
            recurringRules: state.recurringRules.map((r) => r.id === id ? { ...r, ...updates } : r)
        }));
        await updateRecurringRule(id, updates);
    },
    deleteRecurringRule: async (id) => {
        set((state) => ({
            recurringRules: state.recurringRules.filter((r) => r.id !== id)
        }));
        await deleteRecurringRule(id);
    },

    updateSettings: async (updates) => {
        set((state) => ({ settings: { ...state.settings, ...updates } }));
        await updateSettings(updates);
    },

    // Investment Actions
    addInvestment: async (investment) => {
        const res = await import('@/app/actions/investment').then(mod => mod.addInvestment(investment));
        if (res.success && res.data) {
            // Re-fetch investments and transactions
            const invRes = await getInvestments();
            const txRes = await getTransactions();

            if (invRes.success && invRes.data) {
                set({ investments: invRes.data });
            }

            const currentInvestments = invRes.success && invRes.data ? invRes.data : get().investments;

            if (txRes.success && txRes.data) {
                set({
                    transactions: mapTransactions(txRes.data, currentInvestments)
                });
            }
        }
    },
    updateInvestment: async (id, updates) => {
        const res = await import('@/app/actions/investment').then(mod => mod.updateInvestment(id, updates));
        if (res.success) {
            // Re-fetch investments after successful update
            const invRes = await getInvestments();
            // Also fetch transactions to update links
            const txRes = await getTransactions();

            if (invRes.success && invRes.data) {
                set({ investments: invRes.data });
            }

            const currentInvestments = invRes.success && invRes.data ? invRes.data : get().investments;

            if (txRes.success && txRes.data) {
                set({
                    transactions: mapTransactions(txRes.data, currentInvestments)
                });
            }
        }
    },
    deleteInvestment: async (id) => {
        const res = await import('@/app/actions/investment').then(mod => mod.deleteInvestment(id));
        if (res.success) {
            // Re-fetch both investments and transactions after successful delete
            // (since related transactions are also deleted)
            const invRes = await getInvestments();
            const txRes = await getTransactions();

            if (invRes.success && invRes.data) {
                set({ investments: invRes.data });
            }

            const currentInvestments = invRes.success && invRes.data ? invRes.data : get().investments;

            if (txRes.success && txRes.data) {
                set({
                    transactions: mapTransactions(txRes.data, currentInvestments)
                });
            }
        }
    },
    closeInvestment: async (id, finalAmount, endDate, accountId) => {
        const res = await import('@/app/actions/investment').then(mod => mod.closeInvestment(id, finalAmount, endDate, accountId));
        if (res.success) {
            // Refresh both investments and transactions
            const invRes = await getInvestments();
            const txRes = await getTransactions();

            if (invRes.success && invRes.data) {
                set({ investments: invRes.data });
            }

            const currentInvestments = invRes.success && invRes.data ? invRes.data : get().investments;

            if (txRes.success && txRes.data) {
                set({
                    transactions: mapTransactions(txRes.data, currentInvestments)
                });
            }
        }
    },
    recordDepreciation: async (id, amount, date) => {
        const res = await import('@/app/actions/investment').then(mod => mod.recordDepreciation(id, amount, date));
        if (res.success) {
            // Refresh investments and transactions
            const invRes = await getInvestments();
            const txRes = await getTransactions();

            if (invRes.success && invRes.data) {
                set({ investments: invRes.data });
            }

            const currentInvestments = invRes.success && invRes.data ? invRes.data : get().investments;

            if (txRes.success && txRes.data) {
                set({
                    transactions: mapTransactions(txRes.data, currentInvestments)
                });
            }
        }
    },
    writeOffInvestment: async (id, writeOffDate, reason) => {
        const res = await import('@/app/actions/investment').then(mod => mod.writeOffInvestment(id, writeOffDate, reason));
        if (res.success) {
            // Refresh investments and transactions
            const invRes = await getInvestments();
            const txRes = await getTransactions();

            if (invRes.success && invRes.data) {
                set({ investments: invRes.data });
            }

            const currentInvestments = invRes.success && invRes.data ? invRes.data : get().investments;

            if (txRes.success && txRes.data) {
                set({
                    transactions: mapTransactions(txRes.data, currentInvestments)
                });
            }
        }
    },

    // Account Actions
    addAccount: async (account) => {
        const res = await createAccount(account);
        if (res.success && res.data) {
            const accRes = await getAccounts();
            if (accRes.success && accRes.data) {
                set({ accounts: accRes.data });
            }
        }
    },
    updateAccount: async (id, updates) => {
        const res = await updateAccount(id, updates);
        if (res.success) {
            const accRes = await getAccounts();
            if (accRes.success && accRes.data) {
                set({ accounts: accRes.data });
            }
        }
    },
    deleteAccount: async (id) => {
        const res = await deleteAccount(id);
        if (res.success) {
            const accRes = await getAccounts();
            if (accRes.success && accRes.data) {
                set({ accounts: accRes.data });
            }
        }
    },
    refreshAccounts: async () => {
        const accRes = await getAccounts();
        if (accRes.success && accRes.data) {
            set({ accounts: accRes.data });
        }
    },

    // Project Actions
    addProject: async (project) => {
        const res = await createProject(project);
        if (res.success) {
            const projRes = await getProjects();
            if (projRes.success && projRes.data) {
                set({ projects: projRes.data });
            }
        }
    },
    updateProject: async (id, updates) => {
        const res = await updateProject(id, updates);
        if (res.success) {
            const projRes = await getProjects();
            if (projRes.success && projRes.data) {
                set({ projects: projRes.data });
            }
        }
    },
    deleteProject: async (id) => {
        const res = await deleteProject(id);
        if (res.success) {
            const projRes = await getProjects();
            if (projRes.success && projRes.data) {
                set({ projects: projRes.data });
            }
        }
    }
}));
