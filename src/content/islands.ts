import type { Building, Island, IslandId, Unit } from "@/game/types";
import { UNITS } from "./units";

/**
 * 一個單元＝三座相鄰的小島（單字／文法／閱讀），排成一叢。
 * 叢與叢之間隔一格水，讓單元之間看得出分界；位置只由單元順序推導，內容檔不用寫座標。
 */
const CLUSTER_OFFSETS: [number, number][] = [
  [0, 0],
  [1, 0],
  [0, 1],
];
const CLUSTER_STEP: [number, number] = [2, 1];

export function clusterBase(unitIndex: number): [number, number] {
  return [CLUSTER_STEP[0] * unitIndex, CLUSTER_STEP[1] * unitIndex];
}

export function islandAxial(unitIndex: number, islandIndex: number): [number, number] {
  const [bq, br] = clusterBase(unitIndex);
  const [oq, or] = CLUSTER_OFFSETS[islandIndex % CLUSTER_OFFSETS.length];
  return [bq + oq, br + or];
}

/** 場景用的島清單：依單元順序、單元內依島順序，編號連續。 */
export const ISLANDS: Island[] = UNITS.flatMap((unit, u) =>
  unit.islands.map((island, i) => ({
    ...island,
    unitId: unit.id,
    number: 0,
    axial: islandAxial(u, i),
  })),
).map((island, index) => ({ ...island, number: index + 1 }));

export { UNITS };

export function getUnit(id: string): Unit | undefined {
  return UNITS.find((u) => u.id === id);
}

export function getIsland(id: IslandId): Island | undefined {
  return ISLANDS.find((i) => i.id === id);
}

export function unitOfIsland(island: Pick<Island, "unitId">): Unit {
  return UNITS.find((u) => u.id === island.unitId)!;
}

export function islandsOfUnit(unit: Pick<Unit, "id">): Island[] {
  return ISLANDS.filter((i) => i.unitId === unit.id);
}

export function findBuilding(id: string): { island: Island; building: Building } | undefined {
  for (const island of ISLANDS) {
    const building = island.buildings.find((b) => b.id === id);
    if (building) return { island, building };
  }
}

export const ALL_BUILDINGS: Building[] = ISLANDS.flatMap((i) => i.buildings);

export function findQuestion(questionId: string) {
  for (const island of ISLANDS) {
    for (const building of island.buildings) {
      const question = building.questions.find((q) => q.id === questionId);
      if (question) return { island, building, question };
    }
  }
}
