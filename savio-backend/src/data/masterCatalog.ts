// Local copy of the master product catalog.
// Source of truth lives in savio/src/data/dummyProducts.ts — keep in sync manually.
// Cross-project imports are not allowed; the backend must be self-contained.

type PlatformKey = 'amazon' | 'zepto' | 'blinkit' | 'instamart' | 'bigbasket' | 'flipkart' | 'jiomart';

type CatalogSeed = {
  category: string;
  brand: string;
  name: string;
  unit?: string;
  quantity?: number;
  basePrice: number;
  image: string;
  priceChange?: number;
  subcategory?: string;
  platformLinks?: Partial<Record<PlatformKey, string>>;
};

export type MasterCatalogEntry = {
  usku: string;
  name: string;
  brand: string;
  category: string;
  subcategory?: string;
  image: string;
  quantity?: number;
  unit?: string;
  normalizedName: string;
  normalizedQuantity?: number;
  variant?: string;
  priceHint: number;
  priceChange: number;
  platformLinks: Partial<Record<PlatformKey, string>>;
  platformSearchFallbacks: Record<PlatformKey, string>;
};

const searchBuilders: Record<PlatformKey, (query: string) => string> = {
  amazon: (query) => `https://www.amazon.in/s?k=${query}`,
  bigbasket: (query) => `https://www.bigbasket.com/ps/?q=${query}`,
  blinkit: (query) => `https://blinkit.com/s/?q=${query}`,
  flipkart: (query) => `https://www.flipkart.com/search?q=${query}`,
  instamart: (query) => `https://www.swiggy.com/instamart/search?query=${query}`,
  jiomart: (query) => `https://www.jiomart.com/search/${query}`,
  zepto: (query) => `https://www.zeptonow.com/search?query=${query}`,
};

function buildSearchQueryText(brand: string, name: string) {
  const lowerName = name.toLowerCase();
  const lowerBrand = brand.toLowerCase();

  if (lowerName.startsWith(lowerBrand)) {
    return name.trim();
  }

  return `${brand} ${name}`.trim();
}

function nameToUsku(name: string) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeQuantity(quantity?: number, unit?: string) {
  if (typeof quantity !== 'number' || !unit) {
    return undefined;
  }

  const normalizedUnit = unit.toLowerCase();

  if (normalizedUnit === 'g') {
    return quantity / 1000;
  }

  if (normalizedUnit === 'ml') {
    return quantity / 1000;
  }

  return quantity;
}

function buildVariant(seed: CatalogSeed) {
  const lowerName = seed.name.toLowerCase();

  if (lowerName.includes('toned')) return 'toned';
  if (lowerName.includes('whole wheat')) return 'whole-wheat';
  if (lowerName.includes('crunchy')) return 'crunchy';
  if (lowerName.includes('masala')) return 'masala';
  if (lowerName.includes('salted')) return 'salted';
  if (lowerName.includes('classic')) return 'classic';

  return seed.subcategory;
}

function buildSearchFallbacks(seed: CatalogSeed): Record<PlatformKey, string> {
  const query = encodeURIComponent(buildSearchQueryText(seed.brand, seed.name));

  return {
    amazon: searchBuilders.amazon(query),
    bigbasket: searchBuilders.bigbasket(query),
    blinkit: searchBuilders.blinkit(query),
    flipkart: searchBuilders.flipkart(query),
    instamart: searchBuilders.instamart(query),
    jiomart: searchBuilders.jiomart(query),
    zepto: searchBuilders.zepto(query),
  };
}

