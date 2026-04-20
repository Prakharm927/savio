import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Clear existing data
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

    // Create users
    const user1 = await prisma.user.create({
        data: {
            phoneNumber: '+919876543210',
            email: 'test@prixo.com',
            fullName: 'Test User',
            defaultPincode: '560001',
            defaultCity: 'Bangalore',
            preferredPlatforms: ['bigbasket', 'amazon'],
            hasPrime: true,
        },
    });

    console.log('✅ Created test users');

    // Create products
    const products = [
        {
            usku: 'USKU-MILK-001',
            name: 'Amul Taaza Toned Milk',
            normalizedName: 'amul taaza toned milk',
            brand: 'Amul',
            category: 'dairy',
            subcategory: 'milk',
            quantity: 1.0,
            unit: 'L',
            normalizedQuantity: 1.0,
            variant: 'toned',
            primaryImageUrl: 'https://via.placeholder.com/200x200?text=Amul+Milk',
            popularityScore: 100,
        },
        {
            usku: 'USKU-BREAD-001',
            name: 'Britannia Bread - Whole Wheat',
            normalizedName: 'britannia bread whole wheat',
            brand: 'Britannia',
            category: 'bakery',
            subcategory: 'bread',
            quantity: 400,
            unit: 'g',
            normalizedQuantity: 0.4,
            variant: 'whole wheat',
            primaryImageUrl: 'https://via.placeholder.com/200x200?text=Britannia+Bread',
            popularityScore: 90,
        },
        {
            usku: 'USKU-RICE-001',
            name: 'India Gate Basmati Rice',
            normalizedName: 'india gate basmati rice',
            brand: 'India Gate',
            category: 'staples',
            subcategory: 'rice',
            quantity: 5.0,
            unit: 'kg',
            normalizedQuantity: 5.0,
            variant: 'basmati',
            primaryImageUrl: 'https://via.placeholder.com/200x200?text=India+Gate+Rice',
            popularityScore: 85,
        },
        {
            usku: 'USKU-OIL-001',
            name: 'Fortune Sunflower Oil',
            normalizedName: 'fortune sunflower oil',
            brand: 'Fortune',
            category: 'staples',
            subcategory: 'oil',
            quantity: 1.0,
            unit: 'L',
            normalizedQuantity: 1.0,
            variant: 'refined',
            primaryImageUrl: 'https://via.placeholder.com/200x200?text=Fortune+Oil',
            popularityScore: 80,
        },
        {
            usku: 'USKU-COFFEE-001',
            name: 'Nescafe Classic Coffee',
            normalizedName: 'nescafe classic coffee',
            brand: 'Nescafe',
            category: 'beverages',
            subcategory: 'coffee',
            quantity: 200,
            unit: 'g',
            normalizedQuantity: 0.2,
            variant: 'instant',
            primaryImageUrl: 'https://via.placeholder.com/200x200?text=Nescafe',
            popularityScore: 75,
        },
    ];

    await prisma.savioProduct.createMany({ data: products });
    console.log('✅ Created 5 sample products');

    // Create platform SKUs
    const platformSkus = await prisma.platformSku.createMany({
        data: [
            // Amul Milk
            {
                usku: 'USKU-MILK-001',
                platform: 'bigbasket',
                platformSkuId: 'BB-40001234',
                matchConfidence: 0.95,
                matchType: 'exact',
            },
            {
                usku: 'USKU-MILK-001',
                platform: 'amazon',
                platformSkuId: 'AMZ-B08XYZ1234',
                matchConfidence: 0.92,
                matchType: 'fuzzy',
            },
            {
                usku: 'USKU-MILK-001',
                platform: 'blinkit',
                platformSkuId: 'BLKT-123456',
                matchConfidence: 0.90,
                matchType: 'fuzzy',
            },

            // Britannia Bread
            {
                usku: 'USKU-BREAD-001',
                platform: 'bigbasket',
                platformSkuId: 'BB-40005678',
                matchConfidence: 0.98,
                matchType: 'exact',
            },
            {
                usku: 'USKU-BREAD-001',
                platform: 'amazon',
                platformSkuId: 'AMZ-B08ABC5678',
                matchConfidence: 0.85,
                matchType: 'semantic',
            },
            {
                usku: 'USKU-BREAD-001',
                platform: 'blinkit',
                platformSkuId: 'BLKT-789012',
                matchConfidence: 0.93,
                matchType: 'exact',
            },

            // Rice
            {
                usku: 'USKU-RICE-001',
                platform: 'bigbasket',
                platformSkuId: 'BB-40009012',
                matchConfidence: 0.96,
                matchType: 'exact',
            },
            {
                usku: 'USKU-RICE-001',
                platform: 'amazon',
                platformSkuId: 'AMZ-B08DEF9012',
                matchConfidence: 0.94,
                matchType: 'exact',
            },

            // Oil
            {
                usku: 'USKU-OIL-001',
                platform: 'bigbasket',
                platformSkuId: 'BB-40003456',
                matchConfidence: 0.97,
                matchType: 'exact',
            },
            {
                usku: 'USKU-OIL-001',
                platform: 'blinkit',
                platformSkuId: 'BLKT-345678',
                matchConfidence: 0.91,
                matchType: 'fuzzy',
            },

            // Coffee
            {
                usku: 'USKU-COFFEE-001',
                platform: 'bigbasket',
                platformSkuId: 'BB-40007890',
                matchConfidence: 0.99,
                matchType: 'exact',
            },
            {
                usku: 'USKU-COFFEE-001',
                platform: 'amazon',
                platformSkuId: 'AMZ-B08GHI7890',
                matchConfidence: 0.96,
                matchType: 'exact',
            },
            {
                usku: 'USKU-COFFEE-001',
                platform: 'blinkit',
                platformSkuId: 'BLKT-901234',
                matchConfidence: 0.88,
                matchType: 'fuzzy',
            },
        ],
    });

    console.log('✅ Created platform SKU mappings');

    // Fetch platform SKU IDs for price creation
    const allPlatformSkus = await prisma.platformSku.findMany();

    // Create prices for Bangalore (560001)
    const prices = allPlatformSkus.map((sku) => {
        let price = 0;
        let mrp = 0;

        // Set realistic prices based on product
        if (sku.usku === 'USKU-MILK-001') {
            // Milk prices
            price = sku.platform === 'bigbasket' ? 56 : sku.platform === 'amazon' ? 58 : 54;
            mrp = 60;
        } else if (sku.usku === 'USKU-BREAD-001') {
            // Bread prices
            price = sku.platform === 'bigbasket' ? 35 : sku.platform === 'amazon' ? 38 : 32;
            mrp = 40;
        } else if (sku.usku === 'USKU-RICE-001') {
            // Rice prices
            price = sku.platform === 'bigbasket' ? 485 : 495;
            mrp = 550;
        } else if (sku.usku === 'USKU-OIL-001') {
            // Oil prices
            price = sku.platform === 'bigbasket' ? 165 : 160;
            mrp = 180;
        } else if (sku.usku === 'USKU-COFFEE-001') {
            // Coffee prices
            price = sku.platform === 'bigbasket' ? 285 : sku.platform === 'amazon' ? 290 : 280;
            mrp = 320;
        }

        const discountPercent = mrp > 0 ? ((mrp - price) / mrp) * 100 : 0;

        return {
            platformSkuId: sku.id,
            pincode: '560001',
            price,
            mrp,
            discountPercent: Math.round(discountPercent * 100) / 100,
            inStock: true,
            stockStatus: 'in_stock',
            scrapedAt: new Date(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000), // Expires in 15 minutes
        };
    });

    await prisma.priceLatest.createMany({ data: prices });
    console.log('✅ Created price data for Bangalore (560001)');

    // Create delivery rules
    await prisma.deliveryRule.createMany({
        data: [
            {
                platform: 'bigbasket',
                city: 'Bangalore',
                pincodePrefix: '560',
                freeDeliveryThreshold: 200,
                baseDeliveryFee: 40,
                platformFee: 10,
                typicalEtaLabel: 'Usually delivers in 2-3 hours',
                etaRangeMin: 120,
                etaRangeMax: 180,
                hasMembershipDiscount: true,
                membershipTypes: ['bbstar'],
            },
            {
                platform: 'amazon',
                city: 'Bangalore',
                pincodePrefix: '560',
                freeDeliveryThreshold: 499,
                baseDeliveryFee: 50,
                platformFee: 0,
                typicalEtaLabel: 'Delivers tomorrow',
                etaRangeMin: 1440,
                etaRangeMax: 2880,
                hasMembershipDiscount: true,
                membershipTypes: ['prime'],
            },
            {
                platform: 'blinkit',
                city: 'Bangalore',
                pincodePrefix: '560',
                freeDeliveryThreshold: 99,
                baseDeliveryFee: 25,
                platformFee: 5,
                typicalEtaLabel: 'Delivers in 10-15 minutes',
                etaRangeMin: 10,
                etaRangeMax: 15,
                hasMembershipDiscount: false,
                membershipTypes: [],
            },
        ],
    });

    console.log('✅ Created delivery rules');

    // Add items to user cart
    await prisma.userCart.createMany({
        data: [
            { userId: user1.id, usku: 'USKU-MILK-001', quantity: 2 },
            { userId: user1.id, usku: 'USKU-BREAD-001', quantity: 1 },
            { userId: user1.id, usku: 'USKU-COFFEE-001', quantity: 1 },
        ],
    });

    console.log('✅ Added items to user cart');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('   - Users: 1');
    console.log('   - Products: 5');
    console.log('   - Platform SKUs: 13');
    console.log('   - Prices: 13 (for Bangalore 560001)');
    console.log('   - Delivery Rules: 3');
    console.log('   - Cart Items: 3');
    console.log('\n💡 Try these queries:');
    console.log('   - GET http://localhost:3000/api/products');
    console.log('   - GET http://localhost:3000/api/products/USKU-MILK-001/prices?pincode=560001');
    console.log('   - POST http://localhost:3000/api/comparison');
    console.log('     Body: {"items": [{"usku": "USKU-MILK-001", "quantity": 2}], "pincode": "560001"}');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error('❌ Seeding error:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
