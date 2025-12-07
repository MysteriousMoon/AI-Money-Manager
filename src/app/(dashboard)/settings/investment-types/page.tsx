'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Plus, Trash2, Edit2, ArrowLeft, Tag } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { InvestmentType } from '@/types';

export default function InvestmentTypesPage() {
    const { investmentTypes, addInvestmentType, updateInvestmentType, deleteInvestmentType } = useStore();
    const { t } = useTranslation();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [category, setCategory] = useState('STOCK');

    const resetForm = () => {
        setName('');
        setCategory('STOCK');
        setIsAdding(false);
        setEditingId(null);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addInvestmentType({
                name,
                category,
            });
            resetForm();
        } catch (error) {
            console.error('Failed to add type:', error);
            alert('Failed to add type');
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            try {
                await updateInvestmentType(editingId, { name, category });
                resetForm();
            } catch (error) {
                console.error('Failed to update type:', error);
                alert('Failed to update type');
            }
        }
    };

    const startEdit = (type: InvestmentType) => {
        setEditingId(type.id);
        setName(type.name);
        setCategory(type.category);
        setIsAdding(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm(t('settings.delete_type_confirm'))) {
            await deleteInvestmentType(id);
        }
    };

    return (
        <div className="container max-w-2xl mx-auto p-4 pb-24 md:pt-24 space-y-6">
            <header className="flex items-center gap-4">
                <Link href="/settings" className="p-2 hover:bg-accent rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">{t('settings.manage_investment_types')}</h1>
                    <p className="text-muted-foreground text-sm">{t('settings.manage_investment_types_desc')}</p>
                </div>
            </header>

            {/* Add Form */}
            {isAdding && !editingId && (
                <form onSubmit={handleAdd} className="bg-muted/50 p-4 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-xs font-medium text-muted-foreground">{t('settings.type_name')}</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Crypto"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="w-1/3">
                            <label className="text-xs font-medium text-muted-foreground">{t('settings.logic_category')}</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                            >
                                <option value="STOCK">{t('investments.type.stock')}</option>
                                <option value="DEPOSIT">{t('investments.type.deposit')}</option>
                                <option value="ASSET">{t('investments.type.asset')}</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        >
                            {t('settings.save')}
                        </button>
                    </div>
                </form>
            )}

            {!isAdding && !editingId && (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full py-3 border-2 border-dashed border-muted-foreground/25 rounded-lg text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                    <Plus className="h-4 w-4" />
                    {t('settings.add_investment_type')}
                </button>
            )}

            <div className="space-y-2">
                {/* System Types */}
                <div className="grid gap-2">
                    {[
                        { id: 'sys_stock', name: t('investments.type.stock'), category: 'STOCK', isSystem: true },
                        { id: 'sys_fund', name: t('investments.type.fund'), category: 'FUND', isSystem: true },
                        { id: 'sys_deposit', name: t('investments.type.deposit'), category: 'DEPOSIT', isSystem: true },
                        { id: 'sys_asset', name: t('investments.type.asset'), category: 'ASSET', isSystem: true },
                        { id: 'sys_other', name: t('investments.type.other'), category: 'OTHER', isSystem: true },
                    ].map((type) => (
                        <div
                            key={type.id}
                            className="bg-card border rounded-lg overflow-hidden opacity-80"
                        >
                            <div className="flex items-center justify-between p-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl bg-muted h-10 w-10 flex items-center justify-center rounded-full text-muted-foreground/70">
                                        <Tag className="h-5 w-5" />
                                    </span>
                                    <div>
                                        <p className="font-medium flex items-center gap-2">
                                            {type.name}
                                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                                                System
                                            </span>
                                        </p>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <span className="opacity-70">{t('settings.logic_category')}:</span>
                                            {type.category === 'STOCK' || type.category === 'FUND' ? t('investments.type.stock') :
                                                type.category === 'DEPOSIT' ? t('investments.type.deposit') :
                                                    type.category === 'ASSET' ? t('investments.type.asset') :
                                                        t('investments.type.other')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {investmentTypes.map((type) => {
                    const isEditing = editingId === type.id;

                    return (
                        <div
                            key={type.id}
                            className="bg-card border rounded-lg overflow-hidden"
                        >
                            {!isEditing ? (
                                <div className="flex items-center justify-between p-3 group">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl bg-muted h-10 w-10 flex items-center justify-center rounded-full text-muted-foreground">
                                            <Tag className="h-5 w-5" />
                                        </span>
                                        <div>
                                            <p className="font-medium">{type.name}</p>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                <span className="opacity-70">{t('settings.logic_category')}:</span>
                                                {type.category === 'STOCK' || type.category === 'FUND' ? t('investments.type.stock') :
                                                    type.category === 'DEPOSIT' ? t('investments.type.deposit') :
                                                        type.category === 'ASSET' ? t('investments.type.asset') :
                                                            t('investments.type.other')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => startEdit(type)}
                                            className="p-2 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(type.id)}
                                            className="p-2 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-muted/30">
                                    <form onSubmit={handleUpdate} className="space-y-4">
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="text-xs font-medium text-muted-foreground">{t('settings.type_name')}</label>
                                                <input
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    placeholder="e.g. Crypto"
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    required
                                                />
                                            </div>
                                            <div className="w-1/3">
                                                <label className="text-xs font-medium text-muted-foreground">{t('settings.logic_category')}</label>
                                                <select
                                                    value={category}
                                                    onChange={(e) => setCategory(e.target.value)}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                                                >
                                                    <option value="STOCK">{t('investments.type.stock')}</option>
                                                    <option value="DEPOSIT">{t('investments.type.deposit')}</option>
                                                    <option value="ASSET">{t('investments.type.asset')}</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={resetForm}
                                                className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                                            >
                                                {t('common.cancel')}
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                                            >
                                                {t('investments.update')}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
