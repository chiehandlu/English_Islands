import { COMMON_ITEM, RARE_ITEM, dropFor, getPetKind } from "@/content/farm";
import { ISLANDS, UNITS, coreIslandsOfUnit } from "@/content/islands";
import { isLit, islandComplete, starsOf, unitComplete } from "./engine";
import { addItems, grantDecor, grantPet, ownsPetKind } from "./farm";
import { addDays } from "./review";
import type {
  CoreIslandKind,
  FarmState,
  GameState,
  Inventory,
  IslandKind,
  ItemId,
  QuestionType,
} from "./types";

/**
 * 獎勵規則：一次挑戰給多少金幣與材料、每日上限、里程碑。純函式。
 * 數字集中在 REWARD_CONFIG，依 docs/reward-design.md。
 */
export const REWARD_CONFIG = {
  /** 金幣級距：答對率 < midAt 給 low，< highAt 給 mid，其餘 high */
  coins: { low: 1, mid: 2, high: 3, midAt: 0.4, highAt: 0.7 },
  /** 這棟第一次全對多給 */
  firstPerfectBonus: 2,
  /** 同一棟每天前幾次全額 */
  dailyFullRuns: 5,
  /** 超過上限後每次只給 */
  cappedCoins: 1,
  /** 錯題袋：每答對一題給、單次上限、清空加碼 */
  review: { perCorrect: 1, max: 5, clearBonus: 3 },
  /** 里程碑 */
  firstLit: 3,
  firstThreeStars: 1,
  islandComplete: { coin: 10, key: 1 } as Partial<Inventory>,
  unitCompleteFallback: { coin: 20, key: 3 } as Partial<Inventory>,
  dailyAllIslands: 5,
  streakForPanda: 7,
  reviewClearsForDragon: 5,
  /** 家長頁保留幾天的挑戰次數 */
  historyDays: 14,
};

export interface QuestionOutcome {
  questionId: string;
  type: QuestionType;
  /** 題目原本的島（複習島、錯題袋的題目也用原島），決定掉什麼材料 */
  islandKind: CoreIslandKind;
  correct: boolean;
}

export interface RunOutcome {
  /** null 代表錯題袋複習 */
  buildingId: string | null;
  islandKind: IslandKind | null;
  outcomes: QuestionOutcome[];
  /** 錯題袋複習後是否清空 */
  reviewCleared?: boolean;
}

export interface RewardEvent {
  id: string;
  label: string;
  gained: Partial<Inventory>;
  petKind?: string;
  decorKind?: string;
}

export interface RewardResult {
  gained: Partial<Inventory>;
  events: RewardEvent[];
  /** 這次已超過每日上限 */
  capped: boolean;
  /** 這棟今天還剩幾次全額 */
  runsLeftToday: number;
}

export function coinsForRatio(ratio: number): number {
  const c = REWARD_CONFIG.coins;
  if (ratio < c.midAt) return c.low;
  if (ratio < c.highAt) return c.mid;
  return c.high;
}

/** 換日：每日計數歸零。 */
export function rollDay(farm: FarmState, today: string): FarmState {
  if (farm.runsDate === today) return farm;
  return { ...farm, runsDate: today, runsToday: {}, islandsToday: [] };
}

export function runsToday(farm: FarmState, buildingId: string, today: string): number {
  return farm.runsDate === today ? (farm.runsToday[buildingId] ?? 0) : 0;
}

export function runsLeftToday(farm: FarmState, buildingId: string, today: string): number {
  return Math.max(0, REWARD_CONFIG.dailyFullRuns - runsToday(farm, buildingId, today));
}

/** 連續天數：昨天有來就 +1，隔更久就從 1 重算，今天已算過就不動。 */
export function touchStreak(farm: FarmState, today: string): FarmState {
  const { days, lastDay } = farm.streak;
  if (lastDay === today) return farm;
  const continued = lastDay !== null && addDays(lastDay, 1) === today;
  return { ...farm, streak: { days: continued ? days + 1 : 1, lastDay: today } };
}

function bumpHistory(farm: FarmState, today: string): FarmState {
  const history = { ...farm.runsHistory, [today]: (farm.runsHistory[today] ?? 0) + 1 };
  const keep = Object.keys(history).sort().slice(-REWARD_CONFIG.historyDays);
  return { ...farm, runsHistory: Object.fromEntries(keep.map((d) => [d, history[d]])) };
}

