import { Request, Response } from 'express';
import prisma from '../config/database';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess, sendError } from '../utils/response';
import { getCachedData, setCachedData } from '../config/redis';
import { ProductWithPrices, PriceInfo } from '../types';

export const getAllProducts = catchAsync(async (req: Request, res: Response) => {
    const {
        page = '1',
        limit = '20',
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
                    select: {
                        platform: true,
                        platformSkuId: true,
                    },
                },
            },
        }),
        prisma.savioProduct.count({ where }),
    ]);

    sendSuccess(res, {
        products,
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
                    prices: {
                        where: {
                            pincode: pincode as string,
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

    // Transform data
    const prices: PriceInfo[] = product.platformSkus
        .filter((sku) => sku.prices.length > 0)
        .map((sku) => ({
            platform: sku.platform,
            platformSkuId: sku.id,
            price: parseFloat(sku.prices[0].price.toString()),
            mrp: sku.prices[0].mrp ? parseFloat(sku.prices[0].mrp.toString()) : undefined,
            discountPercent: sku.prices[0].discountPercent
                ? parseFloat(sku.prices[0].discountPercent.toString())
                : undefined,
            inStock: sku.prices[0].inStock,
            stockStatus: sku.prices[0].stockStatus,
            scrapedAt: sku.prices[0].scrapedAt,
        }));

    const result: ProductWithPrices = {
        usku: product.usku,
        name: product.name,
        brand: product.brand || undefined,
        category: product.category,
        quantity: product.quantity ? parseFloat(product.quantity.toString()) : undefined,
        unit: product.unit || undefined,
        primaryImageUrl: product.primaryImageUrl || undefined,
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
