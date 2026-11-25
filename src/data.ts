import type { BiomeDef, Category, CategoryConfig, Difficulty } from './types.ts';

/** バイオームおよび代表的な植物のデータ定義 */
export const BIOME_DATA: readonly BiomeDef[] = [
    {
        id: 'b1',
        biomeName: '熱帯・亜熱帯多雨林',
        biomeEmoji: '🌴',
        color: '#166534',
        bg: '#DCFCE7',
        hint: '一年中暑くて、雨がたくさん降る地域',
        targets: [{ x: 88, y: 15 }, { x: 86, y: 30 }],
        base: [{ name: 'マングローブ', emoji: '🌳', color: '#166534', bg: '#DCFCE7' }],
        oni: [
            { name: 'マングローブ', emoji: '🌳', color: '#166534', bg: '#DCFCE7' },
            { name: 'ソテツ', emoji: '🌴', color: '#15803D', bg: '#DCFCE7' },
            { name: 'ビロウ', emoji: '🌴', color: '#166534', bg: '#DCFCE7' }
        ]
    },
    {
        id: 'b2',
        biomeName: '雨緑樹林',
        biomeEmoji: '🌳',
        color: '#65A30D',
        bg: '#ECFCCB',
        hint: '雨季と乾季がはっきりしている熱帯',
        targets: [{ x: 86, y: 46 }],
        base: [{ name: 'チーク', emoji: '🌳', color: '#65A30D', bg: '#ECFCCB' }],
        oni: [{ name: 'チーク', emoji: '🌳', color: '#65A30D', bg: '#ECFCCB' }]
    },
    {
        id: 'b3',
        biomeName: '照葉樹林',
        biomeEmoji: '🍃',
        color: '#15803D',
        bg: '#DCFCE7',
        hint: '冬が比較的暖かい温帯（葉がテカテカ）',
        targets: [{ x: 70, y: 45 }],
        base: [{ name: 'シイ・カシ', emoji: '🌳', color: '#15803D', bg: '#DCFCE7' }],
        oni: [
            { name: 'シイ・カシ', emoji: '🌳', color: '#15803D', bg: '#DCFCE7' },
            { name: 'クスノキ', emoji: '🌳', color: '#166534', bg: '#DCFCE7' }
        ]
    },
    {
        id: 'b4',
        biomeName: '夏緑樹林',
        biomeEmoji: '🍁',
        color: '#D97706',
        bg: '#FEF3C7',
        hint: '冬の寒さが厳しい温帯（秋に落葉する）',
        targets: [{ x: 55, y: 55 }],
        base: [{ name: 'ブナ・ミズナラ', emoji: '🌳', color: '#D97706', bg: '#FEF3C7' }],
        oni: [
            { name: 'ブナ・ミズナラ', emoji: '🌳', color: '#D97706', bg: '#FEF3C7' },
            { name: 'カエデ', emoji: '🍁', color: '#B45309', bg: '#FEF3C7' },
            { name: 'ケヤキ', emoji: '🌳', color: '#D97706', bg: '#FEF3C7' }
        ]
    },
    {
        id: 'b5',
        biomeName: '硬葉樹林',
        biomeEmoji: '🫒',
        color: '#4D7C0F',
        bg: '#ECFCCB',
        hint: '夏に乾燥し、冬に雨が降る温帯',
        targets: [{ x: 62, y: 63 }],
        base: [{ name: 'オリーブ', emoji: '🌳', color: '#4D7C0F', bg: '#ECFCCB' }],
        oni: [
            { name: 'オリーブ', emoji: '🌳', color: '#4D7C0F', bg: '#ECFCCB' },
            { name: 'コルクガシ', emoji: '🌳', color: '#4D7C0F', bg: '#ECFCCB' }
        ]
    },
    {
        id: 'b6',
        biomeName: '針葉樹林',
        biomeEmoji: '🌲',
        color: '#0F766E',
        bg: '#CCFBF1',
        hint: '冬が長くてとても寒い亜寒帯',
        targets: [{ x: 42, y: 68 }],
        base: [{ name: 'エゾマツ', emoji: '🌲', color: '#0F766E', bg: '#CCFBF1' }],
        oni: [{ name: 'エゾマツ', emoji: '🌲', color: '#0F766E', bg: '#CCFBF1' }]
    },
    {
        id: 'b7',
        biomeName: 'サバンナ',
        biomeEmoji: '🦒',
        color: '#CA8A04',
        bg: '#FEF08A',
        hint: '熱帯の乾燥地域（まばらな木と長い草）',
        targets: [{ x: 86, y: 68 }],
        base: [{ name: 'アカシア', emoji: '🌳', color: '#CA8A04', bg: '#FEF08A' }],
        oni: [{ name: 'アカシア', emoji: '🌳', color: '#CA8A04', bg: '#FEF08A' }]
    },
    {
        id: 'b8',
        biomeName: 'ステップ',
        biomeEmoji: '🌾',
        color: '#A16207',
        bg: '#FEF9C3',
        hint: '温帯の乾燥地域（木が育たない短い草）',
        targets: [{ x: 68, y: 75 }],
        base: [{ name: 'イネ科植物', emoji: '🌾', color: '#A16207', bg: '#FEF9C3' }],
        oni: [{ name: 'イネ科植物', emoji: '🌾', color: '#A16207', bg: '#FEF9C3' }]
    },
    {
        id: 'b9',
        biomeName: '砂漠',
        biomeEmoji: '🏜️',
        color: '#C2410C',
        bg: '#FFEDD5',
        hint: '極端に雨が少なく、乾燥に強い植物の地域',
        targets: [
            { x: 92, y: 81, rx: 10, ry: 8 },
            { x: 76, y: 82, rx: 12, ry: 5 },
            { x: 56, y: 82, rx: 12, ry: 5 },
            { x: 40, y: 82, rx: 8, ry: 5 }
        ],
        base: [{ name: 'サボテン', emoji: '🌵', color: '#C2410C', bg: '#FFEDD5' }],
        oni: [{ name: 'サボテン', emoji: '🌵', color: '#C2410C', bg: '#FFEDD5' }]
    },
    {
        id: 'b10',
        biomeName: 'ツンドラ',
        biomeEmoji: '❄️',
        color: '#0369A1',
        bg: '#E0F2FE',
        hint: '一年中寒く、夏だけ表面の氷が溶ける寒帯',
        targets: [{ x: 25, y: 80 }],
        base: [{ name: '地衣類', emoji: '🌱', color: '#0369A1', bg: '#E0F2FE' }],
        oni: [
            { name: '地衣類', emoji: '🌱', color: '#0369A1', bg: '#E0F2FE' },
            { name: 'コケ植物', emoji: '🌿', color: '#0284C7', bg: '#E0F2FE' }
        ]
    }
];

