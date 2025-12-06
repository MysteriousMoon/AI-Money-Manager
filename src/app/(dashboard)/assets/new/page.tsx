'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewAssetPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/add?mode=asset');
    }, [router]);

    return null;
}
