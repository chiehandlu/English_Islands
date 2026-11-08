"use client";

import { useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import {
  BUILDING_PLACEMENTS,
  ISLAND_CENTERS,
  ISLAND_ORDER,
  ISLANDS,
  TREE_PLACEMENTS,
} from "@/content/world";
import { flowIslands, getFlow } from "@/content/flows";
import { islandStatus, starsOf, type IslandStatus } from "@/game/engine";
import type { GameState, IslandId, Stars } from "@/game/types";
import { ISLAND_TILES, TILE_SIZE, tileOffset } from "@/scene/layout";
import { type Selection, select } from "@/lib/selection";
import { useUiStore } from "@/store/uiStore";
import { ROOF_COLORS, SCENE_COLORS } from "./palette";

const BASE_HEIGHT = 0.3;
const TILE_HEIGHT = 0.4;
export const GROUND_Y = BASE_HEIGHT + TILE_HEIGHT;

interface Props {
  game: GameState;
  selection: Selection;
  showLabels: boolean;
  labelLayer: React.RefObject<HTMLDivElement>;
}

function selectedIslandId(selection: Selection): IslandId | undefined {
  if (selection?.kind === "island") return selection.id as IslandId;
  if (selection?.kind === "building") {
    return BUILDING_PLACEMENTS.find((p) => p.buildingId === selection.id)?.islandId;
  }
}

function grassColor(status: IslandStatus) {
  if (status === "current") return SCENE_COLORS.grassCurrent;
  return status === "locked" ? SCENE_COLORS.grassLocked : SCENE_COLORS.grass;
}

export function Islands({ game, selection, showLabels, labelLayer }: Props) {
  const focusIsland = selectedIslandId(selection);
  const flow = selection?.kind === "flow" ? getFlow(selection.id) : undefined;
  const litIslands = flow ? flowIslands(flow) : undefined;

  return (
    <group>
      {ISLANDS.map((island, index) => {
        const [x, z] = ISLAND_CENTERS[island.id];
        const status = islandStatus(game, index);
        const dimmed = litIslands !== undefined && !litIslands.includes(island.id);
        const focused = focusIsland === island.id;
        return (
          <group key={island.id} position={[x, 0, z]}>
            <mesh position={[0, BASE_HEIGHT / 2, 0]} rotation={[0, Math.PI / 6, 0]} receiveShadow>
              <cylinderGeometry args={[3.1, 3.3, BASE_HEIGHT, 6]} />
              <meshStandardMaterial
                color={SCENE_COLORS.sand}
                transparent
                opacity={dimmed ? 0.4 : 1}
              />
            </mesh>
            {ISLAND_TILES.map((_, t) => {
              const [ox, oz] = tileOffset(t);
              return (
                <mesh
                  key={t}
                  position={[ox, BASE_HEIGHT + TILE_HEIGHT / 2, oz]}
                  receiveShadow
                  castShadow
                  onClick={(e) => {
                    e.stopPropagation();
                    select({ kind: "island", id: island.id });
                  }}
                >
                  <cylinderGeometry args={[TILE_SIZE * 0.97, TILE_SIZE * 0.97, TILE_HEIGHT, 6]} />
                  <meshStandardMaterial
                    color={grassColor(status)}
                    transparent
                    opacity={dimmed ? 0.35 : 1}
                  />
                </mesh>
              );
            })}
            {/* Html 一律掛載、以 hidden 切換：drei Html 卸載時會在 React 19 拋 removeChild 錯誤 */}
            <Html position={[0, 2.4, 0]} center zIndexRange={[20, 0]} portal={labelLayer}>
              <button
                hidden={!showLabels}
                type="button"
                data-selected={focused}
                data-status={status}
                onClick={() => select({ kind: "island", id: island.id })}
                className="name-tag data-[status=locked]:opacity-60"
              >
                <span className="name-tag-number">{island.number}</span>
                {island.name}
              </button>
            </Html>
          </group>
        );
      })}

      {TREE_PLACEMENTS.map(({ islandId, position: [x, z] }, i) => (
        <mesh key={i} position={[x, GROUND_Y + 0.45, z]} castShadow>
          <sphereGeometry args={[0.38, 8, 6]} />
          <meshStandardMaterial
            color={SCENE_COLORS.tree}
            transparent
            opacity={litIslands && !litIslands.includes(islandId) ? 0.35 : 1}
          />
        </mesh>
      ))}

      {BUILDING_PLACEMENTS.map((placement, i) => {
        const islandIndex = ISLAND_ORDER.indexOf(placement.islandId);
        const island = ISLANDS[islandIndex];
        const building = island.buildings.find((b) => b.id === placement.buildingId)!;
        const status = islandStatus(game, islandIndex);
        const stars = starsOf(game, building.id);
        const isTask = status === "current" && stars === 0;
        const showLabel =
          showLabels && (focusIsland === placement.islandId || selection?.id === building.id);
        return (
          <Building
            key={building.id}
            position={placement.position}
            roof={ROOF_COLORS[i % ROOF_COLORS.length]}
            locked={status === "locked"}
            stars={stars}
            dimmed={litIslands !== undefined && !litIslands.includes(placement.islandId)}
            isTask={isTask}
            labelLayer={labelLayer}
            onSelect={() => select({ kind: "building", id: building.id })}
            label={
              <button
                hidden={!showLabel}
                type="button"
                data-selected={selection?.id === building.id}
                onClick={() => select({ kind: "building", id: building.id })}
                className="name-tag text-xs"
              >
                <span aria-hidden>{building.emoji}</span>
                {building.name}
                {stars > 0 && <span className="text-amber-400">{"★".repeat(stars)}</span>}
              </button>
            }
          />
        );
      })}
    </group>
  );
}

interface BuildingProps {
  position: [number, number];
  roof: string;
  locked: boolean;
  stars: Stars;
  dimmed: boolean;
  isTask: boolean;
  onSelect: () => void;
  label: React.ReactNode;
  labelLayer: React.RefObject<HTMLDivElement>;
}

function Building({
  labelLayer,
  position: [x, z],
  roof,
  locked,
  stars,
  dimmed,
  isTask,
  onSelect,
  label,
}: BuildingProps) {
  const opacity = dimmed ? 0.35 : 1;
  const lit = stars > 0 && !locked;
  const roofColor = locked ? SCENE_COLORS.grassLocked : lit ? roof : SCENE_COLORS.roofDark;
  return (
    <group
      position={[x, GROUND_Y, z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.8, 0.9]} />
        <meshStandardMaterial
          color={lit ? SCENE_COLORS.wall : SCENE_COLORS.wallDark}
          transparent
          opacity={opacity}
        />
      </mesh>
      {/* 窗戶：亮燈後發光 */}
      <mesh position={[0, 0.45, 0.46]}>
        <planeGeometry args={[0.3, 0.3]} />
        <meshStandardMaterial
          color={lit ? SCENE_COLORS.window : SCENE_COLORS.windowDark}
          emissive={lit ? SCENE_COLORS.window : "#000000"}
          emissiveIntensity={lit ? 0.9 : 0}
          transparent
          opacity={opacity}
        />
      </mesh>
      <mesh position={[0, 1.05, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.75, 0.5, 4]} />
        <meshStandardMaterial color={roofColor} transparent opacity={opacity} />
      </mesh>
      {stars === 3 && !locked && <StarMarker />}
      {isTask && <TaskMarker />}
      <Html position={[0, 1.9, 0]} center zIndexRange={[20, 0]} portal={labelLayer}>
        {label}
      </Html>
    </group>
  );
}

/** 三顆星：屋頂上慢慢轉的金色星星。 */
function StarMarker() {
  const ref = useRef<Mesh>(null);
  const paused = useUiStore((s) => s.paused);
  useFrame((_, dt) => {
    if (ref.current && !paused) ref.current.rotation.y += dt * 1.5;
  });
  return (
    <mesh ref={ref} position={[0, 1.55, 0]}>
      <octahedronGeometry args={[0.18, 0]} />
      <meshStandardMaterial
        color={SCENE_COLORS.star}
        emissive={SCENE_COLORS.star}
        emissiveIntensity={0.6}
      />
    </mesh>
  );
}

/** 還沒亮燈的建築：上方上下浮動的橙色標記。 */
function TaskMarker() {
  const ref = useRef<Mesh>(null);
  const paused = useUiStore((s) => s.paused);
  useFrame(({ clock }) => {
    if (ref.current && !paused)
      ref.current.position.y = 1.7 + Math.sin(clock.elapsedTime * 3) * 0.1;
  });
  return (
    <mesh ref={ref} position={[0, 1.7, 0]} rotation={[Math.PI, 0, 0]}>
      <coneGeometry args={[0.18, 0.35, 8]} />
      <meshStandardMaterial
        color={SCENE_COLORS.accent}
        emissive={SCENE_COLORS.accent}
        emissiveIntensity={0.4}
      />
    </mesh>
  );
}
