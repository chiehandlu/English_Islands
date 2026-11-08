"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { buildingPlacement, ISLAND_CENTERS, ISLAND_ORDER } from "@/content/world";
import { flowIslands, getFlow } from "@/content/flows";
import type { IslandId } from "@/game/types";
import { farmCenter, farmRadius } from "@/scene/farm";
import { type Vec2, centroid } from "@/scene/layout";
import type { Selection } from "@/lib/selection";
import { useGameStore } from "@/store/gameStore";

/** 等角視角：相機永遠從目標點的這個方向看過去。 */
export const CAMERA_OFFSET = new Vector3(30, 34, 30);
const FLY_SECONDS = 1;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function bounds(points: Vec2[]) {
  const xs = points.map((p) => p[0]);
  const zs = points.map((p) => p[1]);
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...zs) - Math.min(...zs) };
}

/** 螢幕右方在地面上的方向（相機從 CAMERA_OFFSET 方向看過來）。 */
const SCREEN_RIGHT = new Vector3(1, 0, -1).normalize();

/** 依選取決定鏡頭目標點與縮放（全景 → 島 → 建築三層）。 */
function framing(
  selection: Selection,
  viewport: { width: number; height: number },
  farmExpanded: boolean,
) {
  const fit = (points: Vec2[], pad: number) => {
    const { w, h } = bounds(points);
    // 等角投影下地面寬度約為 x+z 的對角線
    const span = Math.max((w + h) * 0.75 + pad, pad);
    return {
      target: centroid(points),
      zoom: Math.min(viewport.width, viewport.height * 1.3) / span,
    };
  };
  if (selection?.kind === "building") {
    const placement = buildingPlacement(selection.id);
    if (placement) return { target: placement.position, zoom: 85 };
  }
  if (selection?.kind === "island" && selection.id in ISLAND_CENTERS) {
    return { target: ISLAND_CENTERS[selection.id as IslandId], zoom: 55 };
  }
  if (selection?.kind === "farm") {
    return { target: farmCenter(), zoom: farmExpanded ? 30 : 42 };
  }
  if (selection?.kind === "flow") {
    const flow = getFlow(selection.id);
    if (flow)
      return fit(
        flowIslands(flow).map((id) => ISLAND_CENTERS[id]),
        12,
      );
  }
  // 全景要把農場的整個圓都框進來，不只是中心點
  const [fx, fz] = farmCenter();
  const r = farmRadius(farmExpanded);
  return fit(
    [
      ...ISLAND_ORDER.map((id) => ISLAND_CENTERS[id]),
      [fx - r, fz],
      [fx + r, fz],
      [fx, fz - r],
      [fx, fz + r],
    ],
    8,
  );
}

interface Props {
  selection: Selection;
  /** 右側清單擋住的寬度（px），鏡頭會往左讓出空間 */
  rightInset: number;
  /** 左側詳情卡擋住的寬度（px），鏡頭會往右讓出空間 */
  leftInset: number;
}

export function CameraRig({ selection, rightInset, leftInset }: Props) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const anim = useRef<{
    fromTarget: Vector3;
    toTarget: Vector3;
    fromZoom: number;
    toZoom: number;
    t: number;
  } | null>(null);
  const farmExpanded = useGameStore((s) => s.farm.landExpanded);
  const key = selection ? `${selection.kind}:${selection.id}` : "all";

  useEffect(() => {
    if (!controls) return;
    const visible = { width: size.width - rightInset - leftInset, height: size.height - 100 };
    const { target, zoom } = framing(selection, visible, farmExpanded);
    // 讓目標落在「沒被兩側卡片擋住」區域的中央
    const toTarget = new Vector3(target[0], 0, target[1]).addScaledVector(
      SCREEN_RIGHT,
      (rightInset - leftInset) / 2 / zoom,
    );
    anim.current = {
      fromTarget: controls.target.clone(),
      toTarget,
      fromZoom: camera.zoom,
      toZoom: zoom,
      t: 0,
    };
    // 使用者開始拖曳時取消飛行動畫
    const cancel = () => (anim.current = null);
    controls.addEventListener("start", cancel);
    return () => controls.removeEventListener("start", cancel);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在選取或視窗大小改變時重新飛行
  }, [key, controls, size.width, size.height, rightInset, leftInset, farmExpanded]);

  useFrame((state, dt) => {
    const a = anim.current;
    const controls = state.controls as OrbitControlsImpl | null;
    const camera = state.camera;
    if (!a || !controls) return;
    a.t = Math.min(1, a.t + dt / FLY_SECONDS);
    const k = easeInOutCubic(a.t);
    controls.target.lerpVectors(a.fromTarget, a.toTarget, k);
    camera.position.copy(controls.target).add(CAMERA_OFFSET);
    camera.zoom = a.fromZoom + (a.toZoom - a.fromZoom) * k;
    camera.updateProjectionMatrix();
    controls.update();
    if (a.t >= 1) anim.current = null;
  });

  return null;
}
