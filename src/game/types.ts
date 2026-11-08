/**
 * 英文島的資料模型。
 * 內容（單元／島／建築／題目）全部是資料，由 src/content/units/*.json 提供；
 * 進度（星星、錯題）存在 GameState，其餘狀態一律由兩者推導。
 */

// ---------- 內容 ----------

export type IslandKind = "vocab" | "grammar" | "reading";

/** 單字卡：建築卡裡可以點來聽的字或句子。 */
export interface Card {
  en: string;
  zh: string;
  /** 朗讀文字；省略時唸 en */
  say?: string;
}

interface QuestionBase {
  id: string;
  /** 題目對應的學習重點標籤，例如 "3sg-s"、"jobs"，錯題分析用 */
  tags?: string[];
  /** 答錯後顯示並朗讀的中文解說，一句 */
  explain?: string;
}

/** 選擇題：prompt 可為英文或中文；say 是要唸出來的英文（省略則唸 prompt 中的英文） */
export interface ChoiceQuestion extends QuestionBase {
  type: "choice";
  prompt: string;
  say?: string;
  options: string[];
  answer: number;
}

/** 聽力題：先唸 say，小朋友再從選項選 */
export interface ListenQuestion extends QuestionBase {
  type: "listen";
  say: string;
  prompt?: string;
  options: string[];
  answer: number;
}

/** 拼字題：看中文提示（可聽發音）用字母磚拼出英文 */
export interface SpellQuestion extends QuestionBase {
  type: "spell";
  prompt: string;
  say?: string;
  answer: string;
}

/** 配對題：左右兩欄連線 */
export interface MatchQuestion extends QuestionBase {
  type: "match";
  prompt: string;
  pairs: [string, string][];
}

/** 句子重組：把打散的字排成句子 */
export interface OrderQuestion extends QuestionBase {
  type: "order";
  prompt: string;
  tokens: string[];
  answer: string;
}

/** 是非題：通常配合建築的 passage */
export interface YesNoQuestion extends QuestionBase {
  type: "yesno";
  prompt: string;
  say?: string;
  answer: boolean;
}

export type Question =
  ChoiceQuestion | ListenQuestion | SpellQuestion | MatchQuestion | OrderQuestion | YesNoQuestion;

export type QuestionType = Question["type"];

/** 建築＝一個題組（學習重點）。 */
export interface Building {
  id: string;
  name: string;
  emoji: string;
  /** 一句話說明這棟要學什麼（中文） */
  intro: string;
  /** 教學重點，可多行；文法島主要用這個 */
  notes?: string[];
  cards?: Card[];
  /** 閱讀島的短文，一行一句，每句都可以點來聽 */
  passage?: string[];
  questions: Question[];
}

/** 島＝單元裡的一個區（單字／文法／閱讀）。 */
export interface IslandDef {
  id: string;
  kind: IslandKind;
  name: string;
  buildings: Building[];
}

/** 單元＝課本的一個 Unit，由三座島組成。 */
export interface Unit {
  id: string;
  number: number;
  title: string;
  titleZh: string;
  islands: IslandDef[];
}

/** 場景用的島：單元的島加上推導出的編號、位置與所屬單元。 */
export interface Island extends IslandDef {
  number: number;
  unitId: string;
  /** 六角格軸向座標 [q, r]，由單元順序推導 */
  axial: [number, number];
}

export type IslandId = string;

export type WalkerKind = "parent" | "partner" | "child" | "teen" | "grandparent" | "helper";

export type CarryKind =
  "heart" | "bottle" | "schoolbag" | "coin" | "letter" | "photo" | "medkit" | "seedling";

/** 協作線：單元內「單字 → 文法 → 閱讀」的連結，小人沿線搬運。 */
export interface Flow {
  id: string;
  title: string;
  description: string;
  from: IslandId[];
  to: IslandId[];
  carry: CarryKind;
  walker: WalkerKind;
  bidirectional: boolean;
}

// ---------- 進度 ----------

export type Stars = 0 | 1 | 2 | 3;

export interface BuildingProgress {
  stars: Stars;
  /** 最佳一次的答對率 0–1 */
  best: number;
  attempts: number;
}

export interface Mistake {
  questionId: string;
  buildingId: string;
  wrongCount: number;
  /** 下次複習日期 YYYY-MM-DD */
  dueDate: string;
}

// ---------- 農場與獎勵 ----------

export type ItemId = "coin" | "grain" | "veg" | "wood" | "brick" | "page" | "key";
export type Inventory = Record<ItemId, number>;
export type FeedItem = "grain" | "veg";
export type PetTier = "common" | "advanced" | "rare" | "legend";
/** 傳說寵物的取得條件 */
export type Achievement = "unit_lit" | "review_cleared_5" | "streak_7";

/** 圖鑑裡的一種寵物（資料，在 content/farm.ts） */
export interface PetKind {
  id: string;
  name: string;
  emoji: string;
  tier: PetTier;
  favorite: FeedItem;
  /** 傳說沒有價格 */
  price?: Partial<Inventory>;
  /** 要先蓋好的裝飾 id */
  requiresDecor?: string;
  achievement?: Achievement;
}

/** 一種裝飾（資料，在 content/farm.ts） */
export interface DecorKind {
  id: string;
  name: string;
  emoji: string;
  price: Partial<Inventory>;
  /** 小屋擴建不佔格、鐘可以點、獎盃是成就送的 */
  effect?: "barn_plus_3" | "bell" | "trophy";
  /** 最多買幾件；省略為不限 */
  maxCount?: number;
  /** 蓋了之後可以領養的寵物 id（顯示用） */
  unlocksPet?: string;
  buyable: boolean;
}

export interface OwnedPet {
  id: string;
  kind: string;
  name: string;
  growth: number;
  /** 0–5 在島上，null 在小屋 */
  slot: number | null;
  fedOn: string;
  fedToday: number;
  adoptedOn: string;
}

export interface PlacedDecor {
  id: string;
  kind: string;
  /** 0–11 在外圈，null 還沒放（只有成就送的會這樣） */
  slot: number | null;
}

export interface FarmState {
  inventory: Inventory;
  pets: OwnedPet[];
  decor: PlacedDecor[];
  barnExpansions: number;
  /** 每日計數的日期；換日就清 */
  runsDate: string;
  runsToday: Record<string, number>;
  islandsToday: IslandKind[];
  dailyBonusOn: string | null;
  /** 已領過「首次全對」獎勵的建築 */
  firstPerfect: string[];
  /** 已領過的里程碑，例如 lit:u03-v1、island:u03-vocab、unit:u03 */
  claimed: string[];
  streak: { days: number; lastDay: string | null };
  reviewCleared: number;
  lifetimeCoins: number;
  /** 最近 14 天每天的挑戰次數，家長頁用 */
  runsHistory: Record<string, number>;
}

export interface GameState {
  player: { name: string; avatar: string };
  progress: Record<string, BuildingProgress>;
  mistakes: Mistake[];
  farm: FarmState;
}
