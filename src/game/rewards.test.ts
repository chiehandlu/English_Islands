import { describe, expect, it } from "vitest";
import { ISLANDS, UNITS, coreIslandsOfUnit, reviewIslandOfUnit } from "@/content/islands";
import { createInitialState, recordResult } from "./engine";
import {
  REWARD_CONFIG,
  type QuestionOutcome,
  type RunOutcome,
  applyRunRewards,
  claimMilestones,
  coinsForRatio,
  runsLeftToday,
  touchStreak,
} from "./rewards";
import type { CoreIslandKind, GameState, QuestionType } from "./types";

const DAY = "2026-11-08";

function outcomes(kind: CoreIslandKind, spec: [QuestionType, boolean][]): QuestionOutcome[] {
  return spec.map(([type, correct], i) => ({
    questionId: `q${i}`,
    type,
    islandKind: kind,
    correct,
  }));
}

function vocabRun(correctCount: number, total = 10): RunOutcome {
  const spec: [QuestionType, boolean][] = Array.from({ length: total }, (_, i) => [
    i < 2 ? "spell" : "choice",
    i < correctCount,
  ]);
  return { buildingId: "u03-v1", islandKind: "vocab", outcomes: outcomes("vocab", spec) };
}

describe("coins", () => {
  it("follows the brackets 1 / 2 / 3", () => {
    expect(coinsForRatio(0.3)).toBe(1);
    expect(coinsForRatio(0.4)).toBe(2);
    expect(coinsForRatio(0.69)).toBe(2);
    expect(coinsForRatio(0.7)).toBe(3);
    expect(coinsForRatio(1)).toBe(3);
  });
});

describe("applyRunRewards", () => {
  it("gives coins by ratio and one material per correct answer by type", () => {
    const { result } = applyRunRewards(createInitialState(DAY), vocabRun(8), DAY);
    expect(result.gained.coin).toBe(3);
    expect(result.gained.veg).toBe(2); // 兩題拼字都在前八題
    expect(result.gained.grain).toBe(6);
    expect(result.capped).toBe(false);
    expect(result.runsLeftToday).toBe(REWARD_CONFIG.dailyFullRuns - 1);
  });

  it("pays the first-perfect bonus only once per building", () => {
    const first = applyRunRewards(createInitialState(DAY), vocabRun(10), DAY);
    expect(first.result.gained.coin).toBe(3 + REWARD_CONFIG.firstPerfectBonus);
    expect(first.result.events.map((e) => e.id)).toContain("first-perfect");
    const second = applyRunRewards(first.state, vocabRun(10), DAY);
    expect(second.result.gained.coin).toBe(3);
    expect(second.result.events.map((e) => e.id)).not.toContain("first-perfect");
  });

  it("caps full rewards at dailyFullRuns per building and resets next day", () => {
    let s = createInitialState(DAY);
    for (let i = 0; i < REWARD_CONFIG.dailyFullRuns; i++)
      s = applyRunRewards(s, vocabRun(8), DAY).state;
    const capped = applyRunRewards(s, vocabRun(8), DAY);
    expect(capped.result.capped).toBe(true);
    expect(capped.result.gained).toEqual({ coin: REWARD_CONFIG.cappedCoins });
    expect(runsLeftToday(capped.state.farm, "u03-v1", DAY)).toBe(0);
    const tomorrow = applyRunRewards(capped.state, vocabRun(8), "2026-11-09");
    expect(tomorrow.result.capped).toBe(false);
    expect(tomorrow.result.gained.coin).toBe(3);
  });

  it("adds the daily bonus once all three islands were visited", () => {
    let s = createInitialState(DAY);
    s = applyRunRewards(s, vocabRun(8), DAY).state;
    s = applyRunRewards(
      s,
      {
        buildingId: "u03-g1",
        islandKind: "grammar",
        outcomes: outcomes("grammar", [["order", true]]),
      },
      DAY,
    ).state;
    const third = applyRunRewards(
      s,
      {
        buildingId: "u03-r1",
        islandKind: "reading",
        outcomes: outcomes("reading", [["match", true]]),
      },
      DAY,
    );
    expect(third.result.events.map((e) => e.id)).toContain("daily-islands");
    expect(third.result.gained.key).toBe(1);
    // 3 顆金幣 + 這棟第一次全對 + 每日三島
    expect(third.result.gained.coin).toBe(
      3 + REWARD_CONFIG.firstPerfectBonus + REWARD_CONFIG.dailyAllIslands,
    );
    const again = applyRunRewards(third.state, vocabRun(8), DAY);
    expect(again.result.events.map((e) => e.id)).not.toContain("daily-islands");
  });

  it("rewards review runs per correct answer, capped, plus a clear bonus", () => {
    const run: RunOutcome = {
      buildingId: null,
      islandKind: null,
      outcomes: outcomes(
        "reading",
        Array.from({ length: 8 }, () => ["yesno", true]),
      ),
      reviewCleared: true,
    };
    const { result, state } = applyRunRewards(createInitialState(DAY), run, DAY);
    expect(result.gained.coin).toBe(REWARD_CONFIG.review.max + REWARD_CONFIG.review.clearBonus);
    expect(result.gained.page).toBe(8);
    expect(state.farm.reviewCleared).toBe(1);
  });

  it("tracks streak days", () => {
    let farm = createInitialState(DAY).farm;
    farm = touchStreak(farm, DAY);
    farm = touchStreak(farm, DAY);
    expect(farm.streak.days).toBe(1);
    farm = touchStreak(farm, "2026-11-09");
    expect(farm.streak.days).toBe(2);
    farm = touchStreak(farm, "2026-11-12");
    expect(farm.streak.days).toBe(1);
  });

  it("keeps lifetime coins and the run history", () => {
    const { state } = applyRunRewards(createInitialState(DAY), vocabRun(8), DAY);
    expect(state.farm.lifetimeCoins).toBe(3);
    expect(state.farm.runsHistory[DAY]).toBe(1);
  });
});

