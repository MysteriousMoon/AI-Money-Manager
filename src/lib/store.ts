import { create } from 'zustand';
import { Transaction, Category, RecurringRule, AppSettings, DEFAULT_CATEGORIES, DEFAULT_SETTINGS, Investment, Project } from '@/types';
// import { Investment, Project } from '@prisma/client'; // Removed Prisma imports
import { getTransactions, addTransaction, deleteTransaction } from '@/app/actions/transaction';
import { getCategories, addCategory, deleteCategory, updateCategory } from '@/app/actions/category';
import { getSettings, updateSettings } from '@/app/actions/settings';
import { getRecurringRules, addRecurringRule, updateRecurringRule, deleteRecurringRule } from '@/app/actions/recurring';
import { getInvestments } from '@/app/actions/investment';
import { getAccounts, createAccount, updateAccount, deleteAccount, type AccountWithBalance } from '@/app/actions/account';
import { getProjects, createProject, updateProject, deleteProject } from '@/app/actions/project';
import { getInvestmentTypes, addInvestmentType, deleteInvestmentType, updateInvestmentType } from '@/app/actions/investment-type';

// 辅助函数：将原始交易数据映射为带有投资关联的 Transaction 类型
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
    investmentTypes: import('@/types').InvestmentType[];
    projects: Project[];
    accounts: AccountWithBalance[];
    settings: AppSettings;
    isLoading: boolean;

    // 动作 (Actions)
    fetchInitialData: () => Promise<void>;

    addTransaction: (transaction: Transaction) => Promise<void>;
    updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>; // 待办: 实现更新动作
    deleteTransaction: (id: string) => Promise<void>;

    addCategory: (category: Category) => Promise<void>;
    updateCategory: (id: string, updates: Partial<Category>) => Promise<void>; // TODO: Implement update action
    deleteCategory: (id: string) => Promise<void>;

    addRecurringRule: (rule: RecurringRule) => Promise<void>;
    updateRecurringRule: (id: string, updates: Partial<RecurringRule>) => Promise<void>;
    deleteRecurringRule: (id: string) => Promise<void>;

    addInvestment: (investment: import('@/app/actions/investment').InvestmentCreateInput) => Promise<void>;
    updateInvestment: (id: string, updates: import('@/app/actions/investment').InvestmentUpdateInput) => Promise<void>;
    deleteInvestment: (id: string) => Promise<void>;
    closeInvestment: (id: string, finalAmount: number, endDate: string, accountId?: string) => Promise<void>;
    writeOffInvestment: (id: string, writeOffDate: string, reason: string) => Promise<void>;
    recordDepreciation: (id: string, amount: number, date: string) => Promise<void>;

    addAccount: (account: Omit<AccountWithBalance, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'currentBalance'>) => Promise<void>;
    updateAccount: (id: string, updates: Partial<Omit<AccountWithBalance, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'currentBalance'>>) => Promise<void>;
    deleteAccount: (id: string) => Promise<void>;
    refreshAccounts: () => Promise<void>;

    updateSettings: (updates: Partial<AppSettings>) => Promise<void>;

    // 项目动作
    addProject: (project: import('@/app/actions/project').ProjectInput) => Promise<void>;
    updateProject: (id: string, updates: Partial<import('@/app/actions/project').ProjectInput>) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;

    // Investment Types
    addInvestmentType: (type: import('@/app/actions/investment-type').InvestmentTypeInput) => Promise<void>;
    updateInvestmentType: (id: string, data: import('@/app/actions/investment-type').InvestmentTypeInput) => Promise<void>;
    deleteInvestmentType: (id: string) => Promise<void>;
}



export const useStore = create<AppState>((set, get) => ({
    transactions: [],
    categories: [], // 初始化为空，稍后获取
    recurringRules: [],
    investments: [],
    investmentTypes: [],
    projects: [],
    accounts: [],
    settings: DEFAULT_SETTINGS,
    isLoading: true,

    fetchInitialData: async () => {
        set({ isLoading: true });
        try {
            const [txRes, catRes, setRes, recRes, invRes, accRes, projRes, typeRes] = await Promise.all([
                getTransactions(),
                getCategories(),
                getSettings(),
                getRecurringRules(),
                getInvestments(),
                getAccounts(),
                getProjects(),
                getInvestmentTypes()
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
                investmentTypes: typeRes.success && typeRes.data ? typeRes.data as unknown as import('@/types').InvestmentType[] : [],
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
        // 乐观更新
        set((state) => ({ transactions: [transaction, ...state.transactions] }));
        const res = await addTransaction(transaction);
        if (!res.success) {
            // 失败时回滚 (简化处理)
            console.error(res.error);
            // 在真实应用中，此处应回滚状态
        }
    },
    updateTransaction: async (id, updates) => {
        set((state) => ({
            transactions: state.transactions.map((t) => t.id === id ? { ...t, ...updates } : t)
        }));
        const res = await import('@/app/actions/transaction').then(mod => mod.updateTransaction(id, updates));
        if (!res.success) {
            console.error(res.error);
            // 如果需要则回滚状态 (简化略过)
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

    // 投资动作
    addInvestment: async (investment) => {
        console.log('📦 Store: calling addInvestment server action', investment);
        const res = await import('@/app/actions/investment').then(mod => mod.addInvestment(investment));
        console.log('📦 Store: addInvestment response', res);

        if (!res.success) {
            console.error('❌ Store: addInvestment failed', res.error);
            throw new Error(res.error || 'Failed to add investment');
        }

        if (res.data) {
            // 重新获取投资和交易数据
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
            // 更新成功后重新获取投资数据
            const invRes = await getInvestments();
            // 同时获取交易数据以更新关联
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
            // 删除成功后重新获取投资和交易数据
            // (因为相关联的交易也会被删除)
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
            // 刷新投资和交易数据
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
            // 刷新投资和交易数据
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
            // 刷新投资和交易数据
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

    // 账户动作
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

    // 项目动作
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
    },

    // Investment Types
    addInvestmentType: async (type) => {
        const res = await addInvestmentType(type);
        if (res.success) {
            const typeRes = await getInvestmentTypes();
            if (typeRes.success && typeRes.data) {
                set({ investmentTypes: typeRes.data as unknown as import('@/types').InvestmentType[] });
            }
        }
    },
    deleteInvestmentType: async (id) => {
        const res = await deleteInvestmentType(id);
        if (res.success) {
            const typeRes = await getInvestmentTypes();
            if (typeRes.success && typeRes.data) {
                set({ investmentTypes: typeRes.data as unknown as import('@/types').InvestmentType[] });
            }
        }
    },
    updateInvestmentType: async (id, data) => {
        const res = await updateInvestmentType(id, data);
        if (res.success) {
            const typeRes = await getInvestmentTypes();
            if (typeRes.success && typeRes.data) {
                set({ investmentTypes: typeRes.data as unknown as import('@/types').InvestmentType[] });
            }
        }
    }
}));

