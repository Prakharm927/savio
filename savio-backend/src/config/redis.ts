import Redis from 'ioredis';
import logger from '../utils/logger';

let redisClient: Redis;

export const getRedisClient = (): Redis => {
    if (!redisClient) {
        redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            reconnectOnError(err) {
                const targetError = 'READONLY';
                if (err.message.includes(targetError)) {
                    return true;
                }
                return false;
            },
        });

        redisClient.on('connect', () => {
            logger.info('✅ Connected to Redis');
        });

        redisClient.on('error', (error) => {
            logger.error('❌ Redis connection error:', error);
        });

        redisClient.on('ready', () => {
            logger.info('✅ Redis ready to accept commands');
        });
    }

    return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
    if (redisClient) {
        await redisClient.quit();
        logger.info('✅ Disconnected from Redis');
    }
};

// Helper functions for caching
export const getCachedData = async <T>(key: string): Promise<T | null> => {
    try {
        const client = getRedisClient();
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        logger.error(`Error getting cached data for key ${key}:`, error);
        return null;
    }
};

export const setCachedData = async (
    key: string,
    data: any,
    ttlSeconds = 300
): Promise<void> => {
    try {
        const client = getRedisClient();
        await client.setex(key, ttlSeconds, JSON.stringify(data));
    } catch (error) {
        logger.error(`Error setting cached data for key ${key}:`, error);
    }
};

export const invalidateCache = async (pattern: string): Promise<void> => {
    try {
        const client = getRedisClient();
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(...keys);
            logger.info(`Invalidated ${keys.length} cache keys matching ${pattern}`);
        }
    } catch (error) {
        logger.error(`Error invalidating cache for pattern ${pattern}:`, error);
    }
};

export default getRedisClient();
