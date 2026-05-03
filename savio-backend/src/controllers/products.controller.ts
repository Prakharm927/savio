import { Request, Response } from 'express';
import prisma from '../config/database';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess, sendError } from '../utils/response';
import { getCachedData, setCachedData } from '../config/redis';
import { ProductWithPrices, PriceInfo } from '../types';
import {
    buildPlatformDeepLink,
    buildPlatformLinks,
    buildPlatformQueryText,
    buildPlatformSearchFallbacks,
} from '../utils/platformLinks';

function getAgeMinutes(timestamp?: Date) {
    if (!timestamp) {
        return Number.POSITIVE_INFINITY;
    }

    return Math.max(0, Math.round((Date.now() - timestamp.getTime()) / 60000));
}

function getConfidenceFromAge(ageMinutes: number): 'high' | 'medium' | 'low' {
    if (ageMinutes <= 5) {
        return 'high';
    }

    if (ageMinutes <= 15) {
        return 'medium';
    }

    return 'low';
}

function formatLastCheckedLabel(ageMinutes: number) {
    if (!Number.isFinite(ageMinutes)) {
        return 'Checking failed';
    }

    if (ageMinutes <= 1) {
        return 'Updated just now';
    }

    if (ageMinutes < 60) {
        return `Updated ${ageMinutes}m ago`;
    }

    return `Updated ${Math.round(ageMinutes / 60)}h ago`;
}

function toPriceInfo(
    sku: {
        id: number;
        platform: string;
        platformProductUrl: string | null;
        prices: Array<{
            price: any;
            mrp: any;
            discountPercent: any;
            inStock: boolean;
            stockStatus: string;
            scrapedAt: Date;
        }>;
    },
    product: { brand: string | null; name: string }
): PriceInfo {
    const latestPrice = sku.prices[0];
    const searchUrl = buildPlatformSearchFallbacks(
        buildPlatformQueryText(product.brand, product.name)
    )[sku.platform as keyof ReturnType<typeof buildPlatformSearchFallbacks>];

    if (!latestPrice) {
        return {
            platform: sku.platform,
            platformSkuId: sku.id,
            price: null,
            inStock: false,
            stockStatus: 'checking_failed',
            scrapedAt: new Date(0),
            status: 'unknown',
            confidence: 'low',
            lastCheckedLabel: 'Checking failed',
            reason: 'Latest platform snapshot is unavailable',
            productUrl: sku.platformProductUrl || undefined,
            searchUrl,
            deepLink: buildPlatformDeepLink(sku.platform),
        };
    }

    const ageMinutes = getAgeMinutes(latestPrice.scrapedAt);

    return {
        platform: sku.platform,
        platformSkuId: sku.id,
        price: latestPrice.inStock ? parseFloat(latestPrice.price.toString()) : null,
        mrp: latestPrice.mrp ? parseFloat(latestPrice.mrp.toString()) : undefined,
        discountPercent: latestPrice.discountPercent
            ? parseFloat(latestPrice.discountPercent.toString())
            : undefined,
        inStock: latestPrice.inStock,
        stockStatus: latestPrice.stockStatus,
        scrapedAt: latestPrice.scrapedAt,
        status: latestPrice.inStock ? 'available' : 'unavailable',
        confidence: getConfidenceFromAge(ageMinutes),
        lastCheckedLabel: formatLastCheckedLabel(ageMinutes),
        reason: latestPrice.inStock
            ? undefined
            : latestPrice.stockStatus === 'out_of_stock'
                ? 'Out of stock'
                : 'Not available in your area',
        productUrl: sku.platformProductUrl || undefined,
        searchUrl,
        deepLink: buildPlatformDeepLink(sku.platform),
    };
}

