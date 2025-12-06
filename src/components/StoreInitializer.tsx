'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';

export function StoreInitializer() {
    const fetchInitialData = useStore((state) => state.fetchInitialData);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    return null;
}
