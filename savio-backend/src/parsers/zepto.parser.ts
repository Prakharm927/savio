/**
 * Zepto structured-tree parser.
 *
 * Accepts the "latestTreeDump" JSON from SavioAccessibilityService
 * (com.zeptoconsumerapp) and extracts product cards by walking the
 * recursive accessibility node tree.
 *
 * Pure extraction — no database access, no performAction calls.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AccessibilityNode {
    depth: number;
    className: string;
    viewIdResourceName: string;
    text: string;
    contentDescription: string;
    clickable: boolean;
    editable: boolean;
    enabled: boolean;
    visibleToUser: boolean;
    selected: boolean;
    focused: boolean;
    childCount: number;
    bounds: { left: number; top: number; right: number; bottom: number };
    children?: AccessibilityNode[];
}

export interface ZeptoTreeDump {
    packageName: string;
    platform: string;
    eventType: number;
    capturedAt: number;
    maxDepth: number;
    maxNodes: number;
    visibleText: string[];
    root: AccessibilityNode;
    nodeCount: number;
    truncated: boolean;
}

export interface ZeptoProduct {
    name: string;
    quantity: string;
    price: number | null;
    mrp: number | null;
    available: boolean;
    stockStatus: string;
    confidence: 'high' | 'medium' | 'low';
    addButtonViewId: string | null;
    rawContentDescription: string;
}

export interface ZeptoParseResult {
    platform: 'zepto';
    packageName: string;
    capturedAt: number;
    products: ZeptoProduct[];
    warnings: string[];
}

// ─── Selectors (grounded in zepto-first-milk-dump.json) ──────────────────────

const EXPECTED_PACKAGE  = 'com.zeptoconsumerapp';
const CONTAINER_PREFIX  = 'com.zeptoconsumerapp:id/product-card-container';
const ADD_BUTTON_PREFIX = 'com.zeptoconsumerapp:id/product-card-add-button';

// Matches standalone price text. The rupee symbol is garbled as "Γé╣ΓÇè"
// (₹ U+20B9 re-encoded through CP437 in the SharedPrefs dump). The regex
// anchors on the numeric value and tolerates any non-digit prefix.
const PRICE_TEXT_RE = /^[^\d]*(\d+(?:\.\d+)?)$/;

// Matches quantity labels: "1 pack (200 ml)", "1 pc (500 ml)", "500 g", etc.
const QUANTITY_TEXT_RE =
    /^\d+(?:\.\d+)?\s+(?:pack|pc|pcs|kg|g|ml|L|litre|liter|sachet|bottle|pouch)\b/i;

// Texts inside the add-button subtree — never product data
const BUTTON_TEXTS = new Set(['ADD', 'Add to Cart', 'add']);
const VARIANT_BADGE_RE = /^\d+\s+options?$/i;

// ─── Tree utilities ──────────────────────────────────────────────────────────

function walkTree(
    node: AccessibilityNode,
    visitor: (n: AccessibilityNode) => void,
): void {
    visitor(node);
    for (const child of node.children ?? []) {
        walkTree(child, visitor);
    }
}

function findFirstDescendant(
    node: AccessibilityNode,
    predicate: (n: AccessibilityNode) => boolean,
): AccessibilityNode | null {
    for (const child of node.children ?? []) {
        if (predicate(child)) return child;
        const hit = findFirstDescendant(child, predicate);
        if (hit) return hit;
    }
    return null;
}

// ─── Per-card helpers ─────────────────────────────────────────────────────────

/**
 * Parse contentDescription using right-side splitting.
 *
 * Format A (price present):  "<name>, <quantity>, ₹<price>"
 * Format B (price absent):   "<name>, <quantity>"
 *
 * Returns null when the string doesn't match either format, so the caller
 * falls back to scanChildTextViews.
 */
