import { Request, Response } from 'express';
import prisma from '../config/database';
import { getCachedData, setCachedData, invalidateCache } from '../config/redis';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess, sendError } from '../utils/response';

const VALID_PLATFORMS = ['zepto', 'blinkit', 'instamart', 'bigbasket', 'jiomart', 'amazon', 'flipkart'] as const;
type Platform = (typeof VALID_PLATFORMS)[number];

const CACHE_TTL_SECONDS = 3600; // 1 hour

function isValidPlatform(value: string): value is Platform {
    return VALID_PLATFORMS.includes(value as Platform);
}

/**
 * GET /api/parser-config/:platform
 * Returns the currently active config for a platform.
 * Redis-cached with 1-hour TTL.
 */
export const getActiveConfig = catchAsync(async (req: Request, res: Response) => {
    const { platform } = req.params;

    if (!isValidPlatform(platform)) {
        return sendError(res, `Invalid platform: ${platform}. Valid: ${VALID_PLATFORMS.join(', ')}`, 400);
    }

    const cacheKey = `parser-config:${platform}`;

    // Try Redis cache first
    const cached = await getCachedData<{ version: number; config: any; lastUpdated: string }>(cacheKey);
    if (cached) {
        return sendSuccess(res, cached, `Active config for ${platform} (cached)`);
    }

    // Fall through to DB
    const activeConfig = await prisma.parserConfig.findFirst({
        where: {
            platform,
            isActive: true,
        },
        select: {
            id: true,
            version: true,
            config: true,
            notes: true,
            updatedAt: true,
        },
    });

    if (!activeConfig) {
        return sendError(res, `No active config for platform: ${platform}`, 404);
    }

    const responseData = {
        version: activeConfig.version,
        config: activeConfig.config,
        notes: activeConfig.notes,
        lastUpdated: activeConfig.updatedAt.toISOString(),
    };

    // Cache in Redis
    await setCachedData(cacheKey, responseData, CACHE_TTL_SECONDS);

    sendSuccess(res, responseData, `Active config for ${platform}`);
});

/**
 * GET /api/parser-config/:platform/versions
 * Returns all versions for a platform (admin).
 */
export const getVersionHistory = catchAsync(async (req: Request, res: Response) => {
    const { platform } = req.params;

    if (!isValidPlatform(platform)) {
        return sendError(res, `Invalid platform: ${platform}`, 400);
    }

    const versions = await prisma.parserConfig.findMany({
        where: { platform },
        select: {
            id: true,
            version: true,
            isActive: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: { version: 'desc' },
    });

    sendSuccess(res, { platform, versions }, `Version history for ${platform}`);
});

/**
 * POST /api/admin/parser-config
 * Create a new parser config version.
 * Body: { platform, config, notes?, activate? }
 * Auto-increments version per platform.
 */
export const createConfig = catchAsync(async (req: Request, res: Response) => {
    const { platform, config, notes, activate } = req.body;

    if (!platform || !isValidPlatform(platform)) {
        return sendError(res, `Invalid or missing platform. Valid: ${VALID_PLATFORMS.join(', ')}`, 400);
    }

    if (!config || typeof config !== 'object') {
        return sendError(res, 'config must be a valid JSON object', 400);
    }

    // Auto-increment version
    const latestConfig = await prisma.parserConfig.findFirst({
        where: { platform },
        orderBy: { version: 'desc' },
        select: { version: true },
    });

    const newVersion = (latestConfig?.version ?? 0) + 1;

    // If activating, deactivate the current active config
    if (activate) {
        await prisma.parserConfig.updateMany({
            where: { platform, isActive: true },
            data: { isActive: false },
        });
    }

    const created = await prisma.parserConfig.create({
        data: {
            platform,
            version: newVersion,
            config,
            notes: notes || null,
            isActive: activate === true,
        },
    });

    // Invalidate cache if activating
    if (activate) {
        await invalidateCache(`parser-config:${platform}`);
    }

    sendSuccess(res, {
        id: created.id,
        platform: created.platform,
        version: created.version,
        isActive: created.isActive,
        createdAt: created.createdAt.toISOString(),
    }, `Parser config v${newVersion} created for ${platform}${activate ? ' (activated)' : ''}`);
});

/**
 * PUT /api/admin/parser-config/:id/activate
 * Activate a specific config version.
 * Deactivates the previously active config for the same platform.
 */
export const activateConfig = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    const target = await prisma.parserConfig.findUnique({
        where: { id },
        select: { id: true, platform: true, version: true, isActive: true },
    });

    if (!target) {
        return sendError(res, `Config not found: ${id}`, 404);
    }

    if (target.isActive) {
        return sendSuccess(res, target, `Config v${target.version} is already active for ${target.platform}`);
    }

    // Deactivate current active, activate target — in a transaction
    await prisma.$transaction([
        prisma.parserConfig.updateMany({
            where: { platform: target.platform, isActive: true },
            data: { isActive: false },
        }),
        prisma.parserConfig.update({
            where: { id },
            data: { isActive: true },
        }),
    ]);

    // Invalidate Redis cache
    await invalidateCache(`parser-config:${target.platform}`);

    sendSuccess(res, {
        id: target.id,
        platform: target.platform,
        version: target.version,
        isActive: true,
    }, `Config v${target.version} activated for ${target.platform}`);
});