describe("claimMilestones", () => {
  function lightBuilding(s: GameState, id: string, ratio = 1) {
    return recordResult(s, id, ratio);
  }

  it("pays first-lit and three-star bonuses once", () => {
    const b = ISLANDS[0].buildings[0];
    let s = lightBuilding(createInitialState(DAY), b.id, 1);
    const first = claimMilestones(s, DAY);
    expect(first.events.map((e) => e.id)).toEqual([`lit:${b.id}`, `star3:${b.id}`]);
    expect(first.state.farm.inventory.coin).toBe(REWARD_CONFIG.firstLit);
    expect(first.state.farm.inventory.veg).toBe(REWARD_CONFIG.firstThreeStars);
    s = claimMilestones(first.state, DAY).state;
    expect(s.farm.inventory.coin).toBe(REWARD_CONFIG.firstLit);
  });

  it("rewards a complete island and a complete unit", () => {
    let s = createInitialState(DAY);
    const unit = UNITS[0];
    for (const island of coreIslandsOfUnit(unit)) {
      for (const b of island.buildings) s = lightBuilding(s, b.id, 0.6);
    }
    const { state, events } = claimMilestones(s, DAY);
    const ids = events.map((e) => e.id);
    for (const island of coreIslandsOfUnit(unit)) expect(ids).toContain(`island:${island.id}`);
    expect(ids).toContain(`unit:${unit.id}`);
    // Unit 3 完成會宣布萬聖節主題開放
    expect(ids).toContain("theme:halloween");
    expect(ids).not.toContain("theme:christmas");
    expect(state.farm.pets.some((p) => p.kind === "unicorn")).toBe(true);
    expect(state.farm.inventory.key).toBe(3 * (REWARD_CONFIG.islandComplete.key ?? 0));
    // 複習島還沒碰，不算進單元完成也不給島獎勵
    const review = reviewIslandOfUnit(unit)!;
    expect(ids).not.toContain(`island:${review.id}`);
  });

  it("pays review-island three stars in coins and the island bonus once it is lit", () => {
    const unit = UNITS[0];
    const review = reviewIslandOfUnit(unit)!;
    let s = createInitialState(DAY);
    for (const b of review.buildings) s = lightBuilding(s, b.id, 1);
    const { state, events } = claimMilestones(s, DAY);
    const ids = events.map((e) => e.id);
    for (const b of review.buildings) expect(ids).toContain(`star3:${b.id}`);
    expect(ids).toContain(`island:${review.id}`);
    expect(state.farm.inventory.veg).toBe(0);
    expect(state.farm.inventory.coin).toBe(
      review.buildings.length * (REWARD_CONFIG.firstLit + REWARD_CONFIG.firstThreeStars) +
        (REWARD_CONFIG.islandComplete.coin ?? 0),
    );
  });

  it("grants the dragon after five review clears", () => {
    let s = createInitialState(DAY);
    s = { ...s, farm: { ...s.farm, reviewCleared: 5 } };
    const { state, events } = claimMilestones(s, DAY);
    expect(events.map((e) => e.id)).toContain("dragon");
    expect(state.farm.pets.some((p) => p.kind === "dragon")).toBe(true);
    expect(claimMilestones(state, DAY).events).toHaveLength(0);
  });
});
