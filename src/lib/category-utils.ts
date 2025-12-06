// 对用户隐藏的系统自动生成的类别
export const SYSTEM_CATEGORIES = [
    'Investment',
    'Depreciation',
    'Investment Return',
    'Investment Loss',
];

// 从列表中过滤掉系统类别
export function filterSystemCategories<T extends { name: string }>(categories: T[]): T[] {
    return categories.filter(c => !SYSTEM_CATEGORIES.includes(c.name));
}

// 检查类别是否为系统类别
export function isSystemCategory(categoryName: string): boolean {
    return SYSTEM_CATEGORIES.includes(categoryName);
}
