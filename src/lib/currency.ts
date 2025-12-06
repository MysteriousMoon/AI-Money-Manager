/**
 * 客户端货币工具函数
 * 汇率转换现在在 lib/server-currency.ts 中进行服务端处理
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
