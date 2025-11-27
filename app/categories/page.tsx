'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Plus, Trash2, Edit2, Check, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Category } from '@/types';
import { useTranslation } from '@/lib/i18n';

export default function CategoriesPage() {
    const { categories, addCategory, updateCategory, deleteCategory } = useStore();
    const { t } = useTranslation();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('🏷️');
    const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

    const resetForm = () => {
        setName('');
        setIcon('🏷️');
        setType('EXPENSE');
        setIsAdding(false);
        setEditingId(null);
    };

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        addCategory({
            id: crypto.randomUUID(),
            name,
            icon,
            type,
        });
        resetForm();
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            updateCategory(editingId, { name, icon, type });
            resetForm();
        }
    };

    const startEdit = (category: Category) => {
        setEditingId(category.id);
        setName(category.name);
        setIcon(category.icon);
        setType(category.type);
        setIsAdding(false);
    };

    return (
        <div className="container max-w-2xl mx-auto p-4 pb-24 md:pt-24 space-y-6">
            <header className="flex items-center gap-4">
                <Link href="/settings" className="p-2 hover:bg-accent rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">{t('categories.title')}</h1>
                    <p className="text-muted-foreground text-sm">{t('categories.desc')}</p>
                </div>
            </header>

            {/* Add/Edit Form */}
            {(isAdding || editingId) && (
                <form onSubmit={editingId ? handleUpdate : handleAdd} className="bg-muted/50 p-4 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex gap-4">
                        <div className="w-16">
                            <label className="text-xs font-medium text-muted-foreground">{t('categories.icon')}</label>
                            <input
                                value={icon}
                                onChange={(e) => setIcon(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-center text-lg"
                                maxLength={2}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-medium text-muted-foreground">{t('recurring.name')}</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Category Name"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                required
                            />
                        </div>
                        <div className="w-24">
                            <label className="text-xs font-medium text-muted-foreground">{t('categories.type')}</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as 'EXPENSE' | 'INCOME')}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                            >
                                <option value="EXPENSE">Exp</option>
                                <option value="INCOME">Inc</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                        >
                            {t('recurring.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        >
                            {editingId ? t('recurring.update') : 'Add'}
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
                    {t('categories.add_new')}
                </button>
            )}

            <div className="space-y-2">
                {categories.map((category) => (
                    <div
                        key={category.id}
                        className="flex items-center justify-between p-3 bg-card border rounded-lg group"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl bg-muted h-10 w-10 flex items-center justify-center rounded-full">
                                {category.icon}
                            </span>
                            <div>
                                <p className="font-medium">{category.name}</p>
                                <p className="text-xs text-muted-foreground">{category.type}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => startEdit(category)}
                                className="p-2 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground"
                            >
                                <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm('Are you sure? This will not delete transactions associated with this category.')) {
                                        deleteCategory(category.id);
                                    }
                                }}
                                className="p-2 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
