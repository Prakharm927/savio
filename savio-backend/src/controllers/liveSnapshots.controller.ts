import { Request, Response } from 'express';
import prisma from '../config/database';
import { invalidateCache } from '../config/redis';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess, sendError } from '../utils/response';

type LivePlatform = 'zepto';
type SnapshotConfidence = 'high' | 'medium' | 'low';

type LiveSnapshotProduct = {
    name: string;
    price?: number | null;
    mrp?: number | null;
    available?: boolean;
    stockStatus?: string;
    confidence?: SnapshotConfidence;
    productUrl?: string;
    rawLine?: string;
};

const SUPPORTED_LIVE_PLATFORMS: LivePlatform[] = ['zepto'];
const TOKEN_STOPWORDS = new Set([
    'the',
    'and',
    'with',
    'for',
    'new',
    'buy',
    'off',
    'add',
    'rs',
    'mrp',
    'only',
    'pack',
]);

function normalizeText(value?: string | null) {
    return (value || '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenize(value?: string | null) {
    return normalizeText(value)
        .split(' ')
        .filter((token) => token.length >= 3 && !TOKEN_STOPWORDS.has(token));
}

function buildProductText(product: {
    name: string;
    brand: string | null;
    normalizedName: string;
    category: string;
    tags: string[];
}) {
    return normalizeText([
        product.brand,
        product.name,
        product.normalizedName,
        product.category,
        ...(product.tags || []),
    ].filter(Boolean).join(' '));
}

function scoreProductMatch(
    candidateName: string,
    product: {
        name: string;
        brand: string | null;
        normalizedName: string;
        category: string;
        tags: string[];
    }
) {
    const candidateTokens = tokenize(candidateName);
    if (candidateTokens.length === 0) {
        return 0;
    }

    const productText = buildProductText(product);
    let matches = 0;

    candidateTokens.forEach((token) => {
        if (productText.includes(token)) {
            matches += 1;
        }
    });

    const coverage = matches / candidateTokens.length;
    const brandBoost =
        product.brand && normalizeText(candidateName).includes(normalizeText(product.brand))
            ? 0.16
            : 0;
    const exactBoost = normalizeText(product.name).includes(normalizeText(candidateName)) ? 0.12 : 0;

    return Math.min(0.98, coverage + brandBoost + exactBoost);
}

function confidenceToScore(confidence?: SnapshotConfidence) {
    if (confidence === 'high') {
        return 0.92;
    }

    if (confidence === 'medium') {
        return 0.75;
    }

    return 0.58;
}

function calculateDiscount(price: number, mrp?: number | null) {
    if (!mrp || mrp <= price) {
        return null;
    }

    return Math.round(((mrp - price) / mrp) * 10000) / 100;
}

export const ingestZeptoSnapshot = catchAsync(async (req: Request, res: Response) => {
    const {
        platform = 'zepto',
        pincode = process.env.DEFAULT_PINCODE || '560001',
        packageName,
        capturedAt,
        products,
    }: {
        platform?: LivePlatform;
        pincode?: string;
        packageName?: string;
        capturedAt?: number;
        products?: LiveSnapshotProduct[];
    } = req.body;

    if (!SUPPORTED_LIVE_PLATFORMS.includes(platform)) {
        return sendError(res, 'Unsupported live snapshot platform', 400);
    }

    if (!Array.isArray(products) || products.length === 0) {
        return sendError(res, 'Snapshot products array is required', 400);
    }

    if (!/^\d{6}$/.test(pincode)) {
        return sendError(res, 'Valid 6-digit pincode is required', 400);
    }

    const catalog = await prisma.savioProduct.findMany({
        where: { isActive: true },
        select: {
            usku: true,
            name: true,
            brand: true,
            normalizedName: true,
            category: true,
            tags: true,
        },
        take: 500,
    });

    const capturedDate =
        typeof capturedAt === 'number' && capturedAt > 0 ? new Date(capturedAt) : new Date();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const results: Array<{
        inputName: string;
        usku?: string;
        productName?: string;
        matchScore?: number;
        status: 'matched' | 'skipped';
        reason?: string;
    }> = [];

    for (const candidate of products.slice(0, 80)) {
        const inputName = (candidate.name || '').trim();
        const price = Number(candidate.price);

        if (!inputName || !Number.isFinite(price) || price <= 0) {
            results.push({
                inputName: inputName || candidate.rawLine || 'unknown',
                status: 'skipped',
                reason: 'Missing product name or selling price',
            });
            continue;
        }

        let bestMatch: (typeof catalog)[number] | null = null;
        let bestScore = 0;

        for (const product of catalog) {
            const score = scoreProductMatch(inputName, product);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = product;
            }
        }

        if (!bestMatch || bestScore < 0.34) {
            results.push({
                inputName,
                status: 'skipped',
                matchScore: Number(bestScore.toFixed(2)),
                reason: 'No confident Savio catalog match',
            });
            continue;
        }

        const platformSkuId = `ZEPTO-LIVE-${bestMatch.usku}`;
        const platformSku = await prisma.platformSku.upsert({
            where: {
                platform_platformSkuId: {
                    platform,
                    platformSkuId,
                },
            },
            update: {
                usku: bestMatch.usku,
                platformProductUrl: candidate.productUrl || null,
                platformName: inputName,
                matchConfidence: Math.max(0.5, Math.min(0.98, bestScore)),
                matchType: 'accessibility-live',
                isActive: true,
                lastSeenAt: capturedDate,
                consecutive404Count: 0,
            },
            create: {
                usku: bestMatch.usku,
                platform,
                platformSkuId,
                platformProductUrl: candidate.productUrl || null,
                platformName: inputName,
                matchConfidence: Math.max(0.5, Math.min(0.98, bestScore)),
                matchType: 'accessibility-live',
                isActive: true,
                lastSeenAt: capturedDate,
            },
        });

        const available = candidate.available !== false;
        const mrp = candidate.mrp && candidate.mrp > price ? candidate.mrp : null;

        await prisma.priceLatest.upsert({
            where: {
                platformSkuId_pincode: {
                    platformSkuId: platformSku.id,
                    pincode,
                },
            },
            update: {
                price,
                mrp,
                discountPercent: calculateDiscount(price, mrp),
                inStock: available,
                stockStatus: candidate.stockStatus || (available ? 'in_stock' : 'out_of_stock'),
                confidenceScore: confidenceToScore(candidate.confidence),
                dataSource: `accessibility:${packageName || platform}`,
                scrapedAt: capturedDate,
                expiresAt,
            },
            create: {
                platformSkuId: platformSku.id,
                pincode,
                price,
                mrp,
                discountPercent: calculateDiscount(price, mrp),
                inStock: available,
                stockStatus: candidate.stockStatus || (available ? 'in_stock' : 'out_of_stock'),
                confidenceScore: confidenceToScore(candidate.confidence),
                dataSource: `accessibility:${packageName || platform}`,
                scrapedAt: capturedDate,
                expiresAt,
            },
        });

        results.push({
            inputName,
            usku: bestMatch.usku,
            productName: bestMatch.name,
            matchScore: Number(bestScore.toFixed(2)),
            status: 'matched',
        });
    }

    await Promise.all([
        invalidateCache(`product:prices:*:${pincode}`),
        invalidateCache(`comparison:*:${pincode}`),
    ]);

    const matched = results.filter((result) => result.status === 'matched').length;

    sendSuccess(res, {
        platform,
        pincode,
        matched,
        skipped: results.length - matched,
        results,
    }, 'Live Zepto snapshot ingested');
});
