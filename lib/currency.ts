import { AppSettings } from '@/types';

const RATES_CACHE_KEY = 'expense_tracker_rates';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const CURRENCIES = [
    { code: 'CNY', symbol: '¥', name: 'CNY' },
    { code: 'USD', symbol: '$', name: 'USD' },
    { code: 'EUR', symbol: '€', name: 'EUR' },
    { code: 'JPY', symbol: '¥', name: 'JPY' },
    { code: 'GBP', symbol: '£', name: 'GBP' },
    { code: 'CAD', symbol: '$', name: 'CAD' },
    { code: 'AUD', symbol: '$', name: 'AUD' },
];

interface RatesCache {
    base: string;
    rates: Record<string, number>;
    timestamp: number;
}

export async function getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    settings: AppSettings
): Promise<number> {
    if (fromCurrency === toCurrency) return 1;

    const rates = await getRates(settings);
    if (!rates) return 1; // Fallback

    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;

    // Calculate cross rate: (Target / Base) / (Source / Base)
    // API returns rates relative to its base (usually USD or user selected)
    // If we fetch base=USD, then:
    // 1 USD = X FromCurrency
    // 1 USD = Y ToCurrency
    // To convert From -> To: Amount * (Y / X)

    return toRate / fromRate;
}

async function getRates(settings: AppSettings): Promise<Record<string, number> | null> {
    const { exchangeRateApiKey, currency } = settings;

    // Try to load from cache
    if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(RATES_CACHE_KEY);
        if (cached) {
            const data: RatesCache = JSON.parse(cached);
            // Check if cache is valid (less than 24h old AND same base currency if API supports base switching, 
            // but free plan might only support USD base. Let's assume we fetch USD base for maximum flexibility or the user's base)
            // The user said: "When calculating the exchange rate, use the current day's rate".
            // Let's try to fetch with the user's preferred currency as base if possible, or just USD.
            // For simplicity and standard free tier limits, often USD is default. 
            // However, the URL provided is `.../latest/USD`. Let's stick to USD base for cache to allow cross-calculation.

            if (Date.now() - data.timestamp < CACHE_DURATION) {
                return data.rates;
            }
        }
    }

    if (!exchangeRateApiKey) return null;

    try {
        // Fetching with USD base to allow easy conversion between any two currencies
        const response = await fetch(`https://v6.exchangerate-api.com/v6/${exchangeRateApiKey}/latest/USD`);
        const data = await response.json();

        if (data.result === 'success') {
            const cacheData: RatesCache = {
                base: 'USD',
                rates: data.conversion_rates,
                timestamp: Date.now(),
            };

            if (typeof window !== 'undefined') {
                localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(cacheData));
            }

            return data.conversion_rates;
        }
    } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
    }

    return null;
}

export function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(amount);
}
