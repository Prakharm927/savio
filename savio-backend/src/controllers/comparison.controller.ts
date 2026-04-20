import { Request, Response } from 'express';
import prisma from '../config/database';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess, sendError } from '../utils/response';
import { getCachedData, setCachedData } from '../config/redis';
import {
    ComparisonRequest,
    ComparisonResponse,
    PlatformComparison,
} from '../types';
import crypto from 'crypto';

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
                            expiresAt: { gt: new Date() },
                        },
                        orderBy: { scrapedAt: 'desc' },
                        take: 1,
                    },
                },
            },
        },
    });

    // Build platform-wise data
    const platformData: Map<string, any> = new Map();
    const platforms = new Set<string>();

    for (const product of productsWithPrices) {
        const itemQuantity = items.find((i) => i.usku === product.usku)?.quantity || 1;

        for (const sku of product.platformSkus) {
            platforms.add(sku.platform);

            if (!platformData.has(sku.platform)) {
                platformData.set(sku.platform, {
                    items: [],
                    subtotal: 0,
                    itemsInStock: 0,
                    itemsOutOfStock: 0,
                    unavailableItems: [],
                });
            }

            const platformInfo = platformData.get(sku.platform)!;

            if (sku.prices.length > 0) {
                const price = sku.prices[0];
                const itemTotal = parseFloat(price.price.toString()) * itemQuantity;

                platformInfo.items.push({
                    usku: product.usku,
                    name: product.name,
                    quantity: itemQuantity,
                    price: parseFloat(price.price.toString()),
                    total: itemTotal,
                    inStock: price.inStock,
                });

                if (price.inStock) {
                    platformInfo.subtotal += itemTotal;
                    platformInfo.itemsInStock += 1;
                } else {
                    platformInfo.itemsOutOfStock += 1;
                    platformInfo.unavailableItems.push(product.name);
                }
            } else {
                // No price data for this item on this platform
                platformInfo.unavailableItems.push(product.name);
                platformInfo.itemsOutOfStock += 1;
            }
        }
    }

    // Fetch delivery rules
    const cityPrefix = pincode.substring(0, 3);
    const deliveryRules = await prisma.deliveryRule.findMany({
        where: {
            platform: { in: Array.from(platforms) },
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

    for (const platform of platforms) {
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

        platformComparisons.push({
            platform,
            available: data.itemsInStock > 0,
            itemsInStock: data.itemsInStock,
            itemsOutOfStock: data.itemsOutOfStock,
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
        });
    }

    // Sort by total price (cheapest first)
    platformComparisons.sort((a, b) => a.total - b.total);

    // Calculate savings relative to most expensive
    if (platformComparisons.length > 0) {
        const maxTotal = Math.max(...platformComparisons.map((p) => p.total));
        platformComparisons.forEach((p) => {
            p.savings = maxTotal - p.total;
        });
    }

    const cheapestPlatform =
        platformComparisons.find((p) => p.available)?.platform || null;
    const fastestPlatform = platformComparisons
        .filter((p) => p.available && p.etaMinutes !== undefined)
        .sort((a, b) => (a.etaMinutes || 0) - (b.etaMinutes || 0))[0]?.platform || null;
    const maxSavings = platformComparisons[0]?.savings || 0;

    const result: ComparisonResponse = {
        pincode,
        itemCount: items.length,
        platforms: platformComparisons,
        cheapestPlatform,
        fastestPlatform,
        maxSavings,
        timestamp: new Date().toISOString(),
    };

    // Store comparison history
    try {
        await prisma.comparisonHistory.create({
            data: {
                userId: userId || null,
                itemCount: items.length,
                itemsCompared: items,
                totalValueMin: platformComparisons[0]?.total || 0,
                totalValueMax:
                    platformComparisons[platformComparisons.length - 1]?.total || 0,
                platformsChecked: Array.from(platforms),
                cheapestPlatform,
                cheapestTotal: platformComparisons[0]?.total || 0,
                fastestPlatform,
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
