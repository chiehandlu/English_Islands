import { ISLANDS, UNITS, coreIslandsOfUnit } from "@/content/islands";
import { createFarmState } from "./farm";
import { toDateString } from "./review";
import type { Building, BuildingProgress, GameState, Island, Stars, Unit } from "./types";

export function createInitialState(today = toDateString(new Date())): GameState {
  return {
    player: { name: "", avatar: "🦊" },
    progress: {},
    mistakes: [],
    farm: createFarmState(today),
    questionStats: {},
  };
}

export const EMPTY_PROGRESS: BuildingProgress = { stars: 0, best: 0, attempts: 0 };

export function progressOf(state: GameState, buildingId: string): BuildingProgress {
  return state.progress[buildingId] ?? EMPTY_PROGRESS;
}

export function starsOf(state: GameState, buildingId: string): Stars {
  return progressOf(state, buildingId).stars;
}

/** 建築「亮燈」＝至少一顆星。 */
export function isLit(state: GameState, buildingId: string): boolean {
  return starsOf(state, buildingId) >= 1;
}

export function islandStars(state: GameState, island: Pick<Island, "buildings">): number {
  return island.buildings.reduce((n, b) => n + starsOf(state, b.id), 0);
}

export function islandMaxStars(island: Pick<Island, "buildings">): number {
  return island.buildings.length * 3;
}

export function islandComplete(state: GameState, island: Pick<Island, "buildings">): boolean {
  return island.buildings.every((b) => isLit(state, b.id));
}

/** 單元完成看三座內容島；複習島不算，因為它要等單元完成才開放。 */
export function unitComplete(state: GameState, unit: Unit): boolean {
  return coreIslandsOfUnit(unit).every((island) => islandComplete(state, island));
}

export type UnitStatus = "done" | "current" | "locked";

/** 第一個單元一開始就開放；之後的單元要等前一個單元三座島全亮。 */
export function unitStatus(state: GameState, unitIndex: number): UnitStatus {
  const unit = UNITS[unitIndex];
  if (!unit) return "locked";
  if (unitComplete(state, unit)) return "done";
  if (unitIndex === 0) return "current";
  return unitComplete(state, UNITS[unitIndex - 1]) ? "current" : "locked";
}

export type IslandStatus = "visited" | "current" | "locked";

/**
 * 島的狀態沿用場景的三色：全亮＝visited、開放中＝current、未解鎖＝locked。
 * 複習島要等同單元的三座島全亮才開放。
 */
export function islandStatus(state: GameState, islandIndex: number): IslandStatus {
  const island = ISLANDS[islandIndex];
  if (!island) return "locked";
  const unitIndex = UNITS.findIndex((u) => u.id === island.unitId);
  const status = unitStatus(state, unitIndex);
  if (status === "locked") return "locked";
  if (island.kind === "review" && !unitComplete(state, UNITS[unitIndex])) return "locked";
  return islandComplete(state, island) ? "visited" : "current";
}

export function isBuildingOpen(state: GameState, islandIndex: number): boolean {
  return islandStatus(state, islandIndex) !== "locked";
}

/** 目前島上還沒亮燈的建築。 */
export function pendingBuildings(state: GameState, island: Island): Building[] {
  return island.buildings.filter((b) => !isLit(state, b.id));
}

export function totalStars(state: GameState): number {
  return ISLANDS.reduce((n, island) => n + islandStars(state, island), 0);
}

export function maxTotalStars(): number {
  return ISLANDS.reduce((n, island) => n + islandMaxStars(island), 0);
}

/** 整體完成度 0–1（以亮燈的建築數計），供天色使用。 */
export function completionRatio(state: GameState): number {
  const buildings = ISLANDS.flatMap((i) => i.buildings);
  if (buildings.length === 0) return 0;
  return buildings.filter((b) => isLit(state, b.id)).length / buildings.length;
}

/** 依答對率給星：全對或只錯一題拿三顆，七成兩顆，五成一顆。 */
export function starsForRatio(ratio: number): Stars {
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.7) return 2;
  if (ratio >= 0.5) return 1;
  return 0;
}

/** 記錄一次挑戰結果；星星只升不降。 */
export function recordResult(state: GameState, buildingId: string, ratio: number): GameState {
  const prev = progressOf(state, buildingId);
  const stars = Math.max(prev.stars, starsForRatio(ratio)) as Stars;
  return {
    ...state,
    progress: {
      ...state.progress,
      [buildingId]: { stars, best: Math.max(prev.best, ratio), attempts: prev.attempts + 1 },
    },
  };
}

export function setPlayer(state: GameState, player: Partial<GameState["player"]>): GameState {
  return { ...state, player: { ...state.player, ...player } };
}
