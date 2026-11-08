import {
  DECOR_KINDS,
  PET_KINDS,
  STARTER_PET,
  getDecorKind,
  getPetKind,
  getTheme,
  getWeather,
} from "@/content/farm";
import type {
  FarmState,
  FeedItem,
  GameState,
  Inventory,
  ItemId,
  OwnedPet,
  PlacedDecor,
  PlantSpec,
  WeatherId,
} from "./types";

/**
 * 農場規則：領養、蓋裝飾、餵食、調度、上限。全部是純函式。
 * 數字集中在 FARM_CONFIG。
 */
export const FARM_CONFIG = {
  /** 島上展示的寵物位（內圈六格）；買了第二圈土地再加六格 */
  displaySlots: 6,
  displaySlotsExpanded: 12,
  /** 外圈裝飾格；買了第二圈土地再加十二格 */
  decorSlots: 12,
  decorSlotsExpanded: 24,
  /** 小屋基本容量與每次擴建 */
  barnBase: 6,
  barnPerExpansion: 3,
  /** 每隻每天最多餵幾份 */
  feedPerDay: 5,
  /** 餵愛吃的長幾格 */
  favoriteGrowth: 2,
  otherGrowth: 1,
  /** 成長階段門檻 */
  teenAt: 10,
  adultAt: 30,
  /** 拆裝飾退回的比例 */
  refundRatio: 0.5,
  /** 每棵植物每天最多照顧幾次 */
  plantCarePerDay: 3,
};

export const EMPTY_INVENTORY: Inventory = {
  coin: 0,
  grain: 0,
  veg: 0,
  wood: 0,
  brick: 0,
  page: 0,
  key: 0,
};

export function createFarmState(today: string): FarmState {
  return {
    inventory: { ...EMPTY_INVENTORY },
    pets: [
      {
        id: "starter",
        kind: STARTER_PET,
        name: getPetKind(STARTER_PET)?.name ?? "小雞",
        growth: 0,
        slot: 0,
        fedOn: today,
        fedToday: 0,
        adoptedOn: today,
      },
    ],
    decor: [],
    barnExpansions: 0,
    landExpanded: false,
    runsDate: today,
    runsToday: {},
    islandsToday: [],
    dailyBonusOn: null,
    firstPerfect: [],
    claimed: [],
    streak: { days: 0, lastDay: null },
    reviewCleared: 0,
    lifetimeCoins: 0,
    runsHistory: {},
    weather: "sunny",
    weatherOwned: ["sunny"],
  };
}

export function addItems(inv: Inventory, items: Partial<Inventory>): Inventory {
  const next = { ...inv };
  for (const [k, v] of Object.entries(items)) next[k as ItemId] += v ?? 0;
  return next;
}

export function subtractItems(inv: Inventory, items: Partial<Inventory>): Inventory {
  const next = { ...inv };
  for (const [k, v] of Object.entries(items)) next[k as ItemId] -= v ?? 0;
  return next;
}

/** 還差多少；空物件代表買得起。 */
export function missingFor(inv: Inventory, price: Partial<Inventory>): Partial<Inventory> {
  const missing: Partial<Inventory> = {};
  for (const [k, v] of Object.entries(price)) {
    const need = (v ?? 0) - inv[k as ItemId];
    if (need > 0) missing[k as ItemId] = need;
  }
  return missing;
}

export function canAfford(inv: Inventory, price: Partial<Inventory>): boolean {
  return Object.keys(missingFor(inv, price)).length === 0;
}

export function barnCapacity(farm: FarmState): number {
  return FARM_CONFIG.barnBase + FARM_CONFIG.barnPerExpansion * farm.barnExpansions;
}

/** 島上可以站幾隻（買了土地就變多）。 */
export function displaySlotCount(farm: Pick<FarmState, "landExpanded">): number {
  return farm.landExpanded ? FARM_CONFIG.displaySlotsExpanded : FARM_CONFIG.displaySlots;
}

export function decorSlotCount(farm: Pick<FarmState, "landExpanded">): number {
  return farm.landExpanded ? FARM_CONFIG.decorSlotsExpanded : FARM_CONFIG.decorSlots;
}

