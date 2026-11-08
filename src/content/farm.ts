import type { CoreIslandKind, DecorKind, ItemId, PetKind, QuestionType } from "@/game/types";

/**
 * 農場的圖鑑與價格。全部是資料：改數字不用動程式。
 * 設計依據：docs/reward-design.md（獎勵機制設計書）。
 */

export const ITEM_META: Record<
  ItemId,
  { name: string; emoji: string; source: string; island: CoreIslandKind | null }
> = {
  coin: { name: "金幣", emoji: "🪙", source: "每次挑戰都有", island: null },
  grain: { name: "穀物", emoji: "🌾", source: "單字島：選擇、聽力、配對", island: "vocab" },
  veg: { name: "蔬菜", emoji: "🥕", source: "單字島：拼字", island: "vocab" },
  wood: { name: "木材", emoji: "🪵", source: "文法島：選擇、聽力、配對", island: "grammar" },
  brick: { name: "磚塊", emoji: "🧱", source: "文法島：句子重組", island: "grammar" },
  page: { name: "故事頁", emoji: "📖", source: "閱讀島：是非、選擇、聽力", island: "reading" },
  key: { name: "鑰匙", emoji: "🗝️", source: "閱讀島：配對", island: "reading" },
};

export const ITEM_IDS: ItemId[] = ["coin", "grain", "veg", "wood", "brick", "page", "key"];

/** 每座島兩種材料：常見與稀有，稀有只有最難的題型掉。 */
export function dropFor(island: CoreIslandKind, type: QuestionType): ItemId {
  switch (island) {
    case "vocab":
      return type === "spell" ? "veg" : "grain";
    case "grammar":
      return type === "order" ? "brick" : "wood";
    case "reading":
      return type === "match" ? "key" : "page";
  }
}

export const RARE_ITEM: Record<CoreIslandKind, ItemId> = {
  vocab: "veg",
  grammar: "brick",
  reading: "key",
};
export const COMMON_ITEM: Record<CoreIslandKind, ItemId> = {
  vocab: "grain",
  grammar: "wood",
  reading: "page",
};

export const PET_KINDS: PetKind[] = [
  {
    id: "chicken",
    name: "小雞",
    emoji: "🐔",
    tier: "common",
    favorite: "grain",
    price: { coin: 20, page: 10 },
  },
  {
    id: "rabbit",
    name: "兔子",
    emoji: "🐰",
    tier: "common",
    favorite: "veg",
    price: { coin: 20, page: 10 },
  },
  {
    id: "hamster",
    name: "倉鼠",
    emoji: "🐹",
    tier: "common",
    favorite: "grain",
    price: { coin: 20, page: 10 },
  },
  {
    id: "turtle",
    name: "烏龜",
    emoji: "🐢",
    tier: "common",
    favorite: "veg",
    price: { coin: 20, page: 10 },
  },
  {
    id: "sheep",
    name: "綿羊",
    emoji: "🐑",
    tier: "advanced",
    favorite: "veg",
    price: { coin: 40, page: 20, key: 1 },
  },
  {
    id: "pig",
    name: "小豬",
    emoji: "🐷",
    tier: "advanced",
    favorite: "grain",
    price: { coin: 40, page: 20, key: 1 },
  },
  {
    id: "cat",
    name: "貓咪",
    emoji: "🐱",
    tier: "advanced",
    favorite: "grain",
    price: { coin: 40, page: 20, key: 1 },
  },
  {
    id: "dog",
    name: "小狗",
    emoji: "🐶",
    tier: "advanced",
    favorite: "veg",
    price: { coin: 40, page: 20, key: 1 },
  },
  {
    id: "duck",
    name: "鴨子",
    emoji: "🦆",
    tier: "rare",
    favorite: "grain",
    price: { coin: 60, page: 30, key: 3 },
    requiresDecor: "pond",
  },
  {
    id: "cow",
    name: "乳牛",
    emoji: "🐮",
    tier: "rare",
    favorite: "veg",
    price: { coin: 60, page: 30, key: 3 },
    requiresDecor: "fence",
  },
  {
    id: "parrot",
    name: "鸚鵡",
    emoji: "🦜",
    tier: "rare",
    favorite: "grain",
    price: { coin: 60, page: 30, key: 3 },
    requiresDecor: "tree",
  },
  {
    id: "horse",
    name: "小馬",
    emoji: "🐴",
    tier: "rare",
    favorite: "veg",
    price: { coin: 60, page: 30, key: 3 },
    requiresDecor: "stable",
  },
  {
    id: "unicorn",
    name: "獨角獸",
    emoji: "🦄",
    tier: "legend",
    favorite: "veg",
    achievement: "unit_lit",
  },
  {
    id: "dragon",
    name: "小龍",
    emoji: "🐉",
    tier: "legend",
    favorite: "grain",
    achievement: "review_cleared_5",
  },
  {
    id: "panda",
    name: "熊貓",
    emoji: "🐼",
    tier: "legend",
    favorite: "veg",
    achievement: "streak_7",
  },
];

