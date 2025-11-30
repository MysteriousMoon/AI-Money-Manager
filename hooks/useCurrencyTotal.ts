import { useState, useEffect } from 'react';
import { Transaction, AppSettings } from '@/types';
import { getExchangeRate } from '@/lib/currency';

export function useCurrencyTotal(items: { amount: number; currencyCode: string }[], settings: AppSettings) {
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const calculateTotal = async () => {
            setLoading(true);
            let sum = 0;

            // Group by currency to minimize API calls/cache lookups
            const byCurrency: Record<string, number> = {};

            for (const item of items) {
                byCurrency[item.currencyCode] = (byCurrency[item.currencyCode] || 0) + item.amount;
            }

            for (const [currency, amount] of Object.entries(byCurrency)) {
                if (currency === settings.currency) {
                    sum += amount;
                } else {
                    const rate = await getExchangeRate(currency, settings.currency, settings);
                    sum += amount * rate;
                }
            }

            if (isMounted) {
                setTotal(sum);
                setLoading(false);
            }
        };

        calculateTotal();

        return () => {
            isMounted = false;
        };
    }, [items, settings.currency, settings.exchangeRateApiKey]);

    return { total, loading };
}
