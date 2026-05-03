/**
 * Fixture test for the Zepto structured-tree parser.
 *
 * Input:  savio/debug-dumps/zepto-first-milk-dump.json
 *         (milk search, com.zeptoconsumerapp)
 *
 * Run:    npm run test:parser
 */

import assert from 'assert';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseZeptoTree, ZeptoTreeDump } from '../zepto.parser';

// Path: savio-backend/src/parsers/__tests__/ → up 4 → Savio/ → savio/debug-dumps/
const DUMP_PATH = join(
    __dirname,
    '..', '..', '..', '..',
    'savio', 'debug-dumps', 'zepto-first-milk-dump.json',
);

let raw: Buffer;
try {
    raw = readFileSync(DUMP_PATH);
} catch {
    console.error(`SKIP: dump not found at ${DUMP_PATH}`);
    console.error('Run node scripts/extract-tree-dump.js in the savio project first.');
    process.exit(0);
}

const dump = JSON.parse(raw.toString()) as ZeptoTreeDump;
const result = parseZeptoTree(dump);

// ── Metadata ──────────────────────────────────────────────────────────────────
assert.strictEqual(result.platform, 'zepto');
assert.strictEqual(result.packageName, 'com.zeptoconsumerapp');
assert.ok(result.capturedAt > 0, 'capturedAt must be a positive timestamp');

// ── Product count ─────────────────────────────────────────────────────────────
assert.strictEqual(
    result.products.length,
    9,
    `Expected 9 products, got ${result.products.length}: ${JSON.stringify(result.products.map((p) => p.name))}`,
);

// ── No false positives ────────────────────────────────────────────────────────
const names = result.products.map((p) => p.name);
const FORBIDDEN = [
    'High Protein', '2 options', 'Shop for', 'ADD',
    'Organic', 'A2 Milk', '1 pack (200 ml)',
];
for (const bad of FORBIDDEN) {
    const hit = names.find((n) => n.toLowerCase() === bad.toLowerCase());
    assert.ok(!hit, `False positive: product named "${bad}" must not appear`);
}

// ── Expected brand substrings present ────────────────────────────────────────
const EXPECTED_BRANDS = [
    'Amul Taaza', 'Nandini Goodlife', "Sid's Farm", 'Amul Lactose Free', 'Amul Gold',
];
for (const sub of EXPECTED_BRANDS) {
    assert.ok(
        names.some((n) => n.includes(sub)),
        `Expected a product containing "${sub}". Got: ${JSON.stringify(names)}`,
    );
}

// ── All products have a positive price ───────────────────────────────────────
for (const p of result.products) {
    assert.ok(
        p.price !== null && p.price > 0,
        `"${p.name}" must have price > 0, got ${p.price}`,
    );
}

// ── All products have a non-empty quantity ────────────────────────────────────
for (const p of result.products) {
    assert.ok(p.quantity.length > 0, `"${p.name}" must have a quantity string`);
}

// ── All products have a valid add-button viewId ───────────────────────────────
for (const p of result.products) {
    assert.ok(
        p.addButtonViewId?.startsWith('com.zeptoconsumerapp:id/product-card-add-button'),
        `"${p.name}" addButtonViewId: ${p.addButtonViewId}`,
    );
}

// ── Confidence: ≥6 high (cards 1–6 have price in contentDescription) ─────────
const highCount = result.products.filter((p) => p.confidence === 'high').length;
assert.ok(highCount >= 6, `Expected ≥6 high-confidence products, got ${highCount}`);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('✅  All assertions passed');
console.log(`    Products (${result.products.length}):`);
result.products.forEach((p) =>
    console.log(`    - ${p.name} | ${p.quantity} | ₹${p.price} | ${p.confidence}`),
);
if (result.warnings.length) console.log('    Warnings:', result.warnings);