/** 学習カテゴリごとの表示設定 */
export const CATEGORY_CONFIG: Readonly<Record<Category, CategoryConfig>> = {
    plant: {
        label: '🌱 植物名',
        trayTitle: '🌱 植物リスト',
        description: '植物カードを選んで、グラフ上の正しい「気温・降水量」の位置に配置しよう！',
        oniRule: '<b>おに</b>：60秒タイムアタック（ミスで-5秒）！様々な植物が無限に出題されます',
        startToast: '✨ 植物を選んで、グラフの正しい位置をクリックしてね',
        oniToast: '👹 60秒タイムアタック開始！ミスは-5秒！'
    },
    biome: {
        label: '🗺️ バイオーム名',
        trayTitle: '🗺️ バイオームリスト',
        description: 'バイオーム名カードを選んで、グラフ上の正しい「気温・降水量」の位置を覚えよう！',
        oniRule: '<b>おに</b>：60秒タイムアタック（ミスで-5秒）！バイオーム名が無限に出題されます',
        startToast: '🗺️ バイオームを選んで、グラフの正しい位置をクリックしてね',
        oniToast: '👹 60秒タイムアタック開始！ミスは-5秒！'
    }
};

/** 難易度ごとの表示名 */
export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
    easy: '🔰 かんたん',
    normal: '🌿 ふつう',
    oni: '👹 おに (60秒TA)'
};
