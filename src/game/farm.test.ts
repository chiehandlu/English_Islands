import { describe, expect, it } from "vitest";
import { DECOR_KINDS, PET_KINDS, THEMES, WEATHER_KINDS } from "@/content/farm";
import { UNITS } from "@/content/islands";
import { createInitialState } from "./engine";
import {
  FARM_CONFIG,
  adoptPet,
  affordableNow,
  buyDecor,
  buyWeather,
  carePlant,
  decorSlotCount,
  displaySlotCount,
  feedPet,
  grantPet,
  missingFor,
  petCapacity,
  petStage,
  plantStage,
  plantsToCare,
  removeDecor,
  sendOutside,
  setPetSlot,
  setWeather,
  themeUnlocked,
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

  it("sells the second ring only after a unit is complete, then doubles the slots", () => {
    const base = rich(createInitialState(DAY), { coin: 100, wood: 100, brick: 100 });
    expect(buyDecor(base, "land", DAY)).toEqual({ ok: false, error: "locked" });
    const unlocked = { ...base, farm: { ...base.farm, claimed: ["unit:u03"] } };
    expect(displaySlotCount(unlocked.farm)).toBe(6);
    const bought = buyDecor(unlocked, "land", DAY);
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;
    expect(bought.state.farm.landExpanded).toBe(true);
    expect(displaySlotCount(bought.state.farm)).toBe(12);
    expect(decorSlotCount(bought.state.farm)).toBe(24);
    expect(petCapacity(bought.state.farm)).toBe(12 + 6);
    expect(bought.state.farm.inventory).toMatchObject({ coin: 20, wood: 40, brick: 60 });
    expect(buyDecor(bought.state, "land", DAY)).toEqual({ ok: false, error: "max_count" });
    // 第七隻直接站到新的位子，而不是進小屋
    let s = bought.state;
    for (let i = 0; i < 6; i++) {
      const r = grantPet(s, "rabbit", DAY);
      if (r.ok) s = r.state;
    }
    expect(s.farm.pets.filter((p) => p.slot !== null)).toHaveLength(7);
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

  it("keeps themed pets and decor locked until their unit is complete", () => {
    const s = rich(createInitialState(DAY), { coin: 200, page: 100, key: 10, wood: 50, brick: 50 });
    expect(themeUnlocked(s.farm, "halloween")).toBe(false);
    expect(adoptPet(s, "bat", DAY)).toEqual({ ok: false, error: "locked" });
    expect(buyDecor(s, "web", DAY)).toEqual({ ok: false, error: "locked" });
    expect(affordableNow(s.farm).pets).not.toContain("bat");
    const done = { ...s, farm: { ...s.farm, claimed: ["unit:u03"] } };
    expect(themeUnlocked(done.farm, "halloween")).toBe(true);
    expect(themeUnlocked(done.farm, "christmas")).toBe(false);
    expect(adoptPet(done, "bat", DAY).ok).toBe(true);
    expect(buyDecor(done, "web", DAY).ok).toBe(true);
    expect(adoptPet(done, "penguin", DAY)).toEqual({ ok: false, error: "locked" });
  });

  it("grows a plant from seed with up to three cares a day", () => {
    let s = rich(createInitialState(DAY), { coin: 10, grain: 20 });
    const planted = buyDecor(s, "tulip", DAY);
    expect(planted.ok).toBe(true);
    if (!planted.ok) return;
    s = planted.state;
    const tulip = s.farm.decor.at(-1)!;
    expect(tulip).toMatchObject({ kind: "tulip", growth: 0, slot: 0 });
    const spec = DECOR_KINDS.find((d) => d.id === "tulip")!.plant!;
    for (let i = 0; i < FARM_CONFIG.plantCarePerDay; i++) {
      const r = carePlant(s, tulip.id, "grain", DAY);
      expect(r.ok).toBe(true);
      if (r.ok) s = r.state;
    }
    expect(carePlant(s, tulip.id, "grain", DAY)).toEqual({ ok: false, error: "fed_enough" });
    expect(plantsToCare(s.farm, DAY)).toHaveLength(0);
    expect(plantStage(s.farm.decor.at(-1)!.growth!, spec)).toBe(1);
    // 隔天再照顧三次就長大，之後不用再照顧
    const NEXT = "2026-11-09";
    expect(plantsToCare(s.farm, NEXT)).toHaveLength(1);
    for (let i = 0; i < 3; i++) {
      const r = carePlant(s, tulip.id, "grain", NEXT);
      if (r.ok) s = r.state;
    }
    expect(plantStage(s.farm.decor.at(-1)!.growth!, spec)).toBe(2);
    expect(carePlant(s, tulip.id, "grain", NEXT)).toEqual({ ok: false, error: "grown" });
    expect(s.farm.inventory.grain).toBe(20 - 3 - spec.grownAt);
  });

  it("refuses to care without food and only for plants", () => {
    const s = rich(createInitialState(DAY), { coin: 10, grain: 3, wood: 5 });
    const planted = buyDecor(s, "tulip", DAY);
    if (!planted.ok) throw new Error("plant");
    const id = planted.state.farm.decor.at(-1)!.id;
    expect(carePlant(planted.state, id, "grain", DAY)).toEqual({ ok: false, error: "no_food" });
    const flag = buyDecor(s, "flag", DAY);
    if (!flag.ok) throw new Error("flag");
    const fid = flag.state.farm.decor.at(-1)!.id;
    expect(carePlant(flag.state, fid, "grain", DAY)).toEqual({ ok: false, error: "not_found" });
  });

  it("buys weather once and switches freely afterwards", () => {
    let s = createInitialState(DAY);
    expect(s.farm.weather).toBe("sunny");
    expect(setWeather(s, "snow")).toEqual({ ok: false, error: "locked" });
    expect(buyWeather(s, "snow")).toEqual({ ok: false, error: "not_enough" });
    s = rich(s, { coin: 40, page: 10 });
    const bought = buyWeather(s, "snow");
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;
    s = bought.state;
    expect(s.farm).toMatchObject({ weather: "snow", inventory: { coin: 0, page: 0 } });
    expect(buyWeather(s, "snow")).toEqual({ ok: false, error: "already_owned" });
    const sunny = setWeather(s, "sunny");
    expect(sunny.ok && sunny.state.farm.weather).toBe("sunny");
    if (sunny.ok) {
      const back = setWeather(sunny.state, "snow");
      expect(back.ok && back.state.farm).toMatchObject({ weather: "snow", inventory: { coin: 0 } });
    }
  });

  it("ties every theme to a real unit and every themed item to a theme", () => {
    for (const t of THEMES)
      expect(
        UNITS.some((u) => u.id === t.unlockUnit),
        t.id,
      ).toBe(true);
    const themed = [...PET_KINDS, ...DECOR_KINDS].filter((k) => k.theme);
    expect(themed.length).toBeGreaterThan(0);
    for (const k of themed)
      expect(
        THEMES.some((t) => t.id === k.theme),
        k.id,
      ).toBe(true);
    for (const t of THEMES) {
      expect(PET_KINDS.some((p) => p.theme === t.id)).toBe(true);
      expect(DECOR_KINDS.some((d) => d.theme === t.id && d.plant)).toBe(true);
    }
    expect(WEATHER_KINDS.find((w) => w.id === "sunny")!.price).toEqual({});
  });
});
