/**
 * Seed script for ParserConfig table.
 *
 * Creates an initial v1 inactive config for each platform with the
 * base structure { selectors: {}, patterns: {}, ignore: [] }.
 *
 * Idempotent — skips platforms that already have a v1 config.
 *
 * Usage:
 *   npx tsx prisma/seedParserConfigs.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLATFORMS = [
    'zepto',
    'blinkit',
    'instamart',
    'bigbasket',
    'jiomart',
    'amazon',
    'flipkart',
] as const;

const BASE_CONFIG = {
    selectors: {},
    patterns: {},
    ignore: [],
};

async function seedParserConfigs() {
    console.log('🌱 Seeding parser configs...\n');

    for (const platform of PLATFORMS) {
        // Check if v1 already exists
        const existing = await prisma.parserConfig.findUnique({
            where: {
                platform_version: {
                    platform,
                    version: 1,
                },
            },
        });

        if (existing) {
            console.log(`  ⏭️  ${platform} v1 already exists — skipping`);
            continue;
        }

        await prisma.parserConfig.create({
            data: {
                platform,
                version: 1,
                config: BASE_CONFIG,
                notes: 'Initial empty config — fill in after analysing real tree dumps',
                isActive: false,
            },
        });

        console.log(`  ✅ ${platform} v1 created (inactive)`);
    }

    console.log('\n✅ Parser config seeding complete.');
}

seedParserConfigs()
    .catch((error) => {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
