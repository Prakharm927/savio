import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

/**
 * GET /api/admin/products
 * Paginated product list with search and platform mapping counts.
 */
router.get('/products', catchAsync(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { usku: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [products, total] = await Promise.all([
        prisma.savioProduct.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            select: {
                usku: true,
                name: true,
                brand: true,
                category: true,
                unit: true,
                popularityScore: true,
                isActive: true,
                _count: {
                    select: { platformSkus: true },
                },
            },
            orderBy: { popularityScore: 'desc' },
        }),
        prisma.savioProduct.count({ where }),
    ]);

    sendSuccess(res, {
        products: products.map((p: typeof products[0]) => ({
            ...p,
            platformMappingCount: p._count.platformSkus,
        })),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
}));

/**
 * GET /api/admin/products/:usku
 * Full product detail with mappings + recent prices.
 */
router.get('/products/:usku', catchAsync(async (req: Request, res: Response) => {
    const { usku } = req.params;

    const product = await prisma.savioProduct.findUnique({
        where: { usku },
        include: {
            platformSkus: {
                include: {
                    _count: {
                        select: { prices: true },
                    },
                },
            },
        },
    });

    if (!product) {
        return sendError(res, `Product not found: ${usku}`, 404);
    }

    sendSuccess(res, product);
}));

/**
 * GET /api/admin/snapshots
 * Last N snapshots with optional filters.
 */
router.get('/snapshots', catchAsync(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const platform = req.query.platform as string | undefined;

    const where: any = {};
    if (platform) {
        where.platformSku = {
            platform: platform,
        };
    }

    const snapshots = await prisma.priceLatest.findMany({
        where,
        take: limit,
        orderBy: { scrapedAt: 'desc' },
        include: {
            platformSku: {
                select: {
                    platform: true,
                    platformSkuId: true,
                    product: {
                        select: { usku: true, name: true },
                    },
                },
            },
        },
    });

    const formatted = snapshots.map((s: typeof snapshots[0]) => ({
        id: s.id,
        platform: s.platformSku.platform,
        usku: s.platformSku.product?.usku || null,
        productName: s.platformSku.product?.name || null,
        price: Number(s.price),
        mrp: s.mrp ? Number(s.mrp) : null,
        confidence: Number(s.confidenceScore || 0),
        scrapedAt: s.scrapedAt.toISOString(),
        isMatched: !!s.platformSku.product,
    }));

    sendSuccess(res, { snapshots: formatted });
}));

/**
 * GET /api/admin/health
 * Extended health check with detailed metrics.
 */
router.get('/health', catchAsync(async (_req: Request, res: Response) => {
    const [productCount, snapshotCount, lastSnapshot] = await Promise.all([
        prisma.savioProduct.count(),
        prisma.priceLatest.count(),
        prisma.priceLatest.findFirst({
            orderBy: { scrapedAt: 'desc' },
            select: { scrapedAt: true },
        }),
    ]);

    sendSuccess(res, {
        productCount,
        snapshotCount,
        lastSnapshotAt: lastSnapshot?.scrapedAt?.toISOString() || null,
    });
}));

export default router;
