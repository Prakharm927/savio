import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import prisma from '../config/database';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess, sendError } from '../utils/response';
import { getCachedData, setCachedData } from '../config/redis';
import {
    ComparisonItemStatus,
    ComparisonRequest,
    ComparisonResponse,
    PlatformComparison,
} from '../types';
import crypto from 'crypto';

const SUPPORTED_COMPARISON_PLATFORMS = ['bigbasket', 'jiomart', 'amazon', 'flipkart', 'zepto'] as const;

function getAgeMinutes(timestamp?: Date) {
    if (!timestamp) {
        return Number.POSITIVE_INFINITY;
    }

    return Math.max(0, Math.round((Date.now() - timestamp.getTime()) / 60000));
}

function getConfidenceFromAge(ageMinutes: number): {
    confidence: 'high' | 'medium' | 'low';
    score: number;
} {
    if (ageMinutes <= 5) {
        return { confidence: 'high', score: 3 };
    }

    if (ageMinutes <= 15) {
        return { confidence: 'medium', score: 2 };
    }

    return { confidence: 'low', score: 1 };
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

    const hours = Math.round(ageMinutes / 60);
    return `Updated ${hours}h ago`;
}

function comparePlatforms(a: PlatformComparison, b: PlatformComparison) {
    if (a.allItemsAvailable !== b.allItemsAvailable) {
        return a.allItemsAvailable ? -1 : 1;
    }

    if (a.itemsInStock !== b.itemsInStock) {
        return b.itemsInStock - a.itemsInStock;
    }

    if (a.total !== b.total) {
        return a.total - b.total;
    }

    if ((a.etaMinutes || Number.POSITIVE_INFINITY) !== (b.etaMinutes || Number.POSITIVE_INFINITY)) {
        return (a.etaMinutes || Number.POSITIVE_INFINITY) - (b.etaMinutes || Number.POSITIVE_INFINITY);
    }

    return b.confidenceScore - a.confidenceScore;
}

