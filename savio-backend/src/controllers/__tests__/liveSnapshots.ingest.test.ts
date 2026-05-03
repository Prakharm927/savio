/**
 * Unit tests for the treeDump parsing path used by ingestZeptoSnapshot.
 * Tests the parser directly — no DB, no HTTP.
 * Run: npm run test:ingest
 */

import assert from 'assert';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseZeptoTree, ZeptoTreeDump } from '../../parsers/zepto.parser';

function emptyDump(overrides: Partial<ZeptoTreeDump> = {}): ZeptoTreeDump {
    return {
        packageName: 'com.zeptoconsumerapp',
        platform: 'zepto',
        eventType: 0,
        capturedAt: Date.now(),
        maxDepth: 1,
        maxNodes: 1,
        visibleText: [],
        root: {
            depth: 0,
            className: 'android.widget.FrameLayout',
            viewIdResourceName: '',
            text: '',
            contentDescription: '',
            clickable: false,
            editable: false,
            enabled: true,
            visibleToUser: true,
            selected: false,
            focused: false,
            childCount: 0,
            bounds: { left: 0, top: 0, right: 1080, bottom: 2400 },
            children: [],
        },
        nodeCount: 1,
        truncated: false,
        ...overrides,
    };
}

// ── 1. Malformed input (null root) ────────────────────────────────────────────
{
    const result = parseZeptoTree({ ...emptyDump(), root: null as any });
    assert.strictEqual(result.products.length, 0, 'null root → 0 products');
    assert.ok(result.warnings.some((w) => w.includes('root is null')), 'null root → warning');
    console.log('✅  1. null root guard');
}

// ── 2. Empty tree (root with no children) ────────────────────────────────────
{
    const result = parseZeptoTree(emptyDump());
    assert.strictEqual(result.products.length, 0, 'empty tree → 0 products');
    console.log('✅  2. empty tree → 0 products');
}

// ── 3. Package name mismatch → warning emitted ────────────────────────────────
{
    const result = parseZeptoTree(emptyDump({ packageName: 'com.example.other' }));
    assert.ok(
        result.warnings.some((w) => w.includes('com.example.other')),
        'wrong packageName → warning',
    );
    console.log('✅  3. package mismatch → warning emitted');
}

// ── 4. No containers → 0 products ─────────────────────────────────────────────
{
    const result = parseZeptoTree(emptyDump());
    assert.strictEqual(result.products.length, 0, 'no containers → 0 products');
    console.log('✅  4. no product-card-containers → 0 products');
}

// ── 5. Duplicate submission → idempotent parser output ────────────────────────
{
    const DUMP_PATH = join(
        __dirname, '..', '..', '..', '..', 'savio', 'debug-dumps', 'zepto-first-milk-dump.json',
    );
    let raw: Buffer | null = null;
    try { raw = readFileSync(DUMP_PATH); } catch { /* skip */ }

    if (raw) {
        const dump = JSON.parse(raw.toString()) as ZeptoTreeDump;
        const r1 = parseZeptoTree(dump);
        const r2 = parseZeptoTree(dump);
        assert.strictEqual(r1.products.length, r2.products.length, 'idempotent count');
        assert.deepStrictEqual(
            r1.products.map((p) => p.name),
            r2.products.map((p) => p.name),
            'idempotent names',
        );
        console.log('✅  5. duplicate submission → idempotent parser output');
    } else {
        console.log('⏭   5. skipped (dump not available at expected path)');
    }
}

console.log('\n✅  All ingest unit tests passed');
