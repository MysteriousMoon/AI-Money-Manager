import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Prisma 客户端单例模式
 * 
 * 避免在开发环境下（即使使用了 HMR 热重载）创建多个 Prisma Client 实例。
 * 多个实例会导致数据库连接耗尽。
 */

const globalForPrisma = global as unknown as {
    prisma: PrismaClient;
    pool: Pool;
};

// 复用现有的连接池或创建一个新的
const pool = globalForPrisma.pool || new Pool({
    connectionString: process.env.DATABASE_URL
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pool = pool;
}

const adapter = new PrismaPg(pool);

// 实例化 Prisma Client
export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    });

// 在非生产环境下，将 prisma 实例保存到全局变量，以便重用
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