const catalogSeeds: CatalogSeed[] = [
  { category: 'Dairy', brand: 'Amul', name: 'Amul Taaza Milk 1L', quantity: 1, unit: 'L', basePrice: 58, image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600', priceChange: -2 },
  { category: 'Dairy', brand: 'Mother Dairy', name: 'Mother Dairy Toned Milk 1L', quantity: 1, unit: 'L', basePrice: 56, image: 'https://images.unsplash.com/photo-1517448931760-9bf4414148c5?w=600', priceChange: -1 },
  { category: 'Dairy', brand: 'Amul', name: 'Amul Fresh Paneer 200g', quantity: 200, unit: 'g', basePrice: 92, image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=600', priceChange: 3 },
  { category: 'Dairy', brand: 'Epigamia', name: 'Epigamia Greek Yogurt Blueberry 90g', quantity: 90, unit: 'g', basePrice: 48, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600', priceChange: 2 },
  { category: 'Dairy', brand: 'Amul', name: 'Amul Masti Curd 400g', quantity: 400, unit: 'g', basePrice: 42, image: 'https://images.unsplash.com/photo-1571212515416-fca88ce4f6c4?w=600', priceChange: -1 },
  { category: 'Dairy', brand: 'Britannia', name: 'Britannia Cheese Slices 200g', quantity: 200, unit: 'g', basePrice: 128, image: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=600', priceChange: 4 },
  { category: 'Dairy', brand: 'Nandini', name: 'Nandini Salted Butter 100g', quantity: 100, unit: 'g', basePrice: 58, image: 'https://images.unsplash.com/photo-1589985270958-bf087119a8d3?w=600', priceChange: -3 },
  { category: 'Dairy', brand: 'Amul', name: 'Amul Buttermilk 200ml', quantity: 200, unit: 'ml', basePrice: 14, image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600', priceChange: 1 },

  { category: 'Fruits & Vegetables', brand: 'Fresho', name: 'Banana Robusta 1kg', quantity: 1, unit: 'kg', basePrice: 44, image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600', priceChange: -5 },
  { category: 'Fruits & Vegetables', brand: 'Fresho', name: 'Apple Royal Gala 4 pcs', quantity: 4, unit: 'pcs', basePrice: 129, image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=600', priceChange: 2 },
  { category: 'Fruits & Vegetables', brand: 'Fresho', name: 'Tomato Hybrid 1kg', quantity: 1, unit: 'kg', basePrice: 34, image: 'https://images.unsplash.com/photo-1546470427-e26264be0b0d?w=600', priceChange: -7 },
  { category: 'Fruits & Vegetables', brand: 'Fresho', name: 'Onion 1kg', quantity: 1, unit: 'kg', basePrice: 29, image: 'https://images.unsplash.com/photo-1508747703725-719777637510?w=600', priceChange: -4 },
  { category: 'Fruits & Vegetables', brand: 'Fresho', name: 'Potato 1kg', quantity: 1, unit: 'kg', basePrice: 31, image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600', priceChange: -2 },
  { category: 'Fruits & Vegetables', brand: 'Fresho', name: 'Spinach Bunch', quantity: 1, unit: 'bunch', basePrice: 22, image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600', priceChange: 1 },
  { category: 'Fruits & Vegetables', brand: 'Fresho', name: 'Carrot Orange 500g', quantity: 500, unit: 'g', basePrice: 28, image: 'https://images.unsplash.com/photo-1447175008436-054170c2e979?w=600', priceChange: 3 },
  { category: 'Fruits & Vegetables', brand: 'Fresho', name: 'Pomegranate 2 pcs', quantity: 2, unit: 'pcs', basePrice: 110, image: 'https://images.unsplash.com/photo-1541344999736-83eca272f6fc?w=600', priceChange: 5 },

  { category: 'Snacks', brand: 'Lay\'s', name: 'Lay\'s Magic Masala 82g', quantity: 82, unit: 'g', basePrice: 20, image: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=600', priceChange: 1 },
  { category: 'Snacks', brand: 'Bingo', name: 'Bingo Mad Angles 72g', quantity: 72, unit: 'g', basePrice: 24, image: 'https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=600', priceChange: -2 },
  { category: 'Snacks', brand: 'Kurkure', name: 'Kurkure Masala Munch 90g', quantity: 90, unit: 'g', basePrice: 21, image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=600', priceChange: -1 },
  { category: 'Snacks', brand: 'Haldiram\'s', name: 'Haldiram\'s Aloo Bhujia 200g', quantity: 200, unit: 'g', basePrice: 68, image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=600', priceChange: 2 },
  { category: 'Snacks', brand: 'Britannia', name: 'Britannia 50-50 Maska Chaska 120g', quantity: 120, unit: 'g', basePrice: 29, image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600', priceChange: 1 },
  { category: 'Snacks', brand: 'Too Yumm', name: 'Too Yumm Veggie Stix 75g', quantity: 75, unit: 'g', basePrice: 30, image: 'https://images.unsplash.com/photo-1519869325930-281384150729?w=600', priceChange: 3 },
  { category: 'Snacks', brand: 'Cadbury', name: 'Cadbury Dairy Milk 50g', quantity: 50, unit: 'g', basePrice: 40, image: 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=600', priceChange: 4 },
  { category: 'Snacks', brand: 'Parle', name: 'Parle Monaco Classic 75g', quantity: 75, unit: 'g', basePrice: 18, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600', priceChange: -1 },

  { category: 'Beverages', brand: 'Tropicana', name: 'Tropicana Mixed Fruit Juice 1L', quantity: 1, unit: 'L', basePrice: 118, image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600', priceChange: -2 },
  { category: 'Beverages', brand: 'Coca-Cola', name: 'Coca-Cola 750ml', quantity: 750, unit: 'ml', basePrice: 40, image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=600', priceChange: 2 },
  { category: 'Beverages', brand: 'Paper Boat', name: 'Paper Boat Aamras 250ml', quantity: 250, unit: 'ml', basePrice: 35, image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600', priceChange: 1 },
  { category: 'Beverages', brand: 'Red Bull', name: 'Red Bull Energy Drink 250ml', quantity: 250, unit: 'ml', basePrice: 125, image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600', priceChange: 5 },
  { category: 'Beverages', brand: 'Nescafe', name: 'Nescafe Classic 50g', quantity: 50, unit: 'g', basePrice: 168, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600', priceChange: -4 },
  { category: 'Beverages', brand: 'Taj Mahal', name: 'Taj Mahal Tea 500g', quantity: 500, unit: 'g', basePrice: 289, image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=600', priceChange: -3 },
  { category: 'Beverages', brand: 'Bournvita', name: 'Bournvita Health Drink 750g', quantity: 750, unit: 'g', basePrice: 329, image: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600', priceChange: 2 },
  { category: 'Beverages', brand: 'Amul', name: 'Amul Kool Kesar 180ml', quantity: 180, unit: 'ml', basePrice: 25, image: 'https://images.unsplash.com/photo-1553787499-6f913324e1c1?w=600', priceChange: 0 },

  { category: 'Staples', brand: 'Aashirvaad', name: 'Aashirvaad Atta 5kg', quantity: 5, unit: 'kg', basePrice: 286, image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600', priceChange: -6 },
  { category: 'Staples', brand: 'Fortune', name: 'Fortune Biryani Special Basmati Rice 5kg', quantity: 5, unit: 'kg', basePrice: 429, image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600', priceChange: -8 },
  { category: 'Staples', brand: '24 Mantra', name: 'Toor Dal 1kg', quantity: 1, unit: 'kg', basePrice: 168, image: 'https://images.unsplash.com/photo-1515543904379-3d757afe72e3?w=600', priceChange: 1 },
  { category: 'Staples', brand: 'Fortune', name: 'Sunflower Oil 1L', quantity: 1, unit: 'L', basePrice: 159, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600', priceChange: -3 },
  { category: 'Staples', brand: 'Tata Sampann', name: 'Chana Dal 1kg', quantity: 1, unit: 'kg', basePrice: 96, image: 'https://images.unsplash.com/photo-1603048719539-9ecb4f00cdd0?w=600', priceChange: 2 },
  { category: 'Staples', brand: 'Catch', name: 'Jeera Powder 200g', quantity: 200, unit: 'g', basePrice: 89, image: 'https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=600', priceChange: 1 },
  { category: 'Staples', brand: 'Everest', name: 'Turmeric Powder 200g', quantity: 200, unit: 'g', basePrice: 72, image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600', priceChange: -2 },
  { category: 'Staples', brand: 'Tata Salt', name: 'Tata Salt Iodized 1kg', quantity: 1, unit: 'kg', basePrice: 29, image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600', priceChange: 0 },

  { category: 'Personal Care', brand: 'Dove', name: 'Dove Intense Repair Shampoo 340ml', quantity: 340, unit: 'ml', basePrice: 252, image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600', priceChange: 2 },
  { category: 'Personal Care', brand: 'Nivea', name: 'Nivea Body Lotion 200ml', quantity: 200, unit: 'ml', basePrice: 199, image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600', priceChange: -3 },
  { category: 'Personal Care', brand: 'Colgate', name: 'Colgate Strong Teeth Toothpaste 200g', quantity: 200, unit: 'g', basePrice: 118, image: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=600', priceChange: 1 },
  { category: 'Personal Care', brand: 'Pears', name: 'Pears Pure Soap 125g', quantity: 125, unit: 'g', basePrice: 58, image: 'https://images.unsplash.com/photo-1584305574647-acf8069a2dbd?w=600', priceChange: 0 },
  { category: 'Personal Care', brand: 'Lakme', name: 'Lakme Face Wash 100g', quantity: 100, unit: 'g', basePrice: 165, image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600', priceChange: 3 },
  { category: 'Personal Care', brand: 'Vaseline', name: 'Vaseline Lip Therapy Rosy 10g', quantity: 10, unit: 'g', basePrice: 49, image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600', priceChange: 2 },
  { category: 'Personal Care', brand: 'Head & Shoulders', name: 'Head & Shoulders Cool Menthol 180ml', quantity: 180, unit: 'ml', basePrice: 179, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600', priceChange: -1 },
  { category: 'Personal Care', brand: 'Gillette', name: 'Gillette Guard Razor 1 pc', quantity: 1, unit: 'pc', basePrice: 22, image: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=600', priceChange: 0 },

  { category: 'Household', brand: 'Presto', name: 'Presto Garbage Bags Large 30 pcs', quantity: 30, unit: 'pcs', basePrice: 99, image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600', priceChange: -1 },
  { category: 'Household', brand: 'Origami', name: 'Origami Tissue Paper 200 pulls', quantity: 200, unit: 'pulls', basePrice: 88, image: 'https://images.unsplash.com/photo-1616628182508-6d0d819d2f55?w=600', priceChange: 2 },
  { category: 'Household', brand: 'Milton', name: 'Milton Water Bottle 1L', quantity: 1, unit: 'L', basePrice: 149, image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600', priceChange: 4 },
  { category: 'Household', brand: 'Cello', name: 'Cello Storage Container Set 3 pcs', quantity: 3, unit: 'pcs', basePrice: 219, image: 'https://images.unsplash.com/photo-1517705008128-361805f42e86?w=600', priceChange: 3 },
  { category: 'Household', brand: 'Scotch-Brite', name: 'Scotch-Brite Scrub Pad 3 pcs', quantity: 3, unit: 'pcs', basePrice: 42, image: 'https://images.unsplash.com/photo-1583947582886-f40ec95dd752?w=600', priceChange: -1 },
  { category: 'Household', brand: 'Eveready', name: 'Eveready AA Batteries 4 pcs', quantity: 4, unit: 'pcs', basePrice: 78, image: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=600', priceChange: 1 },
  { category: 'Household', brand: 'Turtle Wax', name: 'Microfiber Cleaning Cloth 2 pcs', quantity: 2, unit: 'pcs', basePrice: 89, image: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=600', priceChange: 0 },
  { category: 'Household', brand: 'Amazon Basics', name: 'Aluminium Foil 72 sq ft', quantity: 72, unit: 'sq ft', basePrice: 116, image: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=600', priceChange: -2 },

  { category: 'Breakfast', brand: 'Kellogg\'s', name: 'Kellogg\'s Corn Flakes Original 475g', quantity: 475, unit: 'g', basePrice: 178, image: 'https://images.unsplash.com/photo-1517093157656-b9eccef91cb1?w=600', priceChange: -2 },
  { category: 'Breakfast', brand: 'MTR', name: 'MTR Instant Idli Mix 500g', quantity: 500, unit: 'g', basePrice: 92, image: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=600', priceChange: 1 },
  { category: 'Breakfast', brand: 'Saffola', name: 'Saffola Oats Classic 1kg', quantity: 1, unit: 'kg', basePrice: 199, image: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=600', priceChange: -3 },
  { category: 'Breakfast', brand: 'Bagrry\'s', name: 'Bagrry\'s Muesli 500g', quantity: 500, unit: 'g', basePrice: 245, image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=600', priceChange: 2 },
  { category: 'Breakfast', brand: 'Britannia', name: 'Britannia Whole Wheat Bread 400g', quantity: 400, unit: 'g', basePrice: 48, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600', priceChange: 0 },
  { category: 'Breakfast', brand: 'Kissan', name: 'Kissan Mixed Fruit Jam 500g', quantity: 500, unit: 'g', basePrice: 158, image: 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?w=600', priceChange: 1 },
  { category: 'Breakfast', brand: 'Pintola', name: 'Pintola Peanut Butter Crunchy 350g', quantity: 350, unit: 'g', basePrice: 175, image: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=600', priceChange: 4 },
  { category: 'Breakfast', brand: 'Quaker', name: 'Quaker Oats Pouch 1kg', quantity: 1, unit: 'kg', basePrice: 189, image: 'https://images.unsplash.com/photo-1571197119661-756b6bf15aa3?w=600', priceChange: -1 },

  { category: 'Instant Food', brand: 'Maggi', name: 'Maggi 2-Minute Noodles Masala 12 pack', quantity: 12, unit: 'pack', basePrice: 168, image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=600', priceChange: 2 },
  { category: 'Instant Food', brand: 'Yippee', name: 'Sunfeast Yippee Magic Masala 4 pack', quantity: 4, unit: 'pack', basePrice: 52, image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=600', priceChange: 1 },
  { category: 'Instant Food', brand: 'MTR', name: 'MTR Ready to Eat Paneer Butter Masala 300g', quantity: 300, unit: 'g', basePrice: 99, image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600', priceChange: 3 },
  { category: 'Instant Food', brand: 'Gits', name: 'Gits Gulab Jamun Mix 200g', quantity: 200, unit: 'g', basePrice: 76, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600', priceChange: 1 },
  { category: 'Instant Food', brand: 'Ching\'s', name: 'Ching\'s Hakka Noodles 150g', quantity: 150, unit: 'g', basePrice: 32, image: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=600', priceChange: 0 },
  { category: 'Instant Food', brand: 'Knorr', name: 'Knorr Sweet Corn Soup 3 pack', quantity: 3, unit: 'pack', basePrice: 58, image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600', priceChange: -1 },
  { category: 'Instant Food', brand: 'McCain', name: 'McCain French Fries 420g', quantity: 420, unit: 'g', basePrice: 112, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600', priceChange: 2 },
  { category: 'Instant Food', brand: 'ID Fresh', name: 'ID Fresh Rava Idli Batter 1kg', quantity: 1, unit: 'kg', basePrice: 76, image: 'https://images.unsplash.com/photo-1630409351217-bc4fa6422075?w=600', priceChange: -2 },

  { category: 'Cleaning', brand: 'Surf Excel', name: 'Surf Excel Easy Wash 1kg', quantity: 1, unit: 'kg', basePrice: 158, image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600', priceChange: -2 },
  { category: 'Cleaning', brand: 'Ariel', name: 'Ariel Matic Front Load 1kg', quantity: 1, unit: 'kg', basePrice: 245, image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600', priceChange: 3 },
  { category: 'Cleaning', brand: 'Lizol', name: 'Lizol Citrus Floor Cleaner 975ml', quantity: 975, unit: 'ml', basePrice: 162, image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600', priceChange: 1 },
  { category: 'Cleaning', brand: 'Harpic', name: 'Harpic Toilet Cleaner 1L', quantity: 1, unit: 'L', basePrice: 187, image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600', priceChange: -1 },
  { category: 'Cleaning', brand: 'Vim', name: 'Vim Dishwash Liquid Gel 750ml', quantity: 750, unit: 'ml', basePrice: 109, image: 'https://images.unsplash.com/photo-1583947582886-f40ec95dd752?w=600', priceChange: 2 },
  { category: 'Cleaning', brand: 'Colin', name: 'Colin Glass Cleaner 500ml', quantity: 500, unit: 'ml', basePrice: 92, image: 'https://images.unsplash.com/photo-1592005228930-0f3f651d43f5?w=600', priceChange: 0 },
  { category: 'Cleaning', brand: 'Pril', name: 'Pril Dishwash Bar 200g', quantity: 200, unit: 'g', basePrice: 20, image: 'https://images.unsplash.com/photo-1610552050890-fe99536c2617?w=600', priceChange: -1 },
  { category: 'Cleaning', brand: 'Dettol', name: 'Dettol Antiseptic Disinfectant 250ml', quantity: 250, unit: 'ml', basePrice: 92, image: 'https://images.unsplash.com/photo-1584305574647-acf8069a2dbd?w=600', priceChange: 1 },

  { category: 'Baby Care', brand: 'Huggies', name: 'Huggies Wonder Pants Medium 34 pcs', quantity: 34, unit: 'pcs', basePrice: 399, image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600', priceChange: -4 },
  { category: 'Baby Care', brand: 'Pampers', name: 'Pampers Premium Care Small 22 pcs', quantity: 22, unit: 'pcs', basePrice: 349, image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600', priceChange: -2 },
  { category: 'Baby Care', brand: 'Mee Mee', name: 'Mee Mee Baby Wipes 72 pcs', quantity: 72, unit: 'pcs', basePrice: 99, image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600', priceChange: 1 },
  { category: 'Baby Care', brand: 'Sebamed', name: 'Sebamed Baby Lotion 200ml', quantity: 200, unit: 'ml', basePrice: 410, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600', priceChange: 3 },
  { category: 'Baby Care', brand: 'Johnson\'s', name: 'Johnson\'s Baby Powder 200g', quantity: 200, unit: 'g', basePrice: 152, image: 'https://images.unsplash.com/photo-1556228724-4b4ffed2e15d?w=600', priceChange: 2 },
  { category: 'Baby Care', brand: 'Nestle', name: 'Cerelac Wheat Apple 300g', quantity: 300, unit: 'g', basePrice: 229, image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=600', priceChange: 1 },
  { category: 'Baby Care', brand: 'Farlin', name: 'Farlin Feeding Bottle 250ml', quantity: 250, unit: 'ml', basePrice: 175, image: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600', priceChange: 0 },
  { category: 'Baby Care', brand: 'LuvLap', name: 'LuvLap Baby Laundry Liquid 1L', quantity: 1, unit: 'L', basePrice: 215, image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600', priceChange: -1 },

  { category: 'Pet Care', brand: 'Pedigree', name: 'Pedigree Adult Dog Food 1.2kg', quantity: 1.2, unit: 'kg', basePrice: 329, image: 'https://images.unsplash.com/photo-1583512603806-077998240c7a?w=600', priceChange: 2 },
  { category: 'Pet Care', brand: 'Drools', name: 'Drools Puppy Dry Food 1.2kg', quantity: 1.2, unit: 'kg', basePrice: 289, image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=600', priceChange: -1 },
  { category: 'Pet Care', brand: 'Whiskas', name: 'Whiskas Ocean Fish Cat Food 1kg', quantity: 1, unit: 'kg', basePrice: 345, image: 'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?w=600', priceChange: 3 },
  { category: 'Pet Care', brand: 'Purepet', name: 'Purepet Chicken Dog Biscuits 450g', quantity: 450, unit: 'g', basePrice: 108, image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600', priceChange: 1 },
  { category: 'Pet Care', brand: 'Me-O', name: 'Me-O Creamy Cat Treats Tuna 60g', quantity: 60, unit: 'g', basePrice: 98, image: 'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?w=600', priceChange: 4 },
  { category: 'Pet Care', brand: 'Basil', name: 'Basil Pet Shampoo 500ml', quantity: 500, unit: 'ml', basePrice: 189, image: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=600', priceChange: 0 },
  { category: 'Pet Care', brand: 'Heads Up For Tails', name: 'HUFT Chicken Jerky Treats 70g', quantity: 70, unit: 'g', basePrice: 149, image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600', priceChange: 2 },
  { category: 'Pet Care', brand: 'Savic', name: 'Cat Litter Clumping 5kg', quantity: 5, unit: 'kg', basePrice: 299, image: 'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?w=600', priceChange: -2 },
  { category: 'Dairy', brand: 'Farm Fresh', name: 'Farm Fresh Eggs 12 pcs', quantity: 12, unit: 'pcs', basePrice: 86, image: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=600', priceChange: -1, subcategory: 'eggs' },
  { category: 'Staples', brand: 'Madhur', name: 'Madhur Pure Sugar 1kg', quantity: 1, unit: 'kg', basePrice: 49, image: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=600', priceChange: 1, subcategory: 'sugar' },
  { category: 'Instant Food', brand: 'Maggi', name: 'Maggi 2-Minute Noodles Masala 4 pack', quantity: 4, unit: 'pack', basePrice: 56, image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=600', priceChange: 2, subcategory: 'noodles' },
  { category: 'Personal Care', brand: 'Lux', name: 'Lux Jasmine Soap 150g', quantity: 150, unit: 'g', basePrice: 38, image: 'https://images.unsplash.com/photo-1584305574647-acf8069a2dbd?w=600', priceChange: 0, subcategory: 'soap' },
];

export const MASTER_CATALOG_ENTRIES: MasterCatalogEntry[] = catalogSeeds.map((seed) => ({
  usku: nameToUsku(seed.name),
  name: seed.name,
  brand: seed.brand,
  category: seed.category,
  subcategory: seed.subcategory,
  image: seed.image,
  quantity: seed.quantity,
  unit: seed.unit,
  normalizedName: seed.name.toLowerCase().trim(),
  normalizedQuantity: normalizeQuantity(seed.quantity, seed.unit),
  variant: buildVariant(seed),
  priceHint: seed.basePrice,
  priceChange: seed.priceChange ?? 0,
  platformLinks: seed.platformLinks || {},
  platformSearchFallbacks: buildSearchFallbacks(seed),
}));
