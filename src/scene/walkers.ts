import type { CarryKind, Flow, IslandId, WalkerKind } from "@/game/types";
import { type Vec2, distance } from "./layout";

/** 小人走的路線：沿著人生航道，經過起點到終點之間的每座島。 */
export interface WalkerRoute {
  flowId: string;
  walker: WalkerKind;
  carry: CarryKind;
  bidirectional: boolean;
  from: IslandId;
  to: IslandId;
  waypoints: Vec2[];
  length: number;
}

export type WalkerPhase = "walking" | "handoff";

export interface WalkerState {
  routeIndex: number;
  phase: WalkerPhase;
  /** 沿路線的進度 0–1 */
  progress: number;
  /** 1 = 往終點，-1 = 往起點 */
  direction: 1 | -1;
  /** 交接剩餘秒數 */
  wait: number;
}

export type WalkerEventType = "depart" | "arrive";

export interface WalkerEvent {
  type: WalkerEventType;
  routeIndex: number;
}

export const WALK_SPEED = 1.6; // 世界單位／秒
export const HANDOFF_SECONDS = 1.5;

export function pathLength(points: Vec2[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i]);
  return total;
}

/**
 * 依協作線建立路線。islandOrder 是島在人生航道上的順序，
 * centers 是各島中心；路線會依序經過中間的島（走橋，不走水）。
 */
export function buildRoutes(
  flows: Flow[],
  islandOrder: IslandId[],
  centers: Record<IslandId, Vec2>,
): WalkerRoute[] {
  const routes: WalkerRoute[] = [];
  for (const flow of flows) {
    for (const from of flow.from) {
      for (const to of flow.to) {
        const a = islandOrder.indexOf(from);
        const b = islandOrder.indexOf(to);
        if (a < 0 || b < 0 || a === b) continue;
        const step = a < b ? 1 : -1;
        const waypoints: Vec2[] = [];
        for (let i = a; i !== b + step; i += step) waypoints.push(centers[islandOrder[i]]);
        routes.push({
          flowId: flow.id,
          walker: flow.walker,
          carry: flow.carry,
          bidirectional: flow.bidirectional,
          from,
          to,
          waypoints,
          length: pathLength(waypoints),
        });
      }
    }
  }
  return routes;
}

export function createWalkers(routes: WalkerRoute[], perRoute: number): WalkerState[] {
  const walkers: WalkerState[] = [];
  routes.forEach((_, routeIndex) => {
    for (let i = 0; i < perRoute; i++) {
      walkers.push({
        routeIndex,
        phase: "walking",
        progress: (i + 0.5) / perRoute,
        direction: i % 2 === 0 ? 1 : -1,
        wait: 0,
      });
    }
  });
  return walkers;
}

/** 推進一個小人 dt 秒；狀態切換時回傳事件，供城市日誌使用。 */
export function stepWalker(
  state: WalkerState,
  route: WalkerRoute,
  dt: number,
): { state: WalkerState; event?: WalkerEvent } {
  if (state.phase === "handoff") {
    const wait = state.wait - dt;
    if (wait > 0) return { state: { ...state, wait } };
    return {
      state: { ...state, phase: "walking", wait: 0, direction: state.direction === 1 ? -1 : 1 },
      event: { type: "depart", routeIndex: state.routeIndex },
    };
  }
  const delta = route.length > 0 ? (WALK_SPEED * dt) / route.length : 1;
  const progress = state.progress + delta * state.direction;
  if (progress >= 1 || progress <= 0) {
    return {
      state: {
        ...state,
        phase: "handoff",
        progress: progress >= 1 ? 1 : 0,
        wait: HANDOFF_SECONDS,
      },
      event: { type: "arrive", routeIndex: state.routeIndex },
    };
  }
  return { state: { ...state, progress } };
}

/** 小人是否頂著道具：往終點走時搬運，雙向線則來回都搬。 */
export function isCarrying(state: WalkerState, route: WalkerRoute): boolean {
  return state.phase === "walking" && (state.direction === 1 || route.bidirectional);
}

export function positionOnRoute(route: WalkerRoute, progress: number): Vec2 {
  const { waypoints, length } = route;
  if (waypoints.length === 1 || length === 0) return waypoints[0];
  let remaining = Math.min(1, Math.max(0, progress)) * length;
  for (let i = 1; i < waypoints.length; i++) {
    const seg = distance(waypoints[i - 1], waypoints[i]);
    if (remaining <= seg) {
      const t = seg === 0 ? 0 : remaining / seg;
      const [ax, az] = waypoints[i - 1];
      const [bx, bz] = waypoints[i];
      return [ax + (bx - ax) * t, az + (bz - az) * t];
    }
    remaining -= seg;
  }
  return waypoints[waypoints.length - 1];
}
