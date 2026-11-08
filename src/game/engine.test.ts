import { describe, expect, it } from "vitest";
import { ISLANDS, UNITS, coreIslandsOfUnit, reviewIslandOfUnit } from "@/content/islands";
import {
  completionRatio,
  createInitialState,
  islandComplete,
  islandStatus,
  recordResult,
  starsForRatio,
  starsOf,
  unitStatus,
} from "./engine";
import type { GameState } from "./types";

function lightUnit(state: GameState, unitIndex: number): GameState {
  for (const island of coreIslandsOfUnit(UNITS[unitIndex])) {
    for (const b of island.buildings) state = recordResult(state, b.id, 1);
  }
  return state;
}

describe("engine", () => {
  it("starts with no stars and the first unit open", () => {
    const s = createInitialState();
    expect(starsOf(s, ISLANDS[0].buildings[0].id)).toBe(0);
    expect(unitStatus(s, 0)).toBe("current");
    expect(islandStatus(s, 0)).toBe("current");
    expect(completionRatio(s)).toBe(0);
  });

  it("maps correct ratio to stars", () => {
    expect(starsForRatio(1)).toBe(3);
    expect(starsForRatio(0.9)).toBe(3);
    expect(starsForRatio(0.8)).toBe(2);
    expect(starsForRatio(0.5)).toBe(1);
    expect(starsForRatio(0.4)).toBe(0);
  });

  it("never lowers stars and counts attempts", () => {
    const id = ISLANDS[0].buildings[0].id;
    let s = recordResult(createInitialState(), id, 1);
    s = recordResult(s, id, 0.3);
    expect(s.progress[id]).toEqual({ stars: 3, best: 1, attempts: 2 });
  });

  it("marks an island visited once every building is lit", () => {
    const island = ISLANDS[0];
    let s = createInitialState();
    for (const b of island.buildings.slice(0, -1)) s = recordResult(s, b.id, 0.6);
    expect(islandComplete(s, island)).toBe(false);
    expect(islandStatus(s, 0)).toBe("current");
    s = recordResult(s, island.buildings.at(-1)!.id, 0.6);
    expect(islandComplete(s, island)).toBe(true);
    expect(islandStatus(s, 0)).toBe("visited");
  });

  it("opens the review island only after the unit's three core islands are lit", () => {
    const unit = UNITS[0];
    const review = reviewIslandOfUnit(unit)!;
    const reviewIndex = ISLANDS.indexOf(review);
    let s = createInitialState();
    expect(islandStatus(s, reviewIndex)).toBe("locked");
    // 三座島亮了兩座還不行
    const [a, b, c] = coreIslandsOfUnit(unit);
    for (const island of [a, b]) {
      for (const bld of island.buildings) s = recordResult(s, bld.id, 0.6);
    }
    expect(islandStatus(s, reviewIndex)).toBe("locked");
    expect(unitStatus(s, 0)).toBe("current");
    for (const bld of c.buildings) s = recordResult(s, bld.id, 0.6);
    // 複習島不算進單元完成，所以單元已經 done、複習島同時開放
    expect(unitStatus(s, 0)).toBe("done");
    expect(islandStatus(s, reviewIndex)).toBe("current");
    for (const bld of review.buildings) s = recordResult(s, bld.id, 1);
    expect(islandStatus(s, reviewIndex)).toBe("visited");
  });

  it("locks later units until the previous one is complete", () => {
    if (UNITS.length < 2) {
      // 只有一個單元時，至少確認完成後狀態為 done
      let s = lightUnit(createInitialState(), 0);
      expect(unitStatus(s, 0)).toBe("done");
      // 複習島的建築也算進天色用的完成度，全亮才到 1
      expect(completionRatio(s)).toBeLessThan(1);
      for (const b of reviewIslandOfUnit(UNITS[0])!.buildings) s = recordResult(s, b.id, 1);
      expect(completionRatio(s)).toBe(1);
      return;
    }
    const s0 = createInitialState();
    expect(unitStatus(s0, 1)).toBe("locked");
    const s1 = lightUnit(s0, 0);
    expect(unitStatus(s1, 0)).toBe("done");
    expect(unitStatus(s1, 1)).toBe("current");
  });
});