function merge(a: Partial<Inventory>, b: Partial<Inventory>): Partial<Inventory> {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k as ItemId] = (out[k as ItemId] ?? 0) + (v ?? 0);
  return out;
}

function totalCoins(items: Partial<Inventory>): number {
  return items.coin ?? 0;
}

/**
 * 結算一次挑戰：金幣、材料、首次全對、每日上限、每日三島、連續天數。
 * 不處理星星（engine.recordResult）與里程碑（claimMilestones），由 store 依序呼叫。
 */
export function applyRunRewards(
  state: GameState,
  run: RunOutcome,
  today: string,
): { state: GameState; result: RewardResult } {
  let farm = touchStreak(bumpHistory(rollDay(state.farm, today), today), today);
  const events: RewardEvent[] = [];
  let gained: Partial<Inventory> = {};
  let capped = false;
  const total = run.outcomes.length;
  const correct = run.outcomes.filter((o) => o.correct).length;

  if (run.buildingId === null) {
    // 錯題袋複習
    const coin = Math.min(REWARD_CONFIG.review.max, correct * REWARD_CONFIG.review.perCorrect);
    gained = merge(gained, { coin });
    for (const o of run.outcomes) {
      if (o.correct) gained = merge(gained, { [dropFor(o.islandKind, o.type)]: 1 });
    }
    if (run.reviewCleared) {
      gained = merge(gained, { coin: REWARD_CONFIG.review.clearBonus });
      farm = { ...farm, reviewCleared: farm.reviewCleared + 1 };
      events.push({
        id: "review-clear",
        label: "錯題袋清空了！",
        gained: { coin: REWARD_CONFIG.review.clearBonus },
      });
    }
  } else {
    const runs = farm.runsToday[run.buildingId] ?? 0;
    farm = { ...farm, runsToday: { ...farm.runsToday, [run.buildingId]: runs + 1 } };
    if (run.islandKind && !farm.islandsToday.includes(run.islandKind))
      farm = { ...farm, islandsToday: [...farm.islandsToday, run.islandKind] };

    if (runs >= REWARD_CONFIG.dailyFullRuns) {
      capped = true;
      gained = { coin: REWARD_CONFIG.cappedCoins };
    } else {
      const ratio = total === 0 ? 0 : correct / total;
      gained = merge(gained, { coin: coinsForRatio(ratio) });
      if (ratio === 1 && total > 0 && !farm.firstPerfect.includes(run.buildingId)) {
        farm = { ...farm, firstPerfect: [...farm.firstPerfect, run.buildingId] };
        gained = merge(gained, { coin: REWARD_CONFIG.firstPerfectBonus });
        events.push({
          id: "first-perfect",
          label: "第一次全對！",
          gained: { coin: REWARD_CONFIG.firstPerfectBonus },
        });
      }
      for (const o of run.outcomes) {
        if (o.correct) gained = merge(gained, { [dropFor(o.islandKind, o.type)]: 1 });
      }
    }

    // 今天三座島都來過
    const kinds: IslandKind[] = ["vocab", "grammar", "reading"];
    if (kinds.every((k) => farm.islandsToday.includes(k)) && farm.dailyBonusOn !== today) {
      farm = { ...farm, dailyBonusOn: today };
      gained = merge(gained, { coin: REWARD_CONFIG.dailyAllIslands });
      events.push({
        id: "daily-islands",
        label: "今天三座島都去過了！",
        gained: { coin: REWARD_CONFIG.dailyAllIslands },
      });
    }
  }

  farm = {
    ...farm,
    inventory: addItems(farm.inventory, gained),
    lifetimeCoins: farm.lifetimeCoins + totalCoins(gained),
  };
  const next = { ...state, farm };
  return {
    state: next,
    result: {
      gained,
      events,
      capped,
      runsLeftToday: run.buildingId ? runsLeftToday(farm, run.buildingId, today) : 0,
    },
  };
}

function claim(farm: FarmState, key: string): FarmState {
  return { ...farm, claimed: [...farm.claimed, key] };
}

function give(state: GameState, items: Partial<Inventory>): GameState {
  return {
    ...state,
    farm: {
      ...state.farm,
      inventory: addItems(state.farm.inventory, items),
      lifetimeCoins: state.farm.lifetimeCoins + totalCoins(items),
    },
  };
}

/**
 * 里程碑：依目前的星星與農場狀態，把還沒領過的一次領完。
 * 每次結算後呼叫；可重複呼叫，已領過的不會再給。
 */
