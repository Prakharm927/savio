export type BackendPlatformKey =
  | 'amazon'
  | 'bigbasket'
  | 'blinkit'
  | 'flipkart'
  | 'instamart'
  | 'jiomart'
  | 'zepto';

export function buildPlatformQueryText(brand: string | null | undefined, name: string) {
  const trimmedName = name.trim();
  const trimmedBrand = (brand || '').trim();

  if (!trimmedBrand) {
    return trimmedName;
  }

  if (trimmedName.toLowerCase().startsWith(trimmedBrand.toLowerCase())) {
    return trimmedName;
  }

  return `${trimmedBrand} ${trimmedName}`.trim();
}

export function buildPlatformSearchFallbacks(queryText: string): Record<BackendPlatformKey, string> {
  const query = encodeURIComponent(queryText.trim());

  return {
    amazon: `https://www.amazon.in/s?k=${query}`,
    bigbasket: `https://www.bigbasket.com/ps/?q=${query}`,
    blinkit: `https://blinkit.com/s/?q=${query}`,
    flipkart: `https://www.flipkart.com/search?q=${query}`,
    instamart: `https://www.swiggy.com/instamart/search?query=${query}`,
    jiomart: `https://www.jiomart.com/search/${query}`,
    zepto: `https://www.zeptonow.com/search?query=${query}`,
  };
}

export function buildPlatformLinks(
  platformSkus: Array<{ platform: string; platformProductUrl: string | null }>
) {
  return platformSkus.reduce<Partial<Record<BackendPlatformKey, string>>>((links, sku) => {
    const key = sku.platform as BackendPlatformKey;
    if (sku.platformProductUrl) {
      links[key] = sku.platformProductUrl;
    }
    return links;
  }, {});
}

export function buildPlatformDeepLink(platform: string) {
  switch (platform) {
    case 'bigbasket':
      return 'bigbasket://';
    case 'jiomart':
      return 'jiomart://';
    default:
      return undefined;
  }
}
