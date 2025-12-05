'use server';

/**
 * Server-side currency exchange rate utilities
 * Uses in-memory cache with fallback to API for rate lookups
 */

// Simple in-memory cache for exchange rates
// In production, consider using Redis or database storage
let ratesCache: {
    base: string;
    rates: Record<string, number>;
    timestamp: number;
} | null = null;

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get exchange rate from one currency to another
 * All rates are relative to USD as base
 */
export async function getServerExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    exchangeRateApiKey?: string
): Promise<number> {
    if (fromCurrency === toCurrency) return 1;

    const rates = await getServerRates(exchangeRateApiKey);
    if (!rates) return 1; // Fallback to 1:1 if no rates available

    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;

    // Cross rate calculation: Amount in FROM * (TO_rate / FROM_rate) = Amount in TO
    return toRate / fromRate;
}

/**
 * Convert an amount from one currency to another
 */
export async function convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    exchangeRateApiKey?: string
): Promise<number> {
    const rate = await getServerExchangeRate(fromCurrency, toCurrency, exchangeRateApiKey);
    return amount * rate;
}

/**
 * Fetch and cache exchange rates from API
 */
async function getServerRates(apiKey?: string): Promise<Record<string, number> | null> {
    // Check if cache is valid
    if (ratesCache && Date.now() - ratesCache.timestamp < CACHE_DURATION) {
        return ratesCache.rates;
    }

    // If no API key, use fallback rates
    if (!apiKey) {
        return getFallbackRates();
    }

    try {
        const response = await fetch(
            `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`,
            {
                next: { revalidate: 86400 }, // Cache for 24 hours in Next.js
                headers: { 'Accept': 'application/json' }
            }
        );

        if (!response.ok) {
            console.error('Exchange rate API error:', response.status);
            return getFallbackRates();
        }

        const data = await response.json();

        if (data.result === 'success') {
            ratesCache = {
                base: 'USD',
                rates: data.conversion_rates,
                timestamp: Date.now(),
            };
            return data.conversion_rates;
        }
    } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
    }

    return getFallbackRates();
}

/**
 * Fallback exchange rates (approximate, for when API is unavailable)
 * These are rough estimates and should only be used as fallback
 */
function getFallbackRates(): Record<string, number> {
    return {
        USD: 1,
        CNY: 7.25,
        EUR: 0.92,
        GBP: 0.79,
        JPY: 149.5,
        CAD: 1.36,
        AUD: 1.53,
        HKD: 7.82,
        SGD: 1.34,
        KRW: 1320,
    };
}
