// System-generated categories that should be hidden from user selection
export const SYSTEM_CATEGORIES = [
    'Investment',
    'Depreciation',
    'Investment Return',
    'Investment Loss',
];

// Filter out system categories from a list
export function filterSystemCategories<T extends { name: string }>(categories: T[]): T[] {
    return categories.filter(c => !SYSTEM_CATEGORIES.includes(c.name));
}

// Check if a category is a system category
export function isSystemCategory(categoryName: string): boolean {
    return SYSTEM_CATEGORIES.includes(categoryName);
}
