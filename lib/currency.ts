/**
 * Client-side currency utilities
 * Exchange rate conversion is now handled server-side in lib/server-currency.ts
 */

export const CURRENCIES = [
    { code: 'CNY', symbol: '¥', name: 'CNY' },
    { code: 'USD', symbol: '$', name: 'USD' },
    { code: 'EUR', symbol: '€', name: 'EUR' },
    { code: 'JPY', symbol: '¥', name: 'JPY' },
    { code: 'GBP', symbol: '£', name: 'GBP' },
    { code: 'CAD', symbol: '$', name: 'CAD' },
    { code: 'AUD', symbol: '$', name: 'AUD' },
];

export function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(amount);
}
