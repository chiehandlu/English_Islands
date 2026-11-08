import { describe, expect, it } from "vitest";
import { DECOR_KINDS, PET_KINDS } from "@/content/farm";
import { createInitialState } from "./engine";
import {
  FARM_CONFIG,
  adoptPet,
  affordableNow,
  buyDecor,
  feedPet,
  grantPet,
  missingFor,
  petCapacity,
  petStage,
  removeDecor,
  sendOutside,
  setPetSlot,
} from "./farm";
import type { GameState, Inventory } from "./types";

const DAY = "2026-11-08";

function rich(state: GameState, inv: Partial<Inventory>): GameState {
  return { ...state, farm: { ...state.farm, inventory: { ...state.farm.inventory, ...inv } } };
}

describe("farm", () => {
  it("starts with one starter chicken outside", () => {
    const s = createInitialState(DAY);
    expect(s.farm.pets).toHaveLength(1);
    expect(s.farm.pets[0]).toMatchObject({ kind: "chicken", slot: 0 });
  });

  it("reports what is missing and refuses adoption until affordable", () => {
    const s = createInitialState(DAY);
    expect(missingFor(s.farm.inventory, { coin: 20, page: 10 })).toEqual({ coin: 20, page: 10 });
    expect(adoptPet(s, "rabbit", DAY)).toEqual({ ok: false, error: "not_enough" });
    const ok = adoptPet(rich(s, { coin: 25, page: 12 }), "rabbit", DAY);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.state.farm.inventory).toMatchObject({ coin: 5, page: 2 });
      expect(ok.state.farm.pets.at(-1)).toMatchObject({ kind: "rabbit", slot: 1 });
    }
  });

  it("requires the decoration before a rare pet", () => {
    const s = rich(createInitialState(DAY), { coin: 100, page: 100, key: 10, wood: 50, brick: 50 });
    expect(adoptPet(s, "duck", DAY)).toEqual({ ok: false, error: "need_decor" });
    const pond = buyDecor(s, "pond", DAY);
    expect(pond.ok).toBe(true);
    if (pond.ok) expect(adoptPet(pond.state, "duck", DAY).ok).toBe(true);
  });

  it("sends new pets to the barn when the six slots are full and respects capacity", () => {
    let s = createInitialState(DAY);
    for (let i = 0; i < 5; i++) {
      const r = grantPet(s, "hamster", DAY);
      if (r.ok) s = r.state;
    }
    expect(s.farm.pets.filter((p) => p.slot !== null)).toHaveLength(6);
    const seventh = grantPet(s, "turtle", DAY);
    expect(seventh.ok).toBe(true);
    if (seventh.ok) {
      s = seventh.state;
      expect(s.farm.pets.at(-1)?.slot).toBeNull();
    }
    while (s.farm.pets.length < petCapacity(s.farm)) {
      const r = grantPet(s, "turtle", DAY);
      if (r.ok) s = r.state;
    }
    expect(grantPet(s, "turtle", DAY)).toEqual({ ok: false, error: "pet_full" });
    expect(sendOutside(s, s.farm.pets.at(-1)!.id)).toEqual({ ok: false, error: "pet_full" });
  });

  it("feeds up to the daily limit, favorite food grows double", () => {
    let s = rich(createInitialState(DAY), { grain: 10, veg: 10 });
    const id = s.farm.pets[0].id; // 小雞愛吃穀物
    for (let i = 0; i < FARM_CONFIG.feedPerDay; i++) {
      const r = feedPet(s, id, i % 2 === 0 ? "grain" : "veg", DAY);
      expect(r.ok).toBe(true);
      if (r.ok) s = r.state;
    }
    expect(s.farm.pets[0].growth).toBe(3 * 2 + 2 * 1);
    expect(feedPet(s, id, "grain", DAY)).toEqual({ ok: false, error: "fed_enough" });
    const next = feedPet(s, id, "grain", "2026-11-09");
    expect(next.ok).toBe(true);
    expect(s.farm.inventory.grain).toBe(7);
  });

  it("buys decor into free slots, limits expansions, refunds half on removal", () => {
    let s = rich(createInitialState(DAY), { wood: 200, brick: 200 });
    const fence = buyDecor(s, "fence", DAY);
    expect(fence.ok).toBe(true);
    if (fence.ok) s = fence.state;
    expect(s.farm.decor[0]).toMatchObject({ kind: "fence", slot: 0 });
    for (let i = 0; i < 2; i++) {
      const r = buyDecor(s, "barn-upgrade", DAY);
      expect(r.ok).toBe(true);
      if (r.ok) s = r.state;
    }
    expect(s.farm.barnExpansions).toBe(2);
    expect(buyDecor(s, "barn-upgrade", DAY)).toEqual({ ok: false, error: "max_count" });
    const woodBefore = s.farm.inventory.wood;
    const removed = removeDecor(s, s.farm.decor[0].id);
    expect(removed.ok).toBe(true);
    if (removed.ok) expect(removed.state.farm.inventory.wood).toBe(woodBefore + 5);
  });

  it("moves pets between slots and the barn", () => {
    const s = createInitialState(DAY);
    const id = s.farm.pets[0].id;
    const home = setPetSlot(s, id, null);
    expect(home.ok).toBe(true);
    if (home.ok) {
      const out = sendOutside(home.state, id);
      expect(out.ok && out.state.farm.pets[0].slot).toBe(0);
    }
  });

  it("maps growth to stages", () => {
    expect(petStage(0)).toBe("baby");
    expect(petStage(10)).toBe("teen");
    expect(petStage(30)).toBe("adult");
  });

  it("lists what is affordable now", () => {
    const s = rich(createInitialState(DAY), { coin: 20, page: 10, wood: 5 });
    const a = affordableNow(s.farm);
    expect(a.pets).toEqual(expect.arrayContaining(["chicken", "rabbit"]));
    expect(a.decor).toEqual(["flag"]);
  });

  it("has a consistent catalog", () => {
    const ids = [...PET_KINDS.map((p) => p.id), ...DECOR_KINDS.map((d) => d.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PET_KINDS) {
      if (p.requiresDecor) expect(DECOR_KINDS.some((d) => d.id === p.requiresDecor)).toBe(true);
      expect(Boolean(p.price) !== Boolean(p.achievement)).toBe(true);
    }
  });
});