export function petCapacity(farm: FarmState): number {
  return displaySlotCount(farm) + barnCapacity(farm);
}

/** 第二圈土地要先完成一個單元（任一 unit 里程碑領過）。 */
export function landAvailable(farm: Pick<FarmState, "claimed">): boolean {
  return farm.claimed.some((k) => k.startsWith("unit:"));
}

export function petsOutside(farm: FarmState): OwnedPet[] {
  return farm.pets.filter((p) => p.slot !== null);
}

export function petsInBarn(farm: FarmState): OwnedPet[] {
  return farm.pets.filter((p) => p.slot === null);
}

export function freeDisplaySlot(farm: FarmState): number | null {
  for (let i = 0; i < displaySlotCount(farm); i++) {
    if (!farm.pets.some((p) => p.slot === i)) return i;
  }
  return null;
}

export function freeDecorSlot(farm: FarmState): number | null {
  for (let i = 0; i < decorSlotCount(farm); i++) {
    if (!farm.decor.some((d) => d.slot === i)) return i;
  }
  return null;
}

export function hasDecor(farm: FarmState, kindId: string): boolean {
  return farm.decor.some((d) => d.kind === kindId);
}

export function ownsPetKind(farm: FarmState, kindId: string): boolean {
  return farm.pets.some((p) => p.kind === kindId);
}

// ---------- 主題 ----------

/** 主題在對應單元完成（領過 unit:uNN 里程碑）後開放；沒有主題的東西一直都開放。 */
export function themeUnlocked(farm: Pick<FarmState, "claimed">, themeId?: string): boolean {
  if (!themeId) return true;
  const theme = getTheme(themeId);
  return Boolean(theme && farm.claimed.includes(`unit:${theme.unlockUnit}`));
}

export type PetStage = "baby" | "teen" | "adult";

export function petStage(growth: number): PetStage {
  if (growth >= FARM_CONFIG.adultAt) return "adult";
  if (growth >= FARM_CONFIG.teenAt) return "teen";
  return "baby";
}

export const STAGE_LABELS: Record<PetStage, string> = { baby: "寶寶", teen: "少年", adult: "大人" };

/** 到下一階段還差幾格；大人回傳 0。 */
export function growthToNext(growth: number): number {
  if (growth >= FARM_CONFIG.adultAt) return 0;
  return (growth >= FARM_CONFIG.teenAt ? FARM_CONFIG.adultAt : FARM_CONFIG.teenAt) - growth;
}

export type FarmError =
  | "not_enough"
  | "need_decor"
  | "pet_full"
  | "decor_full"
  | "max_count"
  | "already_owned"
  | "fed_enough"
  | "no_food"
  | "not_found"
  | "slot_taken"
  | "locked"
  | "not_buyable"
  | "grown";

export type FarmResult = { ok: true; state: GameState } | { ok: false; error: FarmError };

function withFarm(state: GameState, farm: FarmState): GameState {
  return { ...state, farm };
}

