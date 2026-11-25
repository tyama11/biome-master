export type Category = 'biome' | 'plant';
export type Difficulty = 'easy' | 'normal' | 'oni';
export type BiomeId = 'b1' | 'b2' | 'b3' | 'b4' | 'b5' | 'b6' | 'b7' | 'b8' | 'b9' | 'b10';

export interface TargetPoint {
    readonly x: number;
    readonly y: number;
    readonly rx?: number;
    readonly ry?: number;
}

export interface PlantDef {
    readonly name: string;
    readonly emoji: string;
    readonly color: string;
    readonly bg: string;
}

export interface BiomeDef {
    readonly id: BiomeId;
    readonly biomeName: string;
    readonly biomeEmoji: string;
    readonly color: string;
    readonly bg: string;
    readonly hint: string;
    readonly targets: readonly TargetPoint[];
    readonly base: readonly PlantDef[];
    readonly oni: readonly PlantDef[];
}

export interface CategoryConfig {
    readonly label: string;
    readonly trayTitle: string;
    readonly description: string;
    readonly oniRule: string;
    readonly startToast: string;
    readonly oniToast: string;
}

export interface BiomeCard {
    readonly id: string;
    readonly biomeId: BiomeId;
    readonly name: string;
    readonly emoji: string;
    readonly color: string;
    readonly bg: string;
    readonly hint: string;
    readonly targets: readonly TargetPoint[];
}
