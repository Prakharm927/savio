import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { getRedisClient, disconnectRedis } from './config/redis';
import logger from './utils/logger';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // Connect to databases
        await connectDatabase();
        getRedisClient(); // Initialize Redis connection

        // Start Express server
        const server = app.listen(PORT, () => {
            logger.info(`🚀 Prixo backend running on port ${PORT}`);
            logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`🌐 Health check: http://localhost:${PORT}/health`);
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal: string) => {
            logger.info(`\n${signal} received. Starting graceful shutdown...`);

            server.close(async () => {
                logger.info('HTTP server closed');

                await disconnectDatabase();
                await disconnectRedis();

                logger.info('✅ Graceful shutdown completed');
                process.exit(0);
            });

            // Force shutdown after 10 seconds
            setTimeout(() => {
                logger.error('⚠️ Forcing shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
