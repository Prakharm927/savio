export interface CartItem {
    usku: string;
    quantity: number;
}

export interface ComparisonRequest {
    items: CartItem[];
    pincode: string;
    userId?: string;
}

export interface ComparisonItemStatus {
    usku: string;
    name: string;
    quantity: number;
    price: number | null;
    total: number | null;
    available: boolean;
    status: 'available' | 'unavailable' | 'unknown';
    stockStatus: string;
    reason?: string;
    lastCheckedAt?: string;
    lastCheckedLabel: string;
    confidence: 'high' | 'medium' | 'low';
}

export interface PlatformComparison {
    platform: string;
    available: boolean;
    itemsInStock: number;
    itemsOutOfStock: number;
    itemsUnknown: number;
    availabilityRate: number;
    subtotal: number;
    deliveryFee: number;
    platformFee: number;
    total: number;
    savings: number;
    eta: string;
    etaMinutes?: number;
    unavailableItems?: string[];
    unknownItems?: string[];
    items: ComparisonItemStatus[];
    allItemsAvailable: boolean;
    confidence: 'high' | 'medium' | 'low';
    confidenceScore: number;
    dataStatus: 'live' | 'stale' | 'failed';
    lastCheckedAt?: string;
    lastCheckedLabel: string;
    deliveryFeeLabel: string;
}

export interface ComparisonResponse {
    pincode: string;
    itemCount: number;
    platforms: PlatformComparison[];
    recommendedPlatform: string | null;
    cheapestPlatform: string | null;
    fastestPlatform: string | null;
    mostCompletePlatform: string | null;
    maxSavings: number;
    timestamp: string;
}

export interface PriceInfo {
    platform: string;
    platformSkuId: number;
    price: number | null;
    mrp?: number;
    discountPercent?: number;
    inStock: boolean;
    stockStatus: string;
    scrapedAt: Date;
    status: 'available' | 'unavailable' | 'unknown';
    confidence: 'high' | 'medium' | 'low';
    lastCheckedLabel: string;
    reason?: string;
    productUrl?: string;
    searchUrl?: string;
    deepLink?: string;
}

export interface ProductWithPrices {
    usku: string;
    name: string;
    brand?: string;
    category: string;
    quantity?: number;
    unit?: string;
    primaryImageUrl?: string;
    platformLinks?: Partial<Record<'amazon' | 'flipkart' | 'jiomart' | 'bigbasket' | 'zepto' | 'blinkit' | 'instamart', string>>;
    platformSearchFallbacks?: Record<'amazon' | 'flipkart' | 'jiomart' | 'bigbasket' | 'zepto' | 'blinkit' | 'instamart', string>;
    prices: PriceInfo[];
}
