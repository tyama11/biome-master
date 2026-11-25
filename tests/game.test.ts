import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BIOME_DATA, CATEGORY_CONFIG, DIFFICULTY_LABELS } from '../src/data.ts';
import {
    ONI_TRAY_SIZE,
    TOTAL_QUESTIONS,
    buildInitialOniItems,
    buildStandardItems,
    computeRemainingSeconds,
    findMatchingTarget,
    pickNextOniItem
} from '../src/game-logic.ts';
import { pickRandom, shuffled } from '../src/random.ts';
import { createMemoryStore, createProgressStore } from '../src/storage.ts';

function createSeededRng(seed = 12345): () => number {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(1664525, s) + 1013904223) >>> 0;
        return s / 0x100000000;
    };
}

describe('BIOME_DATA & config', () => {
    it('has 10 biomes with valid coordinates, hints, base and oni plants', () => {
        assert.equal(BIOME_DATA.length, 10);
        assert.equal(TOTAL_QUESTIONS, 10);
        for (const biome of BIOME_DATA) {
            assert.ok(biome.biomeName.length > 0);
            assert.ok(biome.hint.length > 0);
            assert.ok(biome.targets.length > 0);
            assert.ok(biome.base.length > 0);
            assert.ok(biome.oni.length > 0);
            for (const target of biome.targets) {
                assert.ok(target.x >= 0 && target.x <= 100);
                assert.ok(target.y >= 0 && target.y <= 100);
            }
        }
        assert.ok(CATEGORY_CONFIG.plant.label.length > 0);
        assert.ok(CATEGORY_CONFIG.biome.label.length > 0);
        assert.ok(DIFFICULTY_LABELS.oni.includes('60秒TA'));
    });
});

describe('game-logic', () => {
    it('buildStandardItems returns 10 items for plant and biome categories', () => {
        const plant = buildStandardItems('plant', 'easy', 0, createSeededRng(1));
        assert.equal(plant.items.length, 10);
        assert.equal(plant.nextUid, 10);

        const biome = buildStandardItems('biome', 'normal', 10, createSeededRng(2));
        assert.equal(biome.items.length, 10);
        assert.equal(biome.nextUid, 20);
        assert.equal(biome.items[0]?.name, '熱帯・亜熱帯多雨林');
    });

    it('buildInitialOniItems returns 3 unique biomes and pickNextOniItem avoids active biomes', () => {
        const rng = createSeededRng(77);
        const initial = buildInitialOniItems('plant', 0, rng);
        assert.equal(initial.items.length, ONI_TRAY_SIZE);
        const uniqueIds = new Set(initial.items.map((item) => item.biomeId));
        assert.equal(uniqueIds.size, ONI_TRAY_SIZE);

        const next = pickNextOniItem(initial.items, 'plant', initial.nextUid, rng);
        assert.ok(!uniqueIds.has(next.biomeId), 'next oni item should not duplicate active tray biomes');
    });

    it('findMatchingTarget handles default tolerance, multi-target biomes, and custom rx/ry', () => {
        const rainforest = BIOME_DATA.find((b) => b.id === 'b1')!;
        assert.ok(findMatchingTarget(rainforest.targets, 88, 15));
        assert.ok(findMatchingTarget(rainforest.targets, 86, 30));
        assert.equal(findMatchingTarget(rainforest.targets, 10, 10), undefined);

        const desert = BIOME_DATA.find((b) => b.id === 'b9')!;
        assert.ok(findMatchingTarget(desert.targets, 76, 82));
        assert.equal(findMatchingTarget(desert.targets, 76, 88), undefined);
    });

    it('computeRemainingSeconds clamps at 0', () => {
        assert.equal(computeRemainingSeconds(10_500, 10_000), 1);
        assert.equal(computeRemainingSeconds(9_500, 10_000), 0);
    });
});

describe('storage & random', () => {
    it('createProgressStore persists oni best scores and unlocks', () => {
        const store = createMemoryStore();
        const progress = createProgressStore(store);

        assert.equal(progress.getOniBest('biome'), null);
        assert.equal(progress.isOniUnlocked('biome'), false);

        progress.unlockOni('biome');
        progress.setOniBest('biome', 15);

        assert.equal(progress.isOniUnlocked('biome'), true);
        assert.equal(progress.getOniBest('biome'), 15);
        assert.equal(progress.isOniUnlocked('plant'), false);
    });

    it('shuffled and pickRandom are deterministic with seeded rng', () => {
        const a = shuffled([1, 2, 3, 4, 5], createSeededRng(42));
        const b = shuffled([1, 2, 3, 4, 5], createSeededRng(42));
        assert.deepEqual(a, b);
        assert.equal(pickRandom(['x'], createSeededRng(1)), 'x');
    });
});

describe('DOM & index.html integrity', () => {
    const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
    const html = readFileSync(join(rootDir, 'index.html'), 'utf8');
    const appTs = readFileSync(join(rootDir, 'src/app.ts'), 'utf8');

    it('every byId(...) referenced in src/app.ts exists in index.html', () => {
        const idMatches = [...appTs.matchAll(/byId(?:<[^>]+>)?\('([^']+)'\)/g)];
        assert.ok(idMatches.length > 10);

        for (const match of idMatches) {
            const id = match[1];
            assert.ok(id);
            assert.ok(html.includes(`id="${id}"`), `index.html is missing id="${id}"`);
        }
    });

    it('contains all 11 biome label masks and loads js/app.js as module with matching version', () => {
        const masks = html.match(/class="label-mask"/g) ?? [];
        assert.equal(masks.length, 11);

        const cssMatch = html.match(/href="css\/style\.css\?v=([^"]+)"/);
        const jsMatch = html.match(/<script type="module" src="js\/app\.js\?v=([^"]+)"><\/script>/);
        assert.ok(cssMatch?.[1]);
        assert.ok(jsMatch?.[1]);
        assert.equal(cssMatch[1], jsMatch[1]);
    });
});