export const compareCart = catchAsync(async (req: Request, res: Response) => {
    const { items, pincode, userId }: ComparisonRequest = req.body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
        return sendError(res, 'Items array is required and must not be empty', 400);
    }

    if (!pincode || pincode.length !== 6) {
        return sendError(res, 'Valid 6-digit pincode is required', 400);
    }

    // Generate cache key from cart hash
    const cartHash = crypto
        .createHash('md5')
        .update(JSON.stringify(items.sort((a, b) => a.usku.localeCompare(b.usku))))
        .digest('hex');
    const cacheKey = `comparison:${cartHash}:${pincode}`;

    // Check cache
    const cachedResult = await getCachedData<ComparisonResponse>(cacheKey);
    if (cachedResult) {
        return sendSuccess(res, cachedResult, 'Comparison result (cached)');
    }

    // Fetch all platform SKUs and prices for the items
    const uskus = items.map((item) => item.usku);

    const productsWithPrices = await prisma.savioProduct.findMany({
        where: {
            usku: { in: uskus },
            isActive: true,
        },
        include: {
            platformSkus: {
                where: { isActive: true },
                include: {
                    prices: {
                        where: {
                            pincode: pincode,
                        },
                        orderBy: { scrapedAt: 'desc' },
                        take: 1,
                    },
                },
            },
        },
    });

    const productsByUsku = new Map(productsWithPrices.map((product) => [product.usku, product]));

    const platformData = new Map<
        string,
        {
            items: ComparisonItemStatus[];
            subtotal: number;
            itemsInStock: number;
            itemsOutOfStock: number;
            itemsUnknown: number;
            unavailableItems: string[];
            unknownItems: string[];
            maxAgeMinutes: number;
            minConfidenceScore: number;
        }
    >();

    SUPPORTED_COMPARISON_PLATFORMS.forEach((platform) => {
        platformData.set(platform, {
            items: [],
            subtotal: 0,
            itemsInStock: 0,
            itemsOutOfStock: 0,
            itemsUnknown: 0,
            unavailableItems: [],
            unknownItems: [],
            maxAgeMinutes: 0,
            minConfidenceScore: 3,
        });
    });

    for (const cartItem of items) {
        const product = productsByUsku.get(cartItem.usku);

        for (const platform of SUPPORTED_COMPARISON_PLATFORMS) {
            const platformInfo = platformData.get(platform)!;

            if (!product) {
                platformInfo.itemsOutOfStock += 1;
                platformInfo.unavailableItems.push(cartItem.usku);
                platformInfo.items.push({
                    usku: cartItem.usku,
                    name: cartItem.usku,
                    quantity: cartItem.quantity,
                    price: null,
                    total: null,
                    available: false,
                    status: 'unavailable',
                    stockStatus: 'not_in_catalog',
                    reason: 'This product is not mapped in the Savio catalog yet',
                    lastCheckedLabel: 'Catalog mapping missing',
                    confidence: 'low',
                });
                platformInfo.minConfidenceScore = Math.min(platformInfo.minConfidenceScore, 1);
                continue;
            }

            const sku = product.platformSkus.find((entry) => entry.platform === platform);

            if (!sku) {
                platformInfo.itemsOutOfStock += 1;
                platformInfo.unavailableItems.push(product.name);
                platformInfo.items.push({
                    usku: product.usku,
                    name: product.name,
                    quantity: cartItem.quantity,
                    price: null,
                    total: null,
                    available: false,
                    status: 'unavailable',
                    stockStatus: 'not_mapped',
                    reason: 'No catalog mapping for this platform',
                    lastCheckedLabel: 'Catalog mapping missing',
                    confidence: 'low',
                });
                platformInfo.minConfidenceScore = Math.min(platformInfo.minConfidenceScore, 1);
                continue;
            }

            const latestPrice = sku.prices[0];

            if (!latestPrice) {
                platformInfo.itemsUnknown += 1;
                platformInfo.unknownItems.push(product.name);
                platformInfo.items.push({
                    usku: product.usku,
                    name: product.name,
                    quantity: cartItem.quantity,
                    price: null,
                    total: null,
                    available: false,
                    status: 'unknown',
                    stockStatus: 'checking_failed',
                    reason: 'Latest platform check is unavailable',
                    lastCheckedLabel: 'Checking failed',
                    confidence: 'low',
                });
                platformInfo.minConfidenceScore = Math.min(platformInfo.minConfidenceScore, 1);
                continue;
            }

            const ageMinutes = getAgeMinutes(latestPrice.scrapedAt);
            const confidenceMeta = getConfidenceFromAge(ageMinutes);
            const lastCheckedLabel = formatLastCheckedLabel(ageMinutes);
            const numericPrice = parseFloat(latestPrice.price.toString());
            const itemTotal = numericPrice * cartItem.quantity;

            platformInfo.maxAgeMinutes = Math.max(platformInfo.maxAgeMinutes, ageMinutes);
            platformInfo.minConfidenceScore = Math.min(platformInfo.minConfidenceScore, confidenceMeta.score);

            if (latestPrice.inStock) {
                platformInfo.subtotal += itemTotal;
                platformInfo.itemsInStock += 1;
                platformInfo.items.push({
                    usku: product.usku,
                    name: product.name,
                    quantity: cartItem.quantity,
                    price: numericPrice,
                    total: itemTotal,
                    available: true,
                    status: 'available',
                    stockStatus: latestPrice.stockStatus,
                    lastCheckedAt: latestPrice.scrapedAt.toISOString(),
                    lastCheckedLabel,
                    confidence: confidenceMeta.confidence,
                });
                continue;
            }

            platformInfo.itemsOutOfStock += 1;
            platformInfo.unavailableItems.push(product.name);
            platformInfo.items.push({
                usku: product.usku,
                name: product.name,
                quantity: cartItem.quantity,
                price: null,
                total: null,
                available: false,
                status: 'unavailable',
                stockStatus: latestPrice.stockStatus,
                reason:
                    latestPrice.stockStatus === 'out_of_stock'
                        ? 'Out of stock'
                        : 'Not available in your area',
                lastCheckedAt: latestPrice.scrapedAt.toISOString(),
                lastCheckedLabel,
                confidence: confidenceMeta.confidence,
            });
        }
    }

    // Fetch delivery rules
    const cityPrefix = pincode.substring(0, 3);
    const deliveryRules = await prisma.deliveryRule.findMany({
        where: {
            platform: { in: Array.from(SUPPORTED_COMPARISON_PLATFORMS) },
            OR: [
                { pincodePrefix: cityPrefix },
                { pincodePrefix: null }, // Fallback rules
            ],
            isActive: true,
        },
        orderBy: { pincodePrefix: 'desc' }, // Prefer specific pincode rules
    });

    // Build platform comparisons
    const platformComparisons: PlatformComparison[] = [];

    for (const platform of SUPPORTED_COMPARISON_PLATFORMS) {
        const data = platformData.get(platform)!;
        const rule = deliveryRules.find((r) => r.platform === platform);

        // Calculate delivery fee
        let deliveryFee = 0;
        if (rule) {
            if (
                rule.freeDeliveryThreshold &&
                data.subtotal >= parseFloat(rule.freeDeliveryThreshold.toString())
            ) {
                deliveryFee = 0;
            } else if (rule.baseDeliveryFee) {
                deliveryFee = parseFloat(rule.baseDeliveryFee.toString());
            }
        }

        const platformFee = rule?.platformFee
            ? parseFloat(rule.platformFee.toString())
            : 0;
        const total = data.subtotal + deliveryFee + platformFee;

        const totalItems = items.length;
        const availabilityRate =
            totalItems > 0 ? (data.itemsInStock / totalItems) * 100 : 0;
        const confidence =
            data.minConfidenceScore >= 3
                ? 'high'
                : data.minConfidenceScore === 2
                    ? 'medium'
                    : 'low';
        const allItemsAvailable = data.itemsInStock === totalItems;
        const dataStatus =
            data.itemsUnknown > 0
                ? 'failed'
                : data.maxAgeMinutes > 15
                    ? 'stale'
                    : 'live';
        const lastCheckedLabel =
            data.items.length > 0 ? formatLastCheckedLabel(data.maxAgeMinutes) : 'Checking failed';
        const lastCheckedAt =
            data.items
                .map((item) => item.lastCheckedAt)
                .filter((value): value is string => Boolean(value))
                .sort()
                .pop() || undefined;

        platformComparisons.push({
            platform,
            available: data.itemsInStock > 0,
            itemsInStock: data.itemsInStock,
            itemsOutOfStock: data.itemsOutOfStock,
            itemsUnknown: data.itemsUnknown,
            availabilityRate: Math.round(availabilityRate),
            subtotal: data.subtotal,
            deliveryFee,
            platformFee,
            total,
            savings: 0, // Will calculate below
            eta: rule?.typicalEtaLabel || 'Not available',
            etaMinutes: rule?.etaRangeMin || undefined,
            unavailableItems:
                data.unavailableItems.length > 0 ? data.unavailableItems : undefined,
            unknownItems:
                data.unknownItems.length > 0 ? data.unknownItems : undefined,
            items: data.items,
            allItemsAvailable,
            confidence,
            confidenceScore: data.minConfidenceScore,
            dataStatus,
            lastCheckedAt,
            lastCheckedLabel,
            deliveryFeeLabel:
                deliveryFee > 0 || platformFee > 0
                    ? `₹${Math.round(deliveryFee + platformFee)}*`
                    : 'Free',
        });
    }

    platformComparisons.sort(comparePlatforms);

    // Calculate savings relative to most expensive
    if (platformComparisons.length > 0) {
        const maxTotal = Math.max(...platformComparisons.map((p) => p.total));
        platformComparisons.forEach((p) => {
            p.savings = maxTotal - p.total;
        });
    }

    const recommendedPlatform = platformComparisons[0]?.platform || null;
    const cheapestPlatform =
        [...platformComparisons]
            .filter((p) => p.available)
            .sort((a, b) => a.total - b.total)[0]?.platform || null;
    const fastestPlatform = platformComparisons
        .filter((p) => p.available && p.etaMinutes !== undefined)
        .sort((a, b) => (a.etaMinutes || 0) - (b.etaMinutes || 0))[0]?.platform || null;
    const mostCompletePlatform =
        [...platformComparisons]
            .sort((a, b) => {
                if (a.itemsInStock !== b.itemsInStock) {
                    return b.itemsInStock - a.itemsInStock;
                }
                return a.total - b.total;
            })[0]?.platform || null;
    const maxSavings = platformComparisons[0]?.savings || 0;

    const result: ComparisonResponse = {
        pincode,
        itemCount: items.length,
        platforms: platformComparisons,
        recommendedPlatform,
        cheapestPlatform,
        fastestPlatform,
        mostCompletePlatform,
        maxSavings,
        timestamp: new Date().toISOString(),
    };

    // Store comparison history
    try {
        await prisma.comparisonHistory.create({
            data: {
                userId: userId || null,
                itemCount: items.length,
                itemsCompared: items as unknown as Prisma.InputJsonValue,
                totalValueMin: platformComparisons[0]?.total || 0,
                totalValueMax:
                    platformComparisons[platformComparisons.length - 1]?.total || 0,
                platformsChecked: Array.from(SUPPORTED_COMPARISON_PLATFORMS),
                cheapestPlatform,
                cheapestTotal: platformComparisons[0]?.total || 0,
                fastestPlatform,
                selectedPlatform: recommendedPlatform,
                potentialSavings: maxSavings,
                pincode,
                comparisonType: 'cart',
            },
        });
    } catch (error) {
        // Don't fail the request if history save fails
        console.error('Failed to save comparison history:', error);
    }

    // Cache result for 10 minutes
    await setCachedData(cacheKey, result, 600);

    sendSuccess(res, result, 'Comparison completed successfully');
});
