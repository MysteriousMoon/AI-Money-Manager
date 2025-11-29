import { create } from 'zustand';
import { Transaction, Category, RecurringRule, AppSettings, DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from '@/types';
import { getTransactions, addTransaction, deleteTransaction } from '@/app/actions/transaction';
import { getCategories, addCategory, deleteCategory, updateCategory } from '@/app/actions/category';
import { getSettings, updateSettings } from '@/app/actions/settings';
import { getRecurringRules, addRecurringRule, updateRecurringRule, deleteRecurringRule } from '@/app/actions/recurring';

interface AppState {
    transactions: Transaction[];
    categories: Category[];
    recurringRules: RecurringRule[];
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

    updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
    transactions: [],
    categories: [], // Initialize empty, will fetch
    recurringRules: [],
    settings: DEFAULT_SETTINGS,
    isLoading: true,

    fetchInitialData: async () => {
        set({ isLoading: true });
        try {
            const [txRes, catRes, setRes, recRes] = await Promise.all([
                getTransactions(),
                getCategories(),
                getSettings(),
                getRecurringRules()
            ]);

            set({
                transactions: txRes.success && txRes.data ? txRes.data.map((tx: any) => ({
                    ...tx,
                    note: tx.note ?? undefined,
                    merchant: tx.merchant ?? undefined
                })) : [],
                categories: catRes.success && catRes.data ? catRes.data.map((c: any) => ({
                    ...c,
                    type: c.type as Category['type']
                })) : DEFAULT_CATEGORIES,
                recurringRules: recRes.success && recRes.data ? recRes.data as RecurringRule[] : [],
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
    }
}));