export const DECOR_KINDS: DecorKind[] = [
  { id: "flag", name: "小旗子", emoji: "🚩", price: { wood: 5 }, buyable: true },
  { id: "fence", name: "柵欄", emoji: "🪵", price: { wood: 10 }, buyable: true, unlocksPet: "cow" },
  { id: "flowers", name: "花圃", emoji: "🌻", price: { wood: 8, brick: 4 }, buyable: true },
  { id: "path", name: "石頭小徑", emoji: "🪨", price: { brick: 6 }, buyable: true },
  {
    id: "tree",
    name: "大樹",
    emoji: "🌳",
    price: { wood: 15 },
    buyable: true,
    unlocksPet: "parrot",
  },
  { id: "scarecrow", name: "稻草人", emoji: "🎃", price: { wood: 12, brick: 6 }, buyable: true },
  {
    id: "bell",
    name: "小鐘",
    emoji: "🔔",
    price: { wood: 10, brick: 10 },
    buyable: true,
    effect: "bell",
  },
  {
    id: "pond",
    name: "水池",
    emoji: "💧",
    price: { wood: 20, brick: 10 },
    buyable: true,
    unlocksPet: "duck",
  },
  { id: "slide", name: "溜滑梯", emoji: "🛝", price: { wood: 18, brick: 8 }, buyable: true },
  {
    id: "stable",
    name: "馬廄",
    emoji: "🏚️",
    price: { wood: 30, brick: 20 },
    buyable: true,
    unlocksPet: "horse",
  },
  {
    id: "barn-upgrade",
    name: "小屋擴建",
    emoji: "🏠",
    price: { wood: 25, brick: 25 },
    buyable: true,
    effect: "barn_plus_3",
    maxCount: 2,
  },
  { id: "windmill", name: "風車", emoji: "🎡", price: { wood: 40, brick: 25 }, buyable: true },
  {
    id: "land",
    name: "第二圈土地",
    emoji: "🗺️",
    price: { coin: 80, wood: 60, brick: 40 },
    buyable: true,
    effect: "land",
    maxCount: 1,
    requiresUnitComplete: true,
  },
  { id: "trophy", name: "獎盃庭園", emoji: "🏆", price: {}, buyable: false, effect: "trophy" },
];

export const TIER_LABELS: Record<PetKind["tier"], string> = {
  common: "常見",
  advanced: "進階",
  rare: "稀有",
  legend: "傳說",
};

export const ACHIEVEMENT_LABELS: Record<NonNullable<PetKind["achievement"]>, string> = {
  unit_lit: "一個單元三座島全亮",
  review_cleared_5: "錯題袋清空 5 次",
  streak_7: "連續 7 天都有挑戰",
};

export function getPetKind(id: string): PetKind | undefined {
  return PET_KINDS.find((p) => p.id === id);
}

export function getDecorKind(id: string): DecorKind | undefined {
  return DECOR_KINDS.find((d) => d.id === id);
}

export const STARTER_PET = "chicken";
