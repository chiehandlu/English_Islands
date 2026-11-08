import type { WeatherId } from "@/game/types";
import type { Vec2 } from "./layout";
import { lerpColor } from "./lighting";

/**
 * 天氣的樣子：天色、太陽亮度、落下的東西、閃電。全部是純函式，元件只照著畫。
 * 打雷只是天空偶爾亮一下（一秒內不超過兩次），不做大聲或刺眼的效果。
 */
export interface WeatherLook {
  /** 天空往哪個顏色靠、靠多少（0 不變） */
  skyTint: string;
  skyMix: number;
  /** 太陽亮度倍率 */
  sunScale: number;
  particles: "rain" | "snow" | null;
  /** 落下的東西數量 */
  count: number;
  /** 每秒落下多少單位 */
  fallSpeed: number;
  flash: boolean;
}

export const WEATHER_LOOKS: Record<WeatherId, WeatherLook> = {
  sunny: {
    skyTint: "#ffffff",
    skyMix: 0,
    sunScale: 1,
    particles: null,
    count: 0,
    fallSpeed: 0,
    flash: false,
  },
  rain: {
    skyTint: "#7d8a96",
    skyMix: 0.45,
    sunScale: 0.6,
    particles: "rain",
    count: 900,
    fallSpeed: 18,
    flash: false,
  },
  snow: {
    skyTint: "#dfe7ee",
    skyMix: 0.5,
    sunScale: 0.8,
    particles: "snow",
    count: 700,
    fallSpeed: 1.6,
    flash: false,
  },
  thunder: {
    skyTint: "#4b5563",
    skyMix: 0.6,
    sunScale: 0.45,
    particles: "rain",
    count: 1100,
    fallSpeed: 22,
    flash: true,
  },
};

export function weatherSky(sky: string, weather: WeatherId): string {
  const look = WEATHER_LOOKS[weather];
  return look.skyMix > 0 ? lerpColor(sky, look.skyTint, look.skyMix) : sky;
}

export interface WeatherBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  top: number;
  bottom: number;
}

/** 把群島（含農場）框起來，四周多留 pad，落下的東西只在這個盒子裡。 */
export function weatherBox(points: Vec2[], pad = 10, top = 22): WeatherBox {
  const xs = points.map((p) => p[0]);
  const zs = points.map((p) => p[1]);
  return {
    minX: Math.min(...xs) - pad,
    maxX: Math.max(...xs) + pad,
    minZ: Math.min(...zs) - pad,
    maxZ: Math.max(...zs) + pad,
    top,
    bottom: 0,
  };
}

/** 往下掉 dt 秒；掉到海面就回到最上面。 */
export function fall(y: number, speed: number, dt: number, box: WeatherBox): number {
  const next = y - speed * dt;
  const height = box.top - box.bottom;
  return next < box.bottom ? next + height : next;
}

/** 雪會左右輕輕飄。 */
export function drift(t: number, seed: number): number {
  return Math.sin(t * 0.8 + seed * 12.9898) * 0.35;
}

/** 閃電週期：每 FLASH_PERIOD 秒亮一下（兩次快速閃），其他時間是 0。 */
export const FLASH_PERIOD = 7;

export function flashAt(t: number): number {
  const phase = ((t % FLASH_PERIOD) + FLASH_PERIOD) % FLASH_PERIOD;
  if (phase < 0.12) return 1;
  if (phase < 0.3) return 0;
  if (phase < 0.4) return 0.6;
  return 0;
}
