/** 依人生時鐘的小時數，內插出天空與燈光參數。 */
export interface Lighting {
  sky: string;
  sun: string;
  sunIntensity: number;
  ambient: number;
  /** 太陽仰角（弧度），夜晚時為月光角度 */
  elevation: number;
}

const KEYFRAMES: { hour: number; light: Lighting }[] = [
  {
    hour: 5.5,
    light: { sky: "#f6c9a8", sun: "#ffd9b8", sunIntensity: 2.2, ambient: 1.3, elevation: 0.45 },
  },
  {
    hour: 9,
    light: { sky: "#bfe3ee", sun: "#fff8ec", sunIntensity: 2.8, ambient: 1.6, elevation: 0.9 },
  },
  {
    hour: 14,
    light: { sky: "#a9dbe9", sun: "#ffffff", sunIntensity: 3, ambient: 1.7, elevation: 1.1 },
  },
  {
    hour: 18,
    light: { sky: "#f0a27a", sun: "#ffc09a", sunIntensity: 2.2, ambient: 1.2, elevation: 0.4 },
  },
  {
    hour: 22,
    light: { sky: "#1f2a44", sun: "#b4c2ff", sunIntensity: 0.9, ambient: 0.6, elevation: 0.8 },
  },
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function lightingAt(hour: number): Lighting {
  const first = KEYFRAMES[0];
  const last = KEYFRAMES[KEYFRAMES.length - 1];
  if (hour <= first.hour) return first.light;
  if (hour >= last.hour) return last.light;
  const i = KEYFRAMES.findIndex((k) => k.hour > hour);
  const a = KEYFRAMES[i - 1];
  const b = KEYFRAMES[i];
  const t = (hour - a.hour) / (b.hour - a.hour);
  return {
    sky: lerpColor(a.light.sky, b.light.sky, t),
    sun: lerpColor(a.light.sun, b.light.sun, t),
    sunIntensity: lerp(a.light.sunIntensity, b.light.sunIntensity, t),
    ambient: lerp(a.light.ambient, b.light.ambient, t),
    elevation: lerp(a.light.elevation, b.light.elevation, t),
  };
}
