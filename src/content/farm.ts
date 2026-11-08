import type {
  CoreIslandKind,
  DecorKind,
  ItemId,
  PetKind,
  QuestionType,
  ThemeKind,
  WeatherKind,
} from "@/game/types";

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
  // ---------- 主題寵物：完成對應單元才開放 ----------
  {
    id: "bat",
    name: "小蝙蝠",
    emoji: "🦇",
    tier: "advanced",
    favorite: "veg",
    price: { coin: 40, page: 20, key: 1 },
    theme: "halloween",
  },
  {
    id: "black-cat",
    name: "黑貓",
    emoji: "🐈‍⬛",
    tier: "advanced",
    favorite: "grain",
    price: { coin: 40, page: 20, key: 1 },
    theme: "halloween",
  },
  {
    id: "ghost",
    name: "小幽靈",
    emoji: "👻",
    tier: "rare",
    favorite: "veg",
    price: { coin: 60, page: 30, key: 3 },
    theme: "halloween",
  },
  {
    id: "penguin",
    name: "企鵝",
    emoji: "🐧",
    tier: "advanced",
    favorite: "grain",
    price: { coin: 40, page: 20, key: 1 },
    theme: "christmas",
  },
  {
    id: "reindeer",
    name: "麋鹿",
    emoji: "🦌",
    tier: "advanced",
    favorite: "veg",
    price: { coin: 40, page: 20, key: 1 },
    theme: "christmas",
  },
  {
    id: "polar-bear",
    name: "北極熊",
    emoji: "🐻‍❄️",
    tier: "rare",
    favorite: "grain",
    price: { coin: 60, page: 30, key: 3 },
    theme: "christmas",
  },
];

/**
 * 主題：每完成一個單元開放一組。新單元想要新主題，就在這裡加一筆，
 * 再把寵物、裝飾、植物標上同一個 theme。
 */
export const THEMES: ThemeKind[] = [
  { id: "halloween", name: "萬聖節", emoji: "🎃", unlockUnit: "u03" },
  { id: "christmas", name: "聖誕節", emoji: "🎄", unlockUnit: "u04" },
];

export function getTheme(id: string): ThemeKind | undefined {
  return THEMES.find((t) => t.id === id);
}

/** 天氣：晴天一開始就有，其他買一次之後隨時切換。整個群島都會一起變。 */
export const WEATHER_KINDS: WeatherKind[] = [
  { id: "sunny", name: "晴天", emoji: "☀️", price: {} },
  { id: "rain", name: "下雨", emoji: "🌧️", price: { coin: 30, page: 5 } },
  { id: "snow", name: "下雪", emoji: "❄️", price: { coin: 40, page: 10 } },
  { id: "thunder", name: "打雷", emoji: "⛈️", price: { coin: 50, page: 10, key: 1 } },
];

export function getWeather(id: string): WeatherKind | undefined {
  return WEATHER_KINDS.find((w) => w.id === id);
}

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
  // ---------- 植物：種在裝飾格，用 🌾／🥕 照顧才會長大 ----------
  ...(
    [
      ["tulip", "鬱金香", "🌷", { coin: 5, grain: 3 }, undefined],
      ["sunflower", "向日葵", "🌻", { coin: 8, grain: 5 }, undefined],
      ["strawberry", "草莓", "🍓", { coin: 10, veg: 4 }, undefined],
      ["corn", "玉米", "🌽", { coin: 10, grain: 8 }, undefined],
      ["pumpkin", "南瓜", "🎃", { coin: 12, veg: 6 }, "halloween"],
      ["xmas-tree", "聖誕樹", "🎄", { coin: 15, wood: 5 }, "christmas"],
    ] as const
  ).map(([id, name, emoji, price, theme]): DecorKind => ({
    id,
    name,
    emoji,
    price,
    buyable: true,
    theme,
    plant: { stages: ["🌱", id === "xmas-tree" ? "🌲" : "🌿", emoji], sproutAt: 3, grownAt: 6 },
  })),
  // ---------- 主題裝飾 ----------
  { id: "web", name: "蜘蛛網", emoji: "🕸️", price: { wood: 8 }, buyable: true, theme: "halloween" },
  {
    id: "candy",
    name: "糖果堆",
    emoji: "🍬",
    price: { wood: 6, brick: 4 },
    buyable: true,
    theme: "halloween",
  },
  {
    id: "candle",
    name: "蠟燭",
    emoji: "🕯️",
    price: { wood: 5, brick: 5 },
    buyable: true,
    theme: "halloween",
  },
  {
    id: "snowman",
    name: "雪人",
    emoji: "⛄",
    price: { wood: 8, brick: 4 },
    buyable: true,
    theme: "christmas",
  },
  {
    id: "gifts",
    name: "禮物堆",
    emoji: "🎁",
    price: { wood: 10, brick: 6 },
    buyable: true,
    theme: "christmas",
  },
  {
    id: "sock",
    name: "聖誕襪",
    emoji: "🧦",
    price: { wood: 6 },
    buyable: true,
    theme: "christmas",
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
