import { Prisma } from '@prisma/client';

/**
 * 将 Prisma Decimal 转换为 JavaScript 数字。
 * 优雅地处理 null/undefined 值。
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
 * 将 Prisma Decimal 转换为 JavaScript 数字，保留 null 值。
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
