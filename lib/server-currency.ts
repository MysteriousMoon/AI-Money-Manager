'use server';

import { prisma } from '@/lib/db';

/**
 * Server-side currency exchange rate utilities
 * Uses in-memory cache with fallback to API for rate lookups
 */

// Simple in-memory cache for exchange rates
let ratesCache: {
    base: string;
    rates: Record<string, number>;
    timestamp: number;
} | null = null;

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get the global exchange rate API key from system settings
 */
async function getSystemExchangeRateApiKey(): Promise<string | undefined> {
    try {
        const systemSettings = await prisma.systemSettings.findUnique({
            where: { id: 'default' }
        });
        return systemSettings?.exchangeRateApiKey || undefined;
    } catch (error) {
        // Table might not exist yet
        return undefined;
    }
}

/**
 * Get exchange rate from one currency to another
 * All rates are relative to USD as base
 */
export async function getServerExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    overrideApiKey?: string // For testing purposes
): Promise<number> {
    if (fromCurrency === toCurrency) return 1;

    // Get API key from system settings or use override
    const apiKey = overrideApiKey || await getSystemExchangeRateApiKey();

    const rates = await getExchangeRates(apiKey);
    if (!rates) return 1;

    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;

    return toRate / fromRate;
}

/**
 * Convert an amount from one currency to another
 */
export async function convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    overrideApiKey?: string
): Promise<number> {
    const rate = await getServerExchangeRate(fromCurrency, toCurrency, overrideApiKey);
    return amount * rate;
}

/**
 * Fetch and cache exchange rates from API
 */
export async function getExchangeRates(apiKey?: string): Promise<Record<string, number> | null> {
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
                next: { revalidate: 86400 },
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

/**
 * Test exchange rate API key (for admin settings page)
 */
export async function testExchangeRateApi(apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch(
            `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`,
            { cache: 'no-store' }
        );

        if (!response.ok) {
            return { success: false, error: 'API request failed' };
        }

        const data = await response.json();
        if (data.result === 'success') {
            return { success: true };
        } else {
            return { success: false, error: data['error-type'] || 'Unknown error' };
        }
    } catch (error) {
        return { success: false, error: 'Network error' };
    }
}