function parseContentDescription(cd: string): {
    name: string;
    quantity: string;
    price: number | null;
} | null {
    if (!cd) return null;

    const parts = cd.split(', ');
    if (parts.length < 2) return null;

    let cursor = parts.length - 1;
    let price: number | null = null;

    // Rightmost segment — price token?
    const priceMatch = PRICE_TEXT_RE.exec(parts[cursor]);
    if (priceMatch) {
        price = parseFloat(priceMatch[1]);
        cursor -= 1;
    }

    if (cursor < 1) return null; // need at least name + quantity

    // Next segment from right — must be quantity
    const maybeQty = parts[cursor];
    if (!QUANTITY_TEXT_RE.test(maybeQty)) return null;

    const quantity = maybeQty;
    const name = parts.slice(0, cursor).join(', ').trim();
    if (!name) return null;

    return { name, quantity, price };
}

/**
 * Scan direct android.widget.TextView children of a container for
 * price, quantity, and name using semantic patterns — not fixed indices.
 * Resilient to card layout changes as long as the TextViews are direct
 * children of the container node.
 */
function scanChildTextViews(container: AccessibilityNode): {
    price: number | null;
    quantity: string;
    name: string;
} {
    const textViews = (container.children ?? []).filter(
        (c) => c.className === 'android.widget.TextView',
    );

    let price: number | null = null;
    let quantity = '';
    let name = '';

    for (const tv of textViews) {
        const t = tv.text;
        if (!t) continue;
        if (BUTTON_TEXTS.has(t)) continue;      // safety — grandchildren won't appear here
        if (VARIANT_BADGE_RE.test(t)) continue; // e.g. "2 options"

        if (price === null) {
            const pm = PRICE_TEXT_RE.exec(t);
            if (pm) {
                price = parseFloat(pm[1]);
                continue;
            }
        }

        if (!quantity && QUANTITY_TEXT_RE.test(t)) {
            quantity = t;
            continue;
        }

        if (t.length > name.length) name = t; // longest remaining = product name
    }

    return { price, quantity, name };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function parseZeptoTree(dump: ZeptoTreeDump): ZeptoParseResult {
    const warnings: string[] = [];

    if (dump.packageName !== EXPECTED_PACKAGE) {
        warnings.push(
            `Unexpected packageName: "${dump.packageName}" — expected "${EXPECTED_PACKAGE}"`,
        );
    }

    const containers: AccessibilityNode[] = [];
    walkTree(dump.root, (node) => {
        if (node.viewIdResourceName.startsWith(CONTAINER_PREFIX)) {
            containers.push(node);
        }
    });

    const products: ZeptoProduct[] = [];

    for (const container of containers) {
        const cd = container.contentDescription ?? '';
        const fromCd = parseContentDescription(cd);

        let name     = fromCd?.name     ?? '';
        let quantity = fromCd?.quantity ?? '';
        let price    = fromCd?.price    ?? null;

        // Fall back to child-node scanning for any field not resolved from CD
        if (price === null || !quantity || !name) {
            const fromChildren = scanChildTextViews(container);
            if (price === null) price    = fromChildren.price;
            if (!quantity)      quantity = fromChildren.quantity;
            if (!name)          name     = fromChildren.name;
        }

        const addButton = findFirstDescendant(
            container,
            (n) => n.viewIdResourceName.startsWith(ADD_BUTTON_PREFIX),
        );

        const addButtonViewId = addButton?.viewIdResourceName ?? null;

        let available   = true;
        let stockStatus = 'in_stock';
        if (!addButton) {
            available   = false;
            stockStatus = 'out_of_stock';
        } else if (
            /notify|out[\s_-]?of[\s_-]?stock|unavailable/i.test(
                addButton.contentDescription ?? '',
            )
        ) {
            available   = false;
            stockStatus = 'out_of_stock';
        }

        // high   = name + price both resolved from contentDescription
        // medium = price required child-node fallback (FORMAT B contentDescription)
        // low    = neither source produced a price
        const confidence: ZeptoProduct['confidence'] =
            fromCd?.price != null ? 'high'
            : price !== null      ? 'medium'
            :                       'low';

        if (!name) {
            warnings.push(
                `Skipped container ${container.viewIdResourceName}: no product name resolved`,
            );
            continue;
        }

        products.push({
            name,
            quantity,
            price,
            mrp: null,
            available,
            stockStatus,
            confidence,
            addButtonViewId,
            rawContentDescription: cd,
        });
    }

    return {
        platform: 'zepto',
        packageName: dump.packageName,
        capturedAt: dump.capturedAt,
        products,
        warnings,
    };
}
