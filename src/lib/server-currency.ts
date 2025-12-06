'use server';

import { prisma } from '@/lib/db';

/**
 * 服务端汇率工具函数
 * 使用内存缓存，回退到 API 查询汇率
 */

// 简单的内存汇率缓存
let ratesCache: {
    base: string;
    rates: Record<string, number>;
    timestamp: number;
} | null = null;

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * 从系统设置中获取全局汇率 API Key
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
 * 获取两种货币之间的汇率
 * 所有汇率均以 USD 为基准
 */
export async function getServerExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    overrideApiKey?: string // For testing purposes
): Promise<number> {
    if (fromCurrency === toCurrency) return 1;

    // 从系统设置获取 API Key 或使用覆盖值
    const apiKey = overrideApiKey || await getSystemExchangeRateApiKey();

    const rates = await getExchangeRates(apiKey);
    if (!rates) return 1;

    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;

    return toRate / fromRate;
}

/**
 * 将金额从一种货币转换为另一种货币
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
 * 从 API 获取并缓存汇率
 */
export async function getExchangeRates(apiKey?: string): Promise<Record<string, number> | null> {
    // 检查缓存是否有效
    if (ratesCache && Date.now() - ratesCache.timestamp < CACHE_DURATION) {
        return ratesCache.rates;
    }

    // 如果没有 API Key，使用回退汇率
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
 * 回退汇率（近似值，用于 API 不可用的情况）
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
 * 测试汇率 API Key（用于管理员设置页面）
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
