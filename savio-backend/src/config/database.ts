import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

// Singleton Prisma Client instance with production optimizations
let prisma: PrismaClient;

export const getPrismaClient = (): PrismaClient => {
    if (!prisma) {
        prisma = new PrismaClient({
            log: process.env.NODE_ENV === 'development'
                ? ['query', 'error', 'warn']
                : ['error'],
        });

        // Slow query monitoring for production
        prisma.$on('query' as never, (e: any) => {
            if (e.duration > 5000) { // Queries over 5 seconds
                logger.warn(`⚠️ Slow query detected: ${e.query.substring(0, 100)}... (${e.duration}ms)`);
            }
        });
    }
    return prisma;
};

export const connectDatabase = async (): Promise<void> => {
    try {
        const client = getPrismaClient();
        await client.$connect();
        logger.info('✅ Connected to PostgreSQL database');
    } catch (error) {
        logger.error('❌ Failed to connect to database:', error);
        process.exit(1);
    }
};

export const disconnectDatabase = async (): Promise<void> => {
    try {
        const client = getPrismaClient();
        await client.$disconnect();
        logger.info('✅ Disconnected from database');
    } catch (error) {
        logger.error('❌ Error disconnecting from database:', error);
    }
};

export default getPrismaClient();
