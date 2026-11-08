import { describe, expect, it } from "vitest";
import { ISLAND_CENTERS, ISLAND_ORDER } from "@/content/world";
import { rng } from "@/game/quiz";
import {
  DECOR_SLOTS,
  DECOR_SLOTS_EXPANDED,
  FARM_RADIUS,
  FARM_RADIUS_EXPANDED,
  FARM_TILES,
  FARM_TILES_EXPANDED,
  PET_SLOTS,
  PET_SLOTS_EXPANDED,
  PET_WANDER_RADIUS,
  createWander,
  decorSlotOffset,
  farmCenter,
  petSlotOffset,
  stepWander,
} from "./farm";
import { distance } from "./layout";

describe("farm layout", () => {
  it("has 19 tiles, 37 when expanded, all distinct", () => {
    expect(new Set(FARM_TILES.map((t) => t.join(","))).size).toBe(19);
    expect(new Set(FARM_TILES_EXPANDED.map((t) => t.join(","))).size).toBe(37);
  });

  it("keeps slots inside the island and on distinct tiles", () => {
    for (let i = 0; i < PET_SLOTS; i++)
      expect(distance([0, 0], petSlotOffset(i))).toBeLessThan(FARM_RADIUS);
    for (let i = 0; i < DECOR_SLOTS; i++)
      expect(distance([0, 0], decorSlotOffset(i))).toBeLessThan(FARM_RADIUS);
    for (let i = 0; i < PET_SLOTS_EXPANDED; i++)
      expect(distance([0, 0], petSlotOffset(i))).toBeLessThan(FARM_RADIUS_EXPANDED);
    for (let i = 0; i < DECOR_SLOTS_EXPANDED; i++)
      expect(distance([0, 0], decorSlotOffset(i))).toBeLessThan(FARM_RADIUS_EXPANDED);
    const all = [
      ...[...Array(PET_SLOTS_EXPANDED).keys()].map(petSlotOffset),
      ...[...Array(DECOR_SLOTS_EXPANDED).keys()].map(decorSlotOffset),
    ].map((p) => p.map((v) => v.toFixed(3)).join(","));
    expect(new Set(all).size).toBe(PET_SLOTS_EXPANDED + DECOR_SLOTS_EXPANDED);
  });

  it("does not overlap any unit island even when expanded", () => {
    const c = farmCenter();
    for (const id of ISLAND_ORDER) {
      expect(distance(c, ISLAND_CENTERS[id])).toBeGreaterThan(FARM_RADIUS_EXPANDED + 3.5);
    }
  });

  it("wanders without leaving the tile", () => {
    const random = rng(5);
    let w = createWander(random);
    for (let i = 0; i < 2000; i++) {
      w = stepWander(w, 1 / 30, random);
      expect(distance([0, 0], [w.x, w.z])).toBeLessThanOrEqual(PET_WANDER_RADIUS + 1e-6);
    }
  });
});
