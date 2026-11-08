import { describe, expect, it } from "vitest";
import { ISLAND_CENTERS, ISLAND_ORDER } from "@/content/world";
import { rng } from "@/game/quiz";
import {
  DECOR_SLOTS,
  FARM_RADIUS,
  FARM_TILES,
  PET_SLOTS,
  PET_WANDER_RADIUS,
  createWander,
  decorSlotOffset,
  farmCenter,
  petSlotOffset,
  stepWander,
} from "./farm";
import { distance } from "./layout";

describe("farm layout", () => {
  it("has 19 distinct tiles", () => {
    const keys = FARM_TILES.map((t) => t.join(","));
    expect(new Set(keys).size).toBe(19);
  });

  it("keeps slots inside the island", () => {
    for (let i = 0; i < PET_SLOTS; i++)
      expect(distance([0, 0], petSlotOffset(i))).toBeLessThan(FARM_RADIUS);
    for (let i = 0; i < DECOR_SLOTS; i++)
      expect(distance([0, 0], decorSlotOffset(i))).toBeLessThan(FARM_RADIUS);
    const all = [...Array(PET_SLOTS).keys()].map(petSlotOffset).map((p) => p.join(","));
    expect(new Set(all).size).toBe(PET_SLOTS);
  });

  it("does not overlap any unit island", () => {
    const c = farmCenter();
    for (const id of ISLAND_ORDER) {
      expect(distance(c, ISLAND_CENTERS[id])).toBeGreaterThan(FARM_RADIUS + 3.5);
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
