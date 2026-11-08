"use client";

import { useRef, useSyncExternalStore } from "react";
import { MapControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { completionRatio } from "@/game/engine";
import { dayHour } from "@/game/dayClock";
import { lerpColor, lightingAt } from "@/scene/lighting";
import { select, useSelection } from "@/lib/selection";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { Bridges } from "./Bridges";
import { CAMERA_OFFSET, CameraRig } from "./CameraRig";
import { FarmIsland } from "./FarmIsland";
import { FlowArcs } from "./FlowArcs";
import { Islands } from "./Islands";
import { Walkers } from "./Walkers";
import { SCENE_COLORS } from "./palette";

const MD_BREAKPOINT = 768;

function subscribeResize(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}

function useViewportWidth(): number {
  return useSyncExternalStore(
    subscribeResize,
    () => window.innerWidth,
    () => 0,
  );
}

/** 桌機版右側清單的寬度（與 IndexPanel 的 md:w-[min(26rem,33vw)] 一致）。 */
function rightInsetFor(width: number, panelOpen: boolean): number {
  if (!panelOpen || width < MD_BREAKPOINT) return 0;
  return Math.min(26 * 16, width * 0.33) + 12;
}

/** 桌機版左側詳情卡的寬度（與 DetailCard 的 w-[min(24rem,…)] 一致）；手機版卡片在底部，不佔寬度。 */
function leftInsetFor(width: number, hasSelection: boolean): number {
  if (!hasSelection || width < MD_BREAKPOINT) return 0;
  return Math.min(24 * 16, width - 24) + 12;
}

/** 3D 世界（只在瀏覽器載入，見 WorldView 的 dynamic import）。 */
export default function World() {
  const selection = useSelection();
  const game = useGameStore();
  const { showLabels, showCarry, showFlows, paused, panelOpen } = useUiStore();
  const width = useViewportWidth();
  const rightInset = rightInsetFor(width, panelOpen);
  const leftInset = leftInsetFor(width, selection !== null);
  const light = lightingAt(dayHour(completionRatio(game)));
  const sunDistance = 40;
  // 名牌（drei Html）掛在自己管理的圖層：預設掛在 Canvas 父層，離開頁面時會拋 removeChild 錯誤
  const labelLayer = useRef<HTMLDivElement>(null!);

  return (
    <div className="absolute inset-0">
      <Canvas
        orthographic
        flat
        shadows
        dpr={[1, 2]}
        camera={{ position: CAMERA_OFFSET.toArray(), zoom: 30, near: 0.1, far: 500 }}
        onPointerMissed={() => select(null)}
      >
        <color attach="background" args={[light.sky]} />
        {/* 環境光只帶一點天色，避免整個場景被染色 */}
        <hemisphereLight
          args={[lerpColor("#ffffff", light.sky, 0.3), SCENE_COLORS.sand, light.ambient]}
        />
        <directionalLight
          castShadow
          color={light.sun}
          intensity={light.sunIntensity}
          position={[
            -sunDistance * Math.cos(light.elevation),
            sunDistance * Math.sin(light.elevation),
            sunDistance * 0.4,
          ]}
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[400, 400]} />
          <meshStandardMaterial color={SCENE_COLORS.sea} />
        </mesh>
        <Bridges />
        <Islands
          game={game}
          selection={selection}
          showLabels={showLabels}
          labelLayer={labelLayer}
        />
        <FarmIsland selection={selection} showLabels={showLabels} labelLayer={labelLayer} />
        {showFlows && <FlowArcs selection={selection} />}
        <Walkers selection={selection} paused={paused} showCarry={showCarry} />
        <MapControls makeDefault enableRotate={false} minZoom={12} maxZoom={180} />
        <CameraRig selection={selection} rightInset={rightInset} leftInset={leftInset} />
      </Canvas>
      <div
        ref={labelLayer}
        className="pointer-events-none absolute inset-0 overflow-hidden [&_button]:pointer-events-auto"
      />
    </div>
  );
}
