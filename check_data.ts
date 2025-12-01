
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const transactions = await prisma.transaction.findMany({
        where: {
            note: {
                contains: 'Depreciation'
            }
        },
        orderBy: {
            date: 'desc'
        },
        take: 10
    });

    console.log('--- Depreciation Transactions ---');
    if (transactions.length === 0) {
        console.log('No depreciation transactions found.');
    } else {
        transactions.forEach(tx => {
            console.log(`[${(tx.date as any).toISOString ? (tx.date as any).toISOString() : tx.date}] Amount: ${tx.amount} ${tx.currencyCode}, Note: ${tx.note}`);
        });
    }

    const allTx = await prisma.transaction.findMany({
        take: 5,
        orderBy: { date: 'desc' }
    });
    console.log('--- Recent Transactions ---');
    allTx.forEach(tx => {
        console.log(`[${(tx.date as any).toISOString ? (tx.date as any).toISOString() : tx.date}] Type: ${tx.type}, Amount: ${tx.amount}, Note: ${tx.note}`);
    });
    // Add test transaction
    const userId = 'e8a11eb8-62bb-4472-bb66-a3e774bc8140'; // From previous query
    const categoryId = '4a85e1c4-68cd-4ea6-b5f8-a8ae86463d9e'; // Depreciation

    const newTx = await prisma.transaction.create({
        data: {
            userId,
            amount: 123.45,
            currencyCode: 'CAD',
            categoryId,
            date: new Date().toISOString(),
            type: 'EXPENSE',
            source: 'MANUAL',
            note: 'Test Depreciation for Debugging',
            merchant: 'System'
        }
    });
    console.log(`Added test transaction: ${newTx.id}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
