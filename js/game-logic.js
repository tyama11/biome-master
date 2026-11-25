import { BIOME_DATA } from './data.js';
import { pickRandom, shuffled,          } from './random.js';
                                                                                         

export const TOTAL_QUESTIONS = BIOME_DATA.length;
export const ONI_TIME_LIMIT = 60;
export const ONI_PENALTY_SECONDS = 5;
export const ONI_TRAY_SIZE = 3;
export const DEFAULT_HIT_TOLERANCE = 12;

export function createItemFromBiome(
    biome          ,
    category          ,
    difficulty            ,
    uid        ,
    rng      = Math.random
)            {
    const id = `item-${uid}`;
    if (category === 'biome') {
        return {
            id,
            biomeId: biome.id,
            name: biome.biomeName,
            emoji: biome.biomeEmoji,
            color: biome.color,
            bg: biome.bg,
            hint: biome.hint,
            targets: biome.targets
        };
    }

    const plantList = difficulty === 'oni' ? biome.oni : biome.base;
    const plantDef = pickRandom(plantList, rng);
    return {
        id,
        biomeId: biome.id,
        name: plantDef.name,
        emoji: plantDef.emoji,
        color: plantDef.color,
        bg: plantDef.bg,
        hint: biome.hint,
        targets: biome.targets
    };
}

export function buildStandardItems(
    category          ,
    difficulty            ,
    startUid = 0,
    rng      = Math.random
)                                          {
    let uid = startUid;
    const items = BIOME_DATA.map((biome) =>
        createItemFromBiome(biome, category, difficulty, uid++, rng)
    );
    return { items, nextUid: uid };
}

export function buildInitialOniItems(
    category          ,
    startUid = 0,
    rng      = Math.random
)                                          {
    let uid = startUid;
    const pool = shuffled(BIOME_DATA, rng);
    const items = pool.slice(0, ONI_TRAY_SIZE).map((biome) =>
        createItemFromBiome(biome, category, 'oni', uid++, rng)
    );
    return { items, nextUid: uid };
}

export function pickNextOniItem(
    activeItems                      ,
    category          ,
    uid        ,
    rng      = Math.random
)            {
    const activeBiomeIds = new Set(activeItems.map((item) => item.biomeId));
    const candidates = BIOME_DATA.filter((biome) => !activeBiomeIds.has(biome.id));
    const source = candidates.length > 0 ? candidates : BIOME_DATA;
    const chosen = pickRandom(source, rng);
    return createItemFromBiome(chosen, category, 'oni', uid, rng);
}

export function findMatchingTarget(
    targets                        ,
    px        ,
    py        ,
    defaultTolerance = DEFAULT_HIT_TOLERANCE
)                          {
    return targets.find((target) => {
        const rx = target.rx ?? defaultTolerance;
        const ry = target.ry ?? defaultTolerance;
        return Math.abs(px - target.x) < rx && Math.abs(py - target.y) < ry;
    });
}

export function computeRemainingSeconds(endTimeMs        , nowMs        )         {
    return Math.ceil(Math.max(0, endTimeMs - nowMs) / 1000);
}


//# sourceURL=game-logic.ts