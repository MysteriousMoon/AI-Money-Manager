import { Prisma } from '@prisma/client';

/**
 * Convert a Prisma Decimal to a JavaScript number.
 * Handles null/undefined values gracefully.
 */
export function toNumber(value: Prisma.Decimal | number | null | undefined): number {
    if (value === null || value === undefined) {
        return 0;
    }
    if (typeof value === 'number') {
        return value;
    }
    return value.toNumber();
}

/**
 * Convert a Prisma Decimal to a JavaScript number, preserving null.
 */
export function toNumberOrNull(value: Prisma.Decimal | number | null | undefined): number | null {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === 'number') {
        return value;
    }
    return value.toNumber();
}
