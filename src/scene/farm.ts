import {
  ISLAND_GRID_SIZE,
  ISLAND_TILES,
  TILE_SIZE,
  type Vec2,
  axialToWorld,
  distance,
} from "./layout";

/**
 * 農場島的版面：19 格（中心 1、內圈 6、外圈 12），放在第一個單元左邊隔一格水。
 * 內圈＝寵物位、外圈＝裝飾位。純數學，無副作用。
 */
export const FARM_AXIAL: [number, number] = [-3, 1];

export function farmCenter(): Vec2 {
  return axialToWorld(FARM_AXIAL, ISLAND_GRID_SIZE);
}

/** 外圈 12 格，繞一圈排序，從右邊開始逆時針。 */
export const FARM_RING2: [number, number][] = [
  [2, 0],
  [2, -1],
  [2, -2],
  [1, -2],
  [0, -2],
  [-1, -1],
  [-2, 0],
  [-2, 1],
  [-2, 2],
  [-1, 2],
  [0, 2],
  [1, 1],
];

/** 第三圈 18 格（買了第二圈土地才有）：6 個角給寵物、12 個邊給裝飾。 */
export const FARM_RING3_CORNERS: [number, number][] = [
  [3, 0],
  [3, -3],
  [0, -3],
  [-3, 0],
  [-3, 3],
  [0, 3],
];
export const FARM_RING3_EDGES: [number, number][] = [
  [3, -1],
  [3, -2],
  [2, -3],
  [1, -3],
  [-1, -2],
  [-2, -1],
  [-3, 1],
  [-3, 2],
  [-2, 3],
  [-1, 3],
  [1, 2],
  [2, 1],
];

export const FARM_TILES: [number, number][] = [...ISLAND_TILES, ...FARM_RING2];
export const FARM_TILES_EXPANDED: [number, number][] = [
  ...FARM_TILES,
  ...FARM_RING3_CORNERS,
  ...FARM_RING3_EDGES,
];

export function farmTiles(expanded: boolean): [number, number][] {
  return expanded ? FARM_TILES_EXPANDED : FARM_TILES;
}

export const PET_SLOTS = 6;
export const PET_SLOTS_EXPANDED = PET_SLOTS + FARM_RING3_CORNERS.length;
export const DECOR_SLOTS = FARM_RING2.length;
export const DECOR_SLOTS_EXPANDED = DECOR_SLOTS + FARM_RING3_EDGES.length;

/** 寵物位：0–5 內圈，6–11 第三圈的角。 */
export function petSlotOffset(slot: number): Vec2 {
  if (slot < PET_SLOTS) return axialToWorld(ISLAND_TILES[slot + 1], TILE_SIZE);
  return axialToWorld(
    FARM_RING3_CORNERS[(slot - PET_SLOTS) % FARM_RING3_CORNERS.length],
    TILE_SIZE,
  );
}

/** 裝飾位：0–11 第二圈，12–23 第三圈的邊。 */
export function decorSlotOffset(slot: number): Vec2 {
  if (slot < DECOR_SLOTS) return axialToWorld(FARM_RING2[slot], TILE_SIZE);
  return axialToWorld(FARM_RING3_EDGES[(slot - DECOR_SLOTS) % FARM_RING3_EDGES.length], TILE_SIZE);
}

/** 島的實際半徑：最外圈格中心的距離加上格子本身。 */
export function farmRadius(expanded: boolean): number {
  const rings = expanded ? 3 : 2;
  return rings * Math.sqrt(3) * TILE_SIZE + TILE_SIZE * 1.15;
}

export const FARM_RADIUS = farmRadius(false);
export const FARM_RADIUS_EXPANDED = farmRadius(true);

export const PET_WANDER_RADIUS = 0.42;
export const PET_SPEED = 0.35; // 世界單位／秒

export interface WanderState {
  /** 相對格子中心的位置 */
  x: number;
  z: number;
  tx: number;
  tz: number;
  /** 停下來休息的剩餘秒數 */
  rest: number;
}

export function createWander(random: () => number): WanderState {
  const [tx, tz] = randomTarget(random);
  return { x: 0, z: 0, tx, tz, rest: random() * 2 };
}

function randomTarget(random: () => number): Vec2 {
  const a = random() * Math.PI * 2;
  const r = Math.sqrt(random()) * PET_WANDER_RADIUS;
  return [Math.cos(a) * r, Math.sin(a) * r];
}

/** 推進一隻寵物 dt 秒：走到目標就休息一下，再挑新目標。 */
export function stepWander(w: WanderState, dt: number, random: () => number): WanderState {
  if (w.rest > 0) {
    const rest = w.rest - dt;
    if (rest > 0) return { ...w, rest };
    const [tx, tz] = randomTarget(random);
    return { ...w, rest: 0, tx, tz };
  }
  const d = distance([w.x, w.z], [w.tx, w.tz]);
  const step = PET_SPEED * dt;
  if (d <= step) return { ...w, x: w.tx, z: w.tz, rest: 0.8 + random() * 2.2 };
  return { ...w, x: w.x + ((w.tx - w.x) / d) * step, z: w.z + ((w.tz - w.z) / d) * step };
}

/** 面向：往右走就朝右，供 sprite 水平翻轉用。 */
export function facing(w: WanderState): 1 | -1 {
  return w.tx >= w.x ? 1 : -1;
}
