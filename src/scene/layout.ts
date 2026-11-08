import type { Island } from "@/game/types";

export type Vec2 = [x: number, z: number];

/** 島與島之間的六角格尺寸（世界單位）。 */
export const ISLAND_GRID_SIZE = 4;
/** 單座島內六角地塊的尺寸。 */
export const TILE_SIZE = 1;

/** pointy 朝向的軸向座標轉世界座標。 */
export function axialToWorld([q, r]: [number, number], size: number): Vec2 {
  return [size * Math.sqrt(3) * (q + r / 2), size * 1.5 * r];
}

export function islandCenter(island: Pick<Island, "axial">): Vec2 {
  return axialToWorld(island.axial, ISLAND_GRID_SIZE);
}

/** 島上的地塊：中心一塊＋外圈六塊。 */
export const ISLAND_TILES: [number, number][] = [
  [0, 0],
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
  [1, -1],
];

export function tileOffset(index: number): Vec2 {
  return axialToWorld(ISLAND_TILES[index % ISLAND_TILES.length], TILE_SIZE);
}

/**
 * 外圈地塊中，沒有朝向相鄰島（橋與小人路線經過）的那些。
 * 建築依序放在這些地塊上，剩下的種樹。
 */
export function freeSlots(
  island: Pick<Island, "axial">,
  neighbors: Pick<Island, "axial">[],
): number[] {
  const [q, r] = island.axial;
  const blocked = neighbors.map(({ axial: [nq, nr] }) =>
    ISLAND_TILES.findIndex(([tq, tr]) => tq === nq - q && tr === nr - r),
  );
  return [2, 5, 1, 4, 3, 6].filter((slot) => !blocked.includes(slot));
}

export function slotPosition(island: Pick<Island, "axial">, slot: number): Vec2 {
  const [cx, cz] = islandCenter(island);
  const [ox, oz] = tileOffset(slot);
  return [cx + ox, cz + oz];
}

export function distance([ax, az]: Vec2, [bx, bz]: Vec2): number {
  return Math.hypot(bx - ax, bz - az);
}

export function centroid(points: Vec2[]): Vec2 {
  const sum = points.reduce<Vec2>(([x, z], [px, pz]) => [x + px, z + pz], [0, 0]);
  return [sum[0] / points.length, sum[1] / points.length];
}
