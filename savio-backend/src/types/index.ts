export interface CartItem {
    usku: string;
    quantity: number;
}

export interface ComparisonRequest {
    items: CartItem[];
    pincode: string;
    userId?: string;
}

export interface PlatformComparison {
    platform: string;
    available: boolean;
    itemsInStock: number;
    itemsOutOfStock: number;
    availabilityRate: number;
    subtotal: number;
    deliveryFee: number;
    platformFee: number;
    total: number;
    savings: number;
    eta: string;
    etaMinutes?: number;
    unavailableItems?: string[];
}

export interface ComparisonResponse {
    pincode: string;
    itemCount: number;
    platforms: PlatformComparison[];
    cheapestPlatform: string | null;
    fastestPlatform: string | null;
    maxSavings: number;
    timestamp: string;
}

export interface PriceInfo {
    platform: string;
    platformSkuId: number;
    price: number;
    mrp?: number;
    discountPercent?: number;
    inStock: boolean;
    stockStatus: string;
    scrapedAt: Date;
}

export interface ProductWithPrices {
    usku: string;
    name: string;
    brand?: string;
    category: string;
    quantity?: number;
    unit?: string;
    primaryImageUrl?: string;
    prices: PriceInfo[];
}
