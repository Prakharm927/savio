import { PrismaClient } from '@prisma/client';
import { MASTER_CATALOG_ENTRIES } from '../src/data/masterCatalog';

const prisma = new PrismaClient();

const DEFAULT_PINCODE = '560001';

const PLATFORM_PRICE_OFFSETS = {
  amazon: 4,
  bigbasket: -1,
  flipkart: 3,
  jiomart: 2,
} as const;

const PLATFORM_DELIVERY_RULES = [
  {
    platform: 'bigbasket',
    city: 'Bangalore',
    pincodePrefix: '560',
    freeDeliveryThreshold: 199,
    baseDeliveryFee: 35,
    platformFee: 8,
    typicalEtaLabel: 'Delivers in 18-30 minutes',
    etaRangeMin: 18,
    etaRangeMax: 30,
    hasMembershipDiscount: true,
    membershipTypes: ['bbstar'],
  },
  {
    platform: 'jiomart',
    city: 'Bangalore',
    pincodePrefix: '560',
    freeDeliveryThreshold: 299,
    baseDeliveryFee: 25,
    platformFee: 6,
    typicalEtaLabel: 'Delivers in 25-40 minutes',
    etaRangeMin: 25,
    etaRangeMax: 40,
    hasMembershipDiscount: false,
    membershipTypes: [],
  },
  {
    platform: 'amazon',
    city: 'Bangalore',
    pincodePrefix: '560',
    freeDeliveryThreshold: 499,
    baseDeliveryFee: 40,
    platformFee: 0,
    typicalEtaLabel: 'Scheduled delivery in 45-90 minutes',
    etaRangeMin: 45,
    etaRangeMax: 90,
    hasMembershipDiscount: true,
    membershipTypes: ['prime'],
  },
  {
    platform: 'flipkart',
    city: 'Bangalore',
    pincodePrefix: '560',
    freeDeliveryThreshold: 299,
    baseDeliveryFee: 30,
    platformFee: 5,
    typicalEtaLabel: 'Delivers in 20-35 minutes',
    etaRangeMin: 20,
    etaRangeMax: 35,
    hasMembershipDiscount: false,
    membershipTypes: [],
  },
  {
    platform: 'zepto',
    city: 'Bangalore',
    pincodePrefix: '560',
    freeDeliveryThreshold: 199,
    baseDeliveryFee: 25,
    platformFee: 3,
    typicalEtaLabel: 'Delivers in 10-20 minutes',
    etaRangeMin: 10,
    etaRangeMax: 20,
    hasMembershipDiscount: false,
    membershipTypes: [],
  },
];

function toTitleCaseCategory(value: string) {
  return value.trim();
}

function buildTags(entry: (typeof MASTER_CATALOG_ENTRIES)[number]) {
  return Array.from(
    new Set(
      [
        entry.category,
        entry.subcategory,
        entry.brand,
        entry.unit,
        ...entry.name.split(' '),
      ]
        .filter(Boolean)
        .map((tag) => String(tag).toLowerCase())
    )
  );
}

function buildPlatformPrice(priceHint: number, platform: keyof typeof PLATFORM_PRICE_OFFSETS) {
  return Math.max(1, priceHint + PLATFORM_PRICE_OFFSETS[platform]);
}

function buildProductDescription(entry: (typeof MASTER_CATALOG_ENTRIES)[number]) {
  if (entry.name.toLowerCase().startsWith(entry.brand.toLowerCase())) {
    return `${entry.name} available for Savio grocery comparison.`;
  }

  return `${entry.brand} ${entry.name} available for Savio grocery comparison.`;
}