export const getAllProducts = catchAsync(async (req: Request, res: Response) => {
    const {
        page = '1',
        limit = '20',
        pincode = process.env.DEFAULT_PINCODE || '560001',
        category,
        search,
        sortBy = 'popularityScore',
        order = 'desc',
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Build where clause
    const where: any = { isActive: true };

    if (category) {
        where.category = category as string;
    }

    if (search) {
        where.OR = [
            { name: { contains: search as string, mode: 'insensitive' } },
            { brand: { contains: search as string, mode: 'insensitive' } },
            { normalizedName: { contains: search as string, mode: 'insensitive' } },
        ];
    }

    const [products, total] = await Promise.all([
        prisma.savioProduct.findMany({
            where,
            skip,
            take,
            orderBy: { [sortBy as string]: order as 'asc' | 'desc' },
            include: {
                platformSkus: {
                    where: { isActive: true },
                    include: {
                        prices: {
                            where: {
                                pincode: pincode as string,
                            },
                            orderBy: { scrapedAt: 'desc' },
                            take: 1,
                        },
                    },
                },
            },
        }),
        prisma.savioProduct.count({ where }),
    ]);

    const enrichedProducts = products.map((product) => {
        const prices = product.platformSkus.map((sku) => toPriceInfo(sku, product));

        return {
            ...product,
            prices,
            platformSkus: product.platformSkus.map((sku) => ({
                id: sku.id,
                platform: sku.platform,
                platformSkuId: sku.platformSkuId,
                platformProductUrl: sku.platformProductUrl,
            })),
            platformLinks: buildPlatformLinks(product.platformSkus),
            platformSearchFallbacks: buildPlatformSearchFallbacks(
                buildPlatformQueryText(product.brand, product.name)
            ),
        };
    });

    sendSuccess(res, {
        products: enrichedProducts,
        pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            pages: Math.ceil(total / take),
        },
    });
});

export const getProductByUsku = catchAsync(async (req: Request, res: Response) => {
    const { usku } = req.params;

    const product = await prisma.savioProduct.findUnique({
        where: { usku },
        include: {
            platformSkus: {
                where: { isActive: true },
                include: {
                    prices: {
                        where: {
                            expiresAt: { gt: new Date() },
                        },
                        orderBy: { scrapedAt: 'desc' },
                        take: 1,
                    },
                },
            },
        },
    });

    if (!product) {
        return sendError(res, 'Product not found', 404);
    }

    sendSuccess(res, product);
});

export const getProductPrices = catchAsync(async (req: Request, res: Response) => {
    const { usku } = req.params;
    const { pincode } = req.query;

    if (!pincode) {
        return sendError(res, 'Pincode is required', 400);
    }

    // Check cache first
    const cacheKey = `product:prices:${usku}:${pincode}`;
    const cachedData = await getCachedData<ProductWithPrices>(cacheKey);

    if (cachedData) {
        return sendSuccess(res, cachedData, 'Prices retrieved (cached)');
    }

    // Fetch product with prices
    const product = await prisma.savioProduct.findUnique({
        where: { usku },
        include: {
            platformSkus: {
                where: { isActive: true },
                include: {
                    // Preserve exact product URLs for handoff
                    prices: {
                        where: {
                            pincode: pincode as string,
                        },
                        orderBy: { scrapedAt: 'desc' },
                        take: 1,
                    },
                },
            },
        },
    });

    if (!product) {
        return sendError(res, 'Product not found', 404);
    }

    // Transform data
    const prices: PriceInfo[] = product.platformSkus
        .map((sku) => toPriceInfo(sku, product));

    const result: ProductWithPrices = {
        usku: product.usku,
        name: product.name,
        brand: product.brand || undefined,
        category: product.category,
        quantity: product.quantity ? parseFloat(product.quantity.toString()) : undefined,
        unit: product.unit || undefined,
        primaryImageUrl: product.primaryImageUrl || undefined,
        platformLinks: buildPlatformLinks(product.platformSkus),
        platformSearchFallbacks: buildPlatformSearchFallbacks(
            buildPlatformQueryText(product.brand, product.name)
        ),
        prices,
    };

    // Cache for 5 minutes
    await setCachedData(cacheKey, result, 300);

    sendSuccess(res, result);
});

export const searchProducts = catchAsync(async (req: Request, res: Response) => {
    const { q, limit = '10' } = req.query;

    if (!q || (q as string).length < 2) {
        return sendError(res, 'Search query must be at least 2 characters', 400);
    }

    const products = await prisma.savioProduct.findMany({
        where: {
            isActive: true,
            OR: [
                { name: { contains: q as string, mode: 'insensitive' } },
                { brand: { contains: q as string, mode: 'insensitive' } },
                { category: { contains: q as string, mode: 'insensitive' } },
            ],
        },
        take: parseInt(limit as string),
        orderBy: { popularityScore: 'desc' },
        select: {
            usku: true,
            name: true,
            brand: true,
            category: true,
            primaryImageUrl: true,
            quantity: true,
            unit: true,
        },
    });

    sendSuccess(res, products);
});
