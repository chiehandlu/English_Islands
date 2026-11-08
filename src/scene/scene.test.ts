import { FLASH_PERIOD, fall, flashAt, weatherBox, weatherSky } from "./weather";
import { describe, expect, it } from "vitest";
import { ISLANDS } from "@/content/islands";
import { FLOWS } from "@/content/flows";
import { ISLAND_CENTERS, ISLAND_ORDER } from "@/content/world";
import { ISLAND_GRID_SIZE, axialToWorld, distance, freeSlots } from "./layout";
import { lerpColor, lightingAt } from "./lighting";
import {
  HANDOFF_SECONDS,
  buildRoutes,
  createWalkers,
  isCarrying,
  positionOnRoute,
  stepWalker,
} from "./walkers";

describe("layout", () => {
  it("converts axial coordinates (pointy orientation)", () => {
    expect(axialToWorld([0, 0], 1)).toEqual([0, 0]);
    const [x, z] = axialToWorld([0, 1], 2);
    expect(x).toBeCloseTo(Math.sqrt(3));
    expect(z).toBeCloseTo(3);
  });

  it("keeps islands inside a unit adjacent and the gap between units short", () => {
    const step = ISLAND_GRID_SIZE * Math.sqrt(3);
    for (let i = 1; i < ISLAND_ORDER.length; i++) {
      const a = ISLANDS[i - 1];
      const b = ISLANDS[i];
      const d = distance(ISLAND_CENTERS[a.id], ISLAND_CENTERS[b.id]);
      if (a.unitId === b.unitId) expect(d, b.id).toBeCloseTo(step);
      else expect(d, b.id).toBeLessThanOrEqual(step * 2 + 0.01);
    }
  });

  it("keeps building slots off the walking paths and leaves room for every building", () => {
    ISLANDS.forEach((island, i) => {
      const neighbors = [ISLANDS[i - 1], ISLANDS[i + 1]].filter(Boolean);
      const slots = freeSlots(island, neighbors);
      expect(slots.length).toBeGreaterThanOrEqual(4);
      expect(slots.length).toBeGreaterThanOrEqual(island.buildings.length);
    });
  });
});

describe("walkers", () => {
  const routes = buildRoutes(FLOWS, ISLAND_ORDER, ISLAND_CENTERS);

  it("builds one route per from×to pair, passing through intermediate islands", () => {
    const pairs = FLOWS.reduce((n, f) => n + f.from.length * f.to.length, 0);
    expect(routes).toHaveLength(pairs);
    for (const route of routes) {
      const span = Math.abs(ISLAND_ORDER.indexOf(route.to) - ISLAND_ORDER.indexOf(route.from));
      expect(route.waypoints).toHaveLength(span + 1);
    }
  });

  it("walks to the end, hands off, then departs back", () => {
    const route = routes[0];
    let [w] = createWalkers([route], 1);
    w = { ...w, progress: 0.99, direction: 1 };
    const arrived = stepWalker(w, route, 10);
    expect(arrived.event?.type).toBe("arrive");
    expect(arrived.state.phase).toBe("handoff");
    expect(isCarrying(arrived.state, route)).toBe(false);

    const departed = stepWalker(arrived.state, route, HANDOFF_SECONDS + 0.01);
    expect(departed.event?.type).toBe("depart");
    expect(departed.state.direction).toBe(-1);
  });

  it("interpolates positions along the route", () => {
    const route = routes[0];
    expect(positionOnRoute(route, 0)).toEqual(route.waypoints[0]);
    expect(positionOnRoute(route, 1)).toEqual(route.waypoints[route.waypoints.length - 1]);
  });
});

describe("lighting", () => {
  it("interpolates colours", () => {
    expect(lerpColor("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("is darker at night than at noon", () => {
    expect(lightingAt(22).sunIntensity).toBeLessThan(lightingAt(14).sunIntensity);
  });
});

describe("weather", () => {
  const box = weatherBox(
    [
      [0, 0],
      [10, 4],
    ],
    2,
    20,
  );

  it("frames the islands with padding", () => {
    expect(box).toEqual({ minX: -2, maxX: 12, minZ: -2, maxZ: 6, top: 20, bottom: 0 });
  });

  it("falls and wraps back to the top", () => {
    expect(fall(10, 5, 1, box)).toBe(5);
    expect(fall(1, 5, 1, box)).toBe(16);
  });

  it("flashes briefly once per period and stays dark otherwise", () => {
    expect(flashAt(0.05)).toBe(1);
    expect(flashAt(0.2)).toBe(0);
    expect(flashAt(3)).toBe(0);
    expect(flashAt(FLASH_PERIOD + 0.05)).toBe(1);
  });

  it("keeps the sky unchanged on sunny days and tints it otherwise", () => {
    expect(weatherSky("#88ccee", "sunny")).toBe("#88ccee");
    expect(weatherSky("#88ccee", "thunder")).not.toBe("#88ccee");
  });
});