async function main() {
  console.log('🌱 Seeding Savio real catalog...');

  await prisma.comparisonHistory.deleteMany();
  await prisma.savedListItem.deleteMany();
  await prisma.savedList.deleteMany();
  await prisma.userFavorite.deleteMany();
  await prisma.userCart.deleteMany();
  await prisma.priceLatest.deleteMany();
  await prisma.platformSku.deleteMany();
  await prisma.savioProduct.deleteMany();
  await prisma.deliveryRule.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleared existing data');

  const user = await prisma.user.create({
    data: {
      phoneNumber: '+919876543210',
      email: 'test@savio.app',
      fullName: 'Test User',
      defaultPincode: DEFAULT_PINCODE,
      defaultCity: 'Bangalore',
      preferredPlatforms: ['bigbasket', 'jiomart', 'amazon', 'flipkart'],
      hasPrime: true,
      hasBBStar: true,
    },
  });

  console.log('✅ Created test user');

  const catalogProducts = MASTER_CATALOG_ENTRIES.map((entry, index) => ({
    usku: entry.usku,
    name: entry.name,
    normalizedName: entry.normalizedName,
    brand: entry.brand,
    category: toTitleCaseCategory(entry.category),
    subcategory: entry.subcategory || null,
    tags: buildTags(entry),
    quantity: entry.quantity ?? null,
    unit: entry.unit ?? null,
    normalizedQuantity: entry.normalizedQuantity ?? null,
    variant: entry.variant || null,
    description: buildProductDescription(entry),
    ingredients: null,
    nutritionInfo: null,
    primaryImageUrl: entry.image,
    additionalImages: [],
    qualityScore: 86,
    popularityScore: Math.max(50, 100 - index),
    isActive: true,
  }));

  await prisma.savioProduct.createMany({ data: catalogProducts });
  console.log(`✅ Created ${catalogProducts.length} master catalog products`);

  const platformSkuRows = MASTER_CATALOG_ENTRIES.flatMap((entry) =>
    (Object.keys(PLATFORM_PRICE_OFFSETS) as Array<keyof typeof PLATFORM_PRICE_OFFSETS>).map((platform) => ({
      usku: entry.usku,
      platform,
      platformSkuId: `${platform.toUpperCase()}-${entry.usku}`,
      platformProductUrl: entry.platformLinks[platform] || null,
      platformName: entry.name,
      matchConfidence: 0.92,
      matchType: entry.platformLinks[platform] ? 'exact' : 'catalog-search',
      normalizedUnitPrice:
        typeof entry.normalizedQuantity === 'number' && entry.normalizedQuantity > 0
          ? Number((buildPlatformPrice(entry.priceHint, platform) / entry.normalizedQuantity).toFixed(2))
          : null,
      isActive: true,
      lastSeenAt: new Date(),
      consecutive404Count: 0,
    }))
  );

  await prisma.platformSku.createMany({ data: platformSkuRows });
  console.log(`✅ Created ${platformSkuRows.length} platform SKU mappings`);

  const platformSkus = await prisma.platformSku.findMany({
    select: {
      id: true,
      usku: true,
      platform: true,
    },
  });

  const entryByUsku = new Map(MASTER_CATALOG_ENTRIES.map((entry) => [entry.usku, entry]));

  const priceRows = platformSkus.map((sku) => {
    const entry = entryByUsku.get(sku.usku);
    if (!entry) {
      throw new Error(`Missing catalog entry for ${sku.usku}`);
    }

    const platform = sku.platform as keyof typeof PLATFORM_PRICE_OFFSETS;
    const price = buildPlatformPrice(entry.priceHint, platform);
    const mrp = Math.max(price + 4, entry.priceHint + 8);
    const discountPercent = Number((((mrp - price) / mrp) * 100).toFixed(2));

    return {
      platformSkuId: sku.id,
      pincode: DEFAULT_PINCODE,
      price,
      mrp,
      discountPercent,
      inStock: true,
      stockStatus: 'in_stock',
      confidenceScore: 0.9,
      dataSource: 'seed',
      scrapedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };
  });

  await prisma.priceLatest.createMany({ data: priceRows });
  console.log(`✅ Created ${priceRows.length} live price rows`);

  await prisma.deliveryRule.createMany({ data: PLATFORM_DELIVERY_RULES });
  console.log(`✅ Created ${PLATFORM_DELIVERY_RULES.length} delivery rules`);

  const starterCartUs = MASTER_CATALOG_ENTRIES.slice(0, 6);
  await prisma.userCart.createMany({
    data: starterCartUs.map((entry, index) => ({
      userId: user.id,
      usku: entry.usku,
      quantity: index < 2 ? 2 : 1,
    })),
  });

  console.log('✅ Added starter cart items');

  console.log('\n🎉 Savio catalog seeded successfully');
  console.log(`   - Products: ${catalogProducts.length}`);
  console.log(`   - Platform SKUs: ${platformSkuRows.length}`);
  console.log(`   - Price rows: ${priceRows.length}`);
  console.log(`   - Default pincode: ${DEFAULT_PINCODE}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('❌ Seeding error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
