"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { type AmbientLight, BufferAttribute, type BufferGeometry, CanvasTexture } from "three";
import { ISLAND_CENTERS } from "@/content/world";
import { rng } from "@/game/quiz";
import type { WeatherId } from "@/game/types";
import { farmCenter, farmRadius } from "@/scene/farm";
import { WEATHER_LOOKS, drift, fall, flashAt, weatherBox } from "@/scene/weather";

interface Props {
  weather: WeatherId;
  paused: boolean;
}

/** 整個群島上空的雨、雪與閃電。晴天什麼都不畫。 */
export function Weather({ weather, paused }: Props) {
  const look = WEATHER_LOOKS[weather];
  if (!look.particles) return null;
  // key：換天氣時重新建立粒子
  return <Precipitation key={weather} weather={weather} paused={paused} />;
}

/** 一次建好所有雨滴／雪花的起始位置（x、y、z）與畫用的頂點。 */
function createBuffers(count: number, rain: boolean, box: ReturnType<typeof weatherBox>) {
  const random = rng(count * 31 + (rain ? 7 : 3));
  const seeds = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    seeds[i * 3] = box.minX + random() * (box.maxX - box.minX);
    seeds[i * 3 + 1] = box.bottom + random() * (box.top - box.bottom);
    seeds[i * 3 + 2] = box.minZ + random() * (box.maxZ - box.minZ);
  }
  // 雨：每滴兩個點畫成短線；雪：每片一個點
  const positions = new BufferAttribute(new Float32Array(count * (rain ? 2 : 1) * 3), 3);
  return { seeds, positions };
}

/** 雪花用的圓點貼圖（邊緣柔和）。 */
function dotTexture(): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.6, "rgba(255,255,255,0.9)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

function sceneBox() {
  const [fx, fz] = farmCenter();
  const r = farmRadius(true);
  return weatherBox([...Object.values(ISLAND_CENTERS), [fx - r, fz - r], [fx + r, fz + r]]);
}

function Precipitation({ weather, paused }: Props) {
  const look = WEATHER_LOOKS[weather];
  const rain = look.particles === "rain";
  // 換天氣時外層用 key 重建，所以這裡只在掛載時建一次
  const [{ seeds, positions, box, dot }] = useState(() => {
    const box = sceneBox();
    return { ...createBuffers(look.count, rain, box), box, dot: rain ? null : dotTexture() };
  });
  const geometry = useRef<BufferGeometry>(null);
  const flash = useRef<AmbientLight>(null);

  useFrame(({ clock }, dt) => {
    const g = geometry.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const step = paused ? 0 : Math.min(dt, 0.1);
    const start = g.userData.seeds as Float32Array;
    const attr = g.getAttribute("position") as BufferAttribute;
    const out = attr.array as Float32Array;
    const per = rain ? 6 : 3;
    for (let i = 0; i < look.count; i++) {
      const y = fall(start[i * 3 + 1], look.fallSpeed, step, box);
      start[i * 3 + 1] = y;
      const x = start[i * 3] + (rain ? 0 : drift(t, i));
      const z = start[i * 3 + 2];
      const o = i * per;
      out[o] = x;
      out[o + 1] = y;
      out[o + 2] = z;
      if (rain) {
        out[o + 3] = x + 0.08;
        out[o + 4] = y + 0.7;
        out[o + 5] = z + 0.08;
      }
    }
    attr.needsUpdate = true;
    // 暫停（或系統設定減少動態效果）時不閃
    if (flash.current) flash.current.intensity = look.flash && !paused ? flashAt(t) * 1.6 : 0;
  });

  const geo = (
    <bufferGeometry ref={geometry} attributes={{ position: positions }} userData={{ seeds }} />
  );
  return (
    <>
      {rain ? (
        <lineSegments frustumCulled={false}>
          {geo}
          <lineBasicMaterial color="#dbe8f5" transparent opacity={0.55} />
        </lineSegments>
      ) : (
        <points frustumCulled={false}>
          {geo}
          <pointsMaterial
            color="#ffffff"
            map={dot}
            size={6}
            sizeAttenuation={false}
            transparent
            depthWrite={false}
          />
        </points>
      )}
      {look.flash && <ambientLight ref={flash} color="#e8eeff" intensity={0} />}
    </>
  );
}
