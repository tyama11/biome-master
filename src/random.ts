export type Rng = () => number;

export function randomInt(maxExclusive: number, rng: Rng = Math.random): number {
    return Math.floor(rng() * maxExclusive);
}

export function pickRandom<T>(arr: readonly T[], rng: Rng = Math.random): T {
    if (arr.length === 0) {
        throw new Error('pickRandom: 空の配列からは選べません');
    }
    return arr[randomInt(arr.length, rng)] as T;
}

export function shuffleInPlace<T>(array: T[], rng: Rng = Math.random): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = randomInt(i + 1, rng);
        const tmp = array[i] as T;
        array[i] = array[j] as T;
        array[j] = tmp;
    }
    return array;
}

export function shuffled<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
    return shuffleInPlace([...arr], rng);
}