let seq = 0;
function newId(prefix: string, today: string) {
  seq += 1;
  return `${prefix}-${today}-${seq}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** 不花錢直接加一隻（開場、成就）。有空位就出去，沒空位進小屋。 */
export function grantPet(state: GameState, kindId: string, today: string): FarmResult {
  const kind = getPetKind(kindId);
  if (!kind) return { ok: false, error: "not_found" };
  const farm = state.farm;
  if (farm.pets.length >= petCapacity(farm)) return { ok: false, error: "pet_full" };
  const pet: OwnedPet = {
    id: newId("pet", today),
    kind: kind.id,
    name: kind.name,
    growth: 0,
    slot: freeDisplaySlot(farm),
    fedOn: today,
    fedToday: 0,
    adoptedOn: today,
  };
  return { ok: true, state: withFarm(state, { ...farm, pets: [...farm.pets, pet] }) };
}

/** 商店領養：檢查價格、前置裝飾、容量。同一種可以養多隻。 */
export function adoptPet(state: GameState, kindId: string, today: string): FarmResult {
  const kind = getPetKind(kindId);
  if (!kind || !kind.price) return { ok: false, error: "not_buyable" };
  const farm = state.farm;
  if (!themeUnlocked(farm, kind.theme)) return { ok: false, error: "locked" };
  if (kind.requiresDecor && !hasDecor(farm, kind.requiresDecor))
    return { ok: false, error: "need_decor" };
  if (!canAfford(farm.inventory, kind.price)) return { ok: false, error: "not_enough" };
  if (farm.pets.length >= petCapacity(farm)) return { ok: false, error: "pet_full" };
  const paid = withFarm(state, {
    ...farm,
    inventory: subtractItems(farm.inventory, kind.price),
  });
  return grantPet(paid, kindId, today);
}

export function countDecor(farm: FarmState, kindId: string): number {
  return farm.decor.filter((d) => d.kind === kindId).length;
}

/** 蓋裝飾：放第一個空的外圈格；小屋擴建不佔格。 */
export function buyDecor(state: GameState, kindId: string, today: string): FarmResult {
  const kind = getDecorKind(kindId);
  if (!kind || !kind.buyable) return { ok: false, error: "not_buyable" };
  const farm = state.farm;
  if (kind.maxCount !== undefined && countDecor(farm, kindId) >= kind.maxCount)
    return { ok: false, error: "max_count" };
  if (kind.requiresUnitComplete && !landAvailable(farm)) return { ok: false, error: "locked" };
  if (!themeUnlocked(farm, kind.theme)) return { ok: false, error: "locked" };
  if (!canAfford(farm.inventory, kind.price)) return { ok: false, error: "not_enough" };
  const inventory = subtractItems(farm.inventory, kind.price);
  if (kind.effect === "land") {
    return {
      ok: true,
      state: withFarm(state, {
        ...farm,
        inventory,
        landExpanded: true,
        decor: [...farm.decor, { id: newId("decor", today), kind: kindId, slot: null }],
      }),
    };
  }
  if (kind.effect === "barn_plus_3") {
    return {
      ok: true,
      state: withFarm(state, {
        ...farm,
        inventory,
        barnExpansions: farm.barnExpansions + 1,
        decor: [...farm.decor, { id: newId("decor", today), kind: kindId, slot: null }],
      }),
    };
  }
  const slot = freeDecorSlot(farm);
  if (slot === null) return { ok: false, error: "decor_full" };
  const placed: PlacedDecor = { id: newId("decor", today), kind: kindId, slot };
  if (kind.plant) Object.assign(placed, { growth: 0, caredOn: today, caredToday: 0 });
  return {
    ok: true,
    state: withFarm(state, { ...farm, inventory, decor: [...farm.decor, placed] }),
  };
}

/** 成就送的裝飾（獎盃）：有空格就放，沒有就先收著。 */
export function grantDecor(state: GameState, kindId: string, today: string): GameState {
  const farm = state.farm;
  const placed: PlacedDecor = {
    id: newId("decor", today),
    kind: kindId,
    slot: freeDecorSlot(farm),
  };
  return withFarm(state, { ...farm, decor: [...farm.decor, placed] });
}

/** 拆掉裝飾，退一半材料（無條件捨去）。小屋擴建與獎盃不能拆。 */
export function removeDecor(state: GameState, decorId: string): FarmResult {
  const farm = state.farm;
  const item = farm.decor.find((d) => d.id === decorId);
  if (!item) return { ok: false, error: "not_found" };
  const kind = getDecorKind(item.kind);
  if (!kind || kind.effect === "barn_plus_3" || kind.effect === "trophy" || kind.effect === "land")
    return { ok: false, error: "not_buyable" };
  const refund: Partial<Inventory> = {};
  for (const [k, v] of Object.entries(kind.price))
    refund[k as ItemId] = Math.floor((v ?? 0) * FARM_CONFIG.refundRatio);
  return {
    ok: true,
    state: withFarm(state, {
      ...farm,
      inventory: addItems(farm.inventory, refund),
      decor: farm.decor.filter((d) => d.id !== decorId),
    }),
  };
}

/** 把裝飾移到另一格（空格才行）。 */
export function moveDecor(state: GameState, decorId: string, slot: number): FarmResult {
  const farm = state.farm;
  if (slot < 0 || slot >= decorSlotCount(farm)) return { ok: false, error: "slot_taken" };
  if (farm.decor.some((d) => d.slot === slot && d.id !== decorId))
    return { ok: false, error: "slot_taken" };
  return {
    ok: true,
    state: withFarm(state, {
      ...farm,
      decor: farm.decor.map((d) => (d.id === decorId ? { ...d, slot } : d)),
    }),
  };
}

/** 今天餵過幾份（換日歸零）。 */
export function fedToday(pet: OwnedPet, today: string): number {
  return pet.fedOn === today ? pet.fedToday : 0;
}

export function feedPet(
  state: GameState,
  petId: string,
  item: FeedItem,
  today: string,
): FarmResult {
  const farm = state.farm;
  const pet = farm.pets.find((p) => p.id === petId);
  if (!pet) return { ok: false, error: "not_found" };
  if (farm.inventory[item] <= 0) return { ok: false, error: "no_food" };
  if (fedToday(pet, today) >= FARM_CONFIG.feedPerDay) return { ok: false, error: "fed_enough" };
  const kind = getPetKind(pet.kind);
  const gain = kind?.favorite === item ? FARM_CONFIG.favoriteGrowth : FARM_CONFIG.otherGrowth;
  const updated: OwnedPet = {
    ...pet,
    growth: pet.growth + gain,
    fedOn: today,
    fedToday: fedToday(pet, today) + 1,
  };
  return {
    ok: true,
    state: withFarm(state, {
      ...farm,
      inventory: subtractItems(farm.inventory, { [item]: 1 }),
      pets: farm.pets.map((p) => (p.id === petId ? updated : p)),
    }),
  };
}

/** 出去玩（給 slot）或回小屋（null）。 */
export function setPetSlot(state: GameState, petId: string, slot: number | null): FarmResult {
  const farm = state.farm;
  if (!farm.pets.some((p) => p.id === petId)) return { ok: false, error: "not_found" };
  if (slot !== null) {
    if (slot < 0 || slot >= displaySlotCount(farm)) return { ok: false, error: "slot_taken" };
    if (farm.pets.some((p) => p.slot === slot && p.id !== petId))
      return { ok: false, error: "slot_taken" };
  } else if (petsInBarn(farm).filter((p) => p.id !== petId).length >= barnCapacity(farm)) {
    return { ok: false, error: "pet_full" };
  }
  return {
    ok: true,
    state: withFarm(state, {
      ...farm,
      pets: farm.pets.map((p) => (p.id === petId ? { ...p, slot } : p)),
    }),
  };
}

/** 讓寵物出去玩：自動找空位。 */
export function sendOutside(state: GameState, petId: string): FarmResult {
  const slot = freeDisplaySlot(state.farm);
  if (slot === null) return { ok: false, error: "pet_full" };
  return setPetSlot(state, petId, slot);
}

export function renamePet(state: GameState, petId: string, name: string): GameState {
  const clean = name.trim().slice(0, 8);
  if (!clean) return state;
  return withFarm(state, {
    ...state.farm,
    pets: state.farm.pets.map((p) => (p.id === petId ? { ...p, name: clean } : p)),
  });
}

/** 還沒餵滿、而且有對應飼料的寵物數（TopBar 紅點用）。 */
export function hungryPets(farm: FarmState, today: string): OwnedPet[] {
  const hasFood = farm.inventory.grain > 0 || farm.inventory.veg > 0;
  if (!hasFood) return [];
  return farm.pets.filter((p) => fedToday(p, today) < FARM_CONFIG.feedPerDay);
}

/** 現在就買得起的東西（結算畫面用來說「可以買兔子了」）。 */
export function affordableNow(farm: FarmState): { pets: string[]; decor: string[] } {
  const pets = PET_KINDS.filter(
    (k) =>
      k.price &&
      canAfford(farm.inventory, k.price) &&
      themeUnlocked(farm, k.theme) &&
      (!k.requiresDecor || hasDecor(farm, k.requiresDecor)) &&
      farm.pets.length < petCapacity(farm),
  ).map((k) => k.id);
  const decor = DECOR_KINDS.filter(
    (d) =>
      d.buyable &&
      canAfford(farm.inventory, d.price) &&
      (d.maxCount === undefined || countDecor(farm, d.id) < d.maxCount) &&
      (!d.requiresUnitComplete || landAvailable(farm)) &&
      themeUnlocked(farm, d.theme) &&
      (d.effect === "barn_plus_3" || d.effect === "land" || freeDecorSlot(farm) !== null),
  ).map((d) => d.id);
  return { pets, decor };
}

// ---------- 植物 ----------

export type PlantStage = 0 | 1 | 2;
export const PLANT_STAGE_LABELS = ["種子", "發芽", "長大了"] as const;

export function plantStage(growth: number, spec: PlantSpec): PlantStage {
  if (growth >= spec.grownAt) return 2;
  if (growth >= spec.sproutAt) return 1;
  return 0;
}

/** 這株植物現在長什麼樣子（emoji）。 */
export function plantLook(decor: Pick<PlacedDecor, "growth">, spec: PlantSpec): string {
  return spec.stages[plantStage(decor.growth ?? 0, spec)];
}

export function caredToday(decor: PlacedDecor, today: string): number {
  return decor.caredOn === today ? (decor.caredToday ?? 0) : 0;
}

/** 照顧植物：用 1 個穀物或蔬菜，長 1 格；每天最多 plantCarePerDay 次，長大了就不用再照顧。 */
export function carePlant(
  state: GameState,
  decorId: string,
  item: FeedItem,
  today: string,
): FarmResult {
  const farm = state.farm;
  const decor = farm.decor.find((d) => d.id === decorId);
  const spec = decor ? getDecorKind(decor.kind)?.plant : undefined;
  if (!decor || !spec) return { ok: false, error: "not_found" };
  const growth = decor.growth ?? 0;
  if (growth >= spec.grownAt) return { ok: false, error: "grown" };
  if (farm.inventory[item] <= 0) return { ok: false, error: "no_food" };
  const done = caredToday(decor, today);
  if (done >= FARM_CONFIG.plantCarePerDay) return { ok: false, error: "fed_enough" };
  const updated: PlacedDecor = {
    ...decor,
    growth: growth + 1,
    caredOn: today,
    caredToday: done + 1,
  };
  return {
    ok: true,
    state: withFarm(state, {
      ...farm,
      inventory: subtractItems(farm.inventory, { [item]: 1 }),
      decor: farm.decor.map((d) => (d.id === decorId ? updated : d)),
    }),
  };
}

/** 今天還可以照顧的植物（還沒長大、還沒照顧滿）。 */
export function plantsToCare(farm: FarmState, today: string): PlacedDecor[] {
  return farm.decor.filter((d) => {
    const spec = getDecorKind(d.kind)?.plant;
    return (
      spec &&
      d.slot !== null &&
      (d.growth ?? 0) < spec.grownAt &&
      caredToday(d, today) < FARM_CONFIG.plantCarePerDay
    );
  });
}

// ---------- 天氣 ----------

export function ownsWeather(farm: Pick<FarmState, "weatherOwned">, id: WeatherId): boolean {
  return id === "sunny" || (farm.weatherOwned ?? []).includes(id);
}

/** 買一種天氣：買了就馬上換成它。 */
export function buyWeather(state: GameState, id: WeatherId): FarmResult {
  const kind = getWeather(id);
  if (!kind) return { ok: false, error: "not_found" };
  const farm = state.farm;
  if (ownsWeather(farm, id)) return { ok: false, error: "already_owned" };
  if (!canAfford(farm.inventory, kind.price)) return { ok: false, error: "not_enough" };
  return {
    ok: true,
    state: withFarm(state, {
      ...farm,
      inventory: subtractItems(farm.inventory, kind.price),
      weatherOwned: [...(farm.weatherOwned ?? ["sunny"]), id],
      weather: id,
    }),
  };
}

/** 換成已經有的天氣（不花錢）。 */
export function setWeather(state: GameState, id: WeatherId): FarmResult {
  if (!getWeather(id)) return { ok: false, error: "not_found" };
  if (!ownsWeather(state.farm, id)) return { ok: false, error: "locked" };
  return { ok: true, state: withFarm(state, { ...state.farm, weather: id }) };
}