export function claimMilestones(
  state: GameState,
  today: string,
): { state: GameState; events: RewardEvent[] } {
  const events: RewardEvent[] = [];
  let s = state;
  const has = (key: string) => s.farm.claimed.includes(key);

  for (const island of ISLANDS) {
    for (const b of island.buildings) {
      if (isLit(s, b.id) && !has(`lit:${b.id}`)) {
        s = give({ ...s, farm: claim(s.farm, `lit:${b.id}`) }, { coin: REWARD_CONFIG.firstLit });
        events.push({
          id: `lit:${b.id}`,
          label: `${b.emoji} ${b.name} 第一次亮燈`,
          gained: { coin: REWARD_CONFIG.firstLit },
        });
      }
      if (starsOf(s, b.id) === 3 && !has(`star3:${b.id}`)) {
        // 複習島的三星送金幣，其他島送該島稀有材料
        const item: ItemId = island.kind === "review" ? "coin" : RARE_ITEM[island.kind];
        s = give(
          { ...s, farm: claim(s.farm, `star3:${b.id}`) },
          { [item]: REWARD_CONFIG.firstThreeStars },
        );
        events.push({
          id: `star3:${b.id}`,
          label: `${b.emoji} ${b.name} 三顆星`,
          gained: { [item]: REWARD_CONFIG.firstThreeStars },
        });
      }
    }
    if (islandComplete(s, island) && !has(`island:${island.id}`)) {
      s = give({ ...s, farm: claim(s.farm, `island:${island.id}`) }, REWARD_CONFIG.islandComplete);
      events.push({
        id: `island:${island.id}`,
        label: `${island.name}全亮！`,
        gained: REWARD_CONFIG.islandComplete,
      });
    }
  }

  for (const unit of UNITS) {
    if (unitComplete(s, unit) && !has(`unit:${unit.id}`)) {
      s = { ...s, farm: claim(s.farm, `unit:${unit.id}`) };
      const granted = !ownsPetKind(s.farm, "unicorn") ? grantPet(s, "unicorn", today) : null;
      if (granted?.ok) {
        s = granted.state;
        events.push({
          id: `unit:${unit.id}`,
          label: `Unit ${unit.number} 完成！獨角獸來了`,
          gained: {},
          petKind: "unicorn",
        });
      } else {
        s = give(s, REWARD_CONFIG.unitCompleteFallback);
        events.push({
          id: `unit:${unit.id}`,
          label: `Unit ${unit.number} 完成！`,
          gained: REWARD_CONFIG.unitCompleteFallback,
        });
      }
    }
    const allStar = coreIslandsOfUnit(unit).every((i) =>
      i.buildings.every((b) => starsOf(s, b.id) === 3),
    );
    if (allStar && !has(`allstar:${unit.id}`)) {
      s = grantDecor({ ...s, farm: claim(s.farm, `allstar:${unit.id}`) }, "trophy", today);
      events.push({
        id: `allstar:${unit.id}`,
        label: `Unit ${unit.number} 全部三顆星！獎盃庭園`,
        gained: {},
        decorKind: "trophy",
      });
    }
  }

  if (s.farm.reviewCleared >= REWARD_CONFIG.reviewClearsForDragon && !has("dragon")) {
    const granted = grantPet(s, "dragon", today);
    if (granted.ok) {
      s = { ...granted.state, farm: claim(granted.state.farm, "dragon") };
      events.push({
        id: "dragon",
        label: "錯題袋清空 5 次！小龍來了",
        gained: {},
        petKind: "dragon",
      });
    }
  }
  if (s.farm.streak.days >= REWARD_CONFIG.streakForPanda && !has("panda")) {
    const granted = grantPet(s, "panda", today);
    if (granted.ok) {
      s = { ...granted.state, farm: claim(granted.state.farm, "panda") };
      events.push({ id: "panda", label: "連續 7 天！熊貓來了", gained: {}, petKind: "panda" });
    }
  }

  return { state: s, events };
}

/** 這棟會掉什麼（建築卡提示用）；複習島的建築照題目原本的島，回傳空陣列由介面另外說明。 */
export function dropsForBuilding(kind: IslandKind, types: QuestionType[]): ItemId[] {
  if (kind === "review") return [];
  const set = new Set<ItemId>();
  for (const t of types) set.add(dropFor(kind, t));
  const order: ItemId[] = [COMMON_ITEM[kind], RARE_ITEM[kind]];
  return order.filter((i) => set.has(i));
}

export function petName(kindId: string): string {
  return getPetKind(kindId)?.name ?? kindId;
}
