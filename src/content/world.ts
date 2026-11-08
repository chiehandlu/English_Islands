import type { IslandId } from "@/game/types";
import { type Vec2, freeSlots, islandCenter, slotPosition } from "@/scene/layout";
import { FLOWS } from "./flows";
import { ISLANDS } from "./islands";

/** 由內容資料推導出的場景配置（位置只由 axial 決定，改數字即可移動島）。 */
export const ISLAND_ORDER: IslandId[] = ISLANDS.map((i) => i.id);

export const ISLAND_CENTERS = Object.fromEntries(
  ISLANDS.map((i) => [i.id, islandCenter(i)]),
) as Record<IslandId, Vec2>;

export interface BuildingPlacement {
  islandId: IslandId;
  buildingId: string;
  position: Vec2;
}

export interface TreePlacement {
  islandId: IslandId;
  position: Vec2;
}

export const BUILDING_PLACEMENTS: BuildingPlacement[] = [];
export const TREE_PLACEMENTS: TreePlacement[] = [];

ISLANDS.forEach((island, index) => {
  const neighbors = [ISLANDS[index - 1], ISLANDS[index + 1]].filter(Boolean);
  const slots = freeSlots(island, neighbors);
  island.buildings.forEach((b, i) => {
    BUILDING_PLACEMENTS.push({
      islandId: island.id,
      buildingId: b.id,
      position: slotPosition(island, slots[i % slots.length]),
    });
  });
  for (const slot of slots.slice(island.buildings.length)) {
    TREE_PLACEMENTS.push({ islandId: island.id, position: slotPosition(island, slot) });
  }
});

export function buildingPlacement(buildingId: string): BuildingPlacement | undefined {
  return BUILDING_PLACEMENTS.find((p) => p.buildingId === buildingId);
}

export { FLOWS, ISLANDS };
