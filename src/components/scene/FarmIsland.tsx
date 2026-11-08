"use client";

import { useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, type Group, type Mesh, SRGBColorSpace, type Sprite } from "three";
import { getDecorKind, getPetKind } from "@/content/farm";
import { petStage } from "@/game/farm";
import { rng } from "@/game/quiz";
import type { OwnedPet, PlacedDecor } from "@/game/types";
import {
  FARM_RADIUS,
  FARM_TILES,
  type WanderState,
  createWander,
  decorSlotOffset,
  facing,
  farmCenter,
  petSlotOffset,
  stepWander,
} from "@/scene/farm";
import { TILE_SIZE, axialToWorld } from "@/scene/layout";
import { type Selection, select } from "@/lib/selection";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { GROUND_Y } from "./Islands";
import { SCENE_COLORS } from "./palette";

const BASE_HEIGHT = 0.3;
const TILE_HEIGHT = 0.4;

interface Props {
  selection: Selection;
  showLabels: boolean;
  labelLayer: React.RefObject<HTMLDivElement>;
}

/** 農場島：19 格、穀倉、會走的寵物、裝飾。 */
export function FarmIsland({ selection, showLabels, labelLayer }: Props) {
  const farm = useGameStore((s) => s.farm);
  const [cx, cz] = farmCenter();
  const focused = selection?.kind === "farm";
  const open = () => select({ kind: "farm", id: "farm" });

  return (
    <group position={[cx, 0, cz]}>
      <mesh position={[0, BASE_HEIGHT / 2, 0]} rotation={[0, Math.PI / 6, 0]} receiveShadow>
        <cylinderGeometry args={[FARM_RADIUS, FARM_RADIUS + 0.25, BASE_HEIGHT, 6]} />
        <meshStandardMaterial color={SCENE_COLORS.sand} />
      </mesh>
      {FARM_TILES.map((tile, t) => {
        const [ox, oz] = axialToWorld(tile, TILE_SIZE);
        return (
          <mesh
            key={t}
            position={[ox, BASE_HEIGHT + TILE_HEIGHT / 2, oz]}
            receiveShadow
            castShadow
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
          >
            <cylinderGeometry args={[TILE_SIZE * 0.97, TILE_SIZE * 0.97, TILE_HEIGHT, 6]} />
            <meshStandardMaterial
              color={t === 0 ? SCENE_COLORS.farmYard : SCENE_COLORS.farmGrass}
            />
          </mesh>
        );
      })}

      <Barn onSelect={open} />

      {farm.decor
        .filter((d): d is PlacedDecor & { slot: number } => d.slot !== null)
        .map((d) => (
          <Decor key={d.id} decor={d} />
        ))}

      {farm.pets
        .filter((p): p is OwnedPet & { slot: number } => p.slot !== null)
        .map((p) => (
          <Pet key={p.id} pet={p} showLabel={showLabels && focused} labelLayer={labelLayer} />
        ))}

      <Html position={[0, 3.6, 0]} center zIndexRange={[20, 0]} portal={labelLayer}>
        <button
          hidden={!showLabels}
          type="button"
          data-selected={focused}
          onClick={open}
          className="name-tag"
        >
          <span aria-hidden>🐔</span>
          農場
        </button>
      </Html>
    </group>
  );
}

function Barn({ onSelect }: { onSelect: () => void }) {
  return (
    <group
      position={[0, GROUND_Y, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 1.2, 1.3]} />
        <meshStandardMaterial color={SCENE_COLORS.barn} />
      </mesh>
      <mesh position={[0, 1.45, 0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[1.7, 0.5, 1.5]} />
        <meshStandardMaterial color={SCENE_COLORS.barnRoof} />
      </mesh>
      <mesh position={[0, 1.9, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.95, 0.5, 4]} />
        <meshStandardMaterial color={SCENE_COLORS.barnRoof} />
      </mesh>
      {/* 門 */}
      <mesh position={[0, 0.4, 0.66]}>
        <planeGeometry args={[0.5, 0.8]} />
        <meshStandardMaterial color={SCENE_COLORS.wallDark} />
      </mesh>
    </group>
  );
}

// ---------- 寵物：emoji 立牌 ----------

const textureCache = new Map<string, CanvasTexture>();

function emojiTexture(emoji: string): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const cached = textureCache.get(emoji);
  if (cached) return cached;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.font = `${size * 0.78}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.04);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  textureCache.set(emoji, texture);
  return texture;
}

const STAGE_SCALE = { baby: 0.6, teen: 0.8, adult: 1 } as const;

function Pet({
  pet,
  showLabel,
  labelLayer,
}: {
  pet: OwnedPet & { slot: number };
  showLabel: boolean;
  labelLayer: React.RefObject<HTMLDivElement>;
}) {
  const kind = getPetKind(pet.kind);
  const texture = useMemo(() => (kind ? emojiTexture(kind.emoji) : null), [kind]);
  const [sx, sz] = petSlotOffset(pet.slot);
  const random = useMemo(() => rng(pet.id.length * 977 + pet.slot), [pet.id, pet.slot]);
  const wander = useRef<WanderState>(createWander(random));
  const group = useRef<Group>(null);
  const sprite = useRef<Sprite>(null);
  const paused = useUiStore((s) => s.paused);
  const bellAt = useUiStore((s) => s.bellAt);
  const stage = petStage(pet.growth);
  const scale = STAGE_SCALE[stage];

  useFrame(({ clock }, dt) => {
    if (!group.current) return;
    if (!paused) wander.current = stepWander(wander.current, Math.min(dt, 0.1), random);
    const w = wander.current;
    const t = clock.elapsedTime;
    const walking = w.rest <= 0;
    const sinceBell = performance.now() - bellAt;
    const jump = sinceBell < 600 ? Math.sin((sinceBell / 600) * Math.PI) * 0.6 : 0;
    const bob = walking ? Math.abs(Math.sin(t * 8)) * 0.08 : 0;
    group.current.position.set(sx + w.x, GROUND_Y + scale * 0.45 + bob + jump, sz + w.z);
    if (sprite.current) sprite.current.scale.set(scale * 0.9 * facing(w), scale * 0.9, 1);
  });

  if (!kind || !texture) return null;
  return (
    <group ref={group} position={[sx, GROUND_Y + scale * 0.45, sz]}>
      <sprite
        ref={sprite}
        scale={[scale * 0.9, scale * 0.9, 1]}
        onClick={(e) => {
          e.stopPropagation();
          select({ kind: "farm", id: "farm" });
        }}
      >
        <spriteMaterial map={texture} transparent depthWrite={false} />
      </sprite>
      {/* 影子 */}
      <mesh position={[0, -scale * 0.43, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[scale * 0.28, 12]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.18} />
      </mesh>
      {stage === "adult" && <AdultStar />}
      <Html position={[0, scale * 0.75, 0]} center zIndexRange={[20, 0]} portal={labelLayer}>
        <span
          hidden={!showLabel}
          className="name-tag pointer-events-none py-0.5 pr-2 pl-2 text-[11px]"
        >
          {pet.name}
        </span>
      </Html>
    </group>
  );
}

function AdultStar() {
  const ref = useRef<Mesh>(null);
  const paused = useUiStore((s) => s.paused);
  useFrame((_, dt) => {
    if (ref.current && !paused) ref.current.rotation.y += dt * 1.5;
  });
  return (
    <mesh ref={ref} position={[0, 0.75, 0]}>
      <octahedronGeometry args={[0.1, 0]} />
      <meshStandardMaterial
        color={SCENE_COLORS.star}
        emissive={SCENE_COLORS.star}
        emissiveIntensity={0.6}
      />
    </mesh>
  );
}

// ---------- 裝飾：簡單幾何 ----------

function Decor({ decor }: { decor: PlacedDecor & { slot: number } }) {
  const kind = getDecorKind(decor.kind);
  const [x, z] = decorSlotOffset(decor.slot);
  const ringBell = useUiStore((s) => s.ringBell);
  if (!kind) return null;
  const onClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (kind.effect === "bell") ringBell();
    else select({ kind: "farm", id: "farm" });
  };
  return (
    <group position={[x, GROUND_Y, z]} onClick={onClick}>
      <DecorShape id={kind.id} />
    </group>
  );
}

function DecorShape({ id }: { id: string }) {
  const wood = SCENE_COLORS.bridge;
  switch (id) {
    case "flag":
      return (
        <>
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
            <meshStandardMaterial color={wood} />
          </mesh>
          <mesh position={[0.2, 1.0, 0]} castShadow>
            <boxGeometry args={[0.4, 0.25, 0.02]} />
            <meshStandardMaterial color={SCENE_COLORS.accent} />
          </mesh>
        </>
      );
    case "fence":
      return (
        <>
          {[-0.5, 0, 0.5].map((x) => (
            <mesh key={x} position={[x, 0.3, 0]} castShadow>
              <boxGeometry args={[0.1, 0.6, 0.1]} />
              <meshStandardMaterial color={wood} />
            </mesh>
          ))}
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[1.2, 0.08, 0.06]} />
            <meshStandardMaterial color={wood} />
          </mesh>
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[1.2, 0.08, 0.06]} />
            <meshStandardMaterial color={wood} />
          </mesh>
        </>
      );
    case "flowers":
      return (
        <>
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <cylinderGeometry args={[0.6, 0.6, 0.1, 6]} />
            <meshStandardMaterial color={SCENE_COLORS.soil} />
          </mesh>
          {[
            [0.25, "#e76f51"],
            [-0.25, "#f4a261"],
            [0, "#e9c46a"],
          ].map(([x, c], i) => (
            <mesh key={i} position={[x as number, 0.3, i === 2 ? -0.25 : 0.15]} castShadow>
              <sphereGeometry args={[0.14, 8, 6]} />
              <meshStandardMaterial color={c as string} />
            </mesh>
          ))}
        </>
      );
    case "path":
      return (
        <mesh position={[0, 0.03, 0]} receiveShadow>
          <boxGeometry args={[1.2, 0.06, 0.5]} />
          <meshStandardMaterial color={SCENE_COLORS.stone} />
        </mesh>
      );
    case "tree":
      return (
        <>
          <mesh position={[0, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.16, 0.8, 6]} />
            <meshStandardMaterial color={SCENE_COLORS.trunk} />
          </mesh>
          <mesh position={[0, 1.1, 0]} castShadow>
            <sphereGeometry args={[0.6, 10, 8]} />
            <meshStandardMaterial color={SCENE_COLORS.tree} />
          </mesh>
        </>
      );
    case "scarecrow":
      return (
        <>
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 1.2, 6]} />
            <meshStandardMaterial color={wood} />
          </mesh>
          <mesh position={[0, 0.9, 0]} castShadow>
            <boxGeometry args={[0.8, 0.06, 0.06]} />
            <meshStandardMaterial color={wood} />
          </mesh>
          <mesh position={[0, 1.3, 0]} castShadow>
            <sphereGeometry args={[0.18, 8, 6]} />
            <meshStandardMaterial color={SCENE_COLORS.accent} />
          </mesh>
        </>
      );
    case "bell":
      return (
        <>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 1, 6]} />
            <meshStandardMaterial color={wood} />
          </mesh>
          <mesh position={[0, 0.9, 0]} castShadow>
            <sphereGeometry args={[0.2, 10, 8]} />
            <meshStandardMaterial color={SCENE_COLORS.star} metalness={0.4} />
          </mesh>
        </>
      );
    case "pond":
      return (
        <mesh position={[0, 0.02, 0]} receiveShadow>
          <cylinderGeometry args={[0.7, 0.7, 0.05, 16]} />
          <meshStandardMaterial color={SCENE_COLORS.sea} />
        </mesh>
      );
    case "slide":
      return (
        <>
          <mesh position={[0.3, 0.4, 0]} rotation={[0, 0, -0.6]} castShadow>
            <boxGeometry args={[1.1, 0.06, 0.4]} />
            <meshStandardMaterial color={SCENE_COLORS.accent} />
          </mesh>
          <mesh position={[-0.3, 0.4, 0]} castShadow>
            <boxGeometry args={[0.08, 0.8, 0.4]} />
            <meshStandardMaterial color={wood} />
          </mesh>
        </>
      );
    case "stable":
      return (
        <>
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[1.2, 0.8, 0.9]} />
            <meshStandardMaterial color={wood} />
          </mesh>
          <mesh position={[0, 1.0, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[0.95, 0.5, 4]} />
            <meshStandardMaterial color={SCENE_COLORS.barnRoof} />
          </mesh>
        </>
      );
    case "windmill":
      return <Windmill />;
    case "trophy":
      return (
        <>
          <mesh position={[0, 0.1, 0]} castShadow>
            <cylinderGeometry args={[0.4, 0.5, 0.2, 8]} />
            <meshStandardMaterial color={SCENE_COLORS.stone} />
          </mesh>
          <mesh position={[0, 0.65, 0]} castShadow>
            <coneGeometry args={[0.3, 0.7, 8]} />
            <meshStandardMaterial
              color={SCENE_COLORS.star}
              emissive={SCENE_COLORS.star}
              emissiveIntensity={0.3}
            />
          </mesh>
        </>
      );
    default:
      return null;
  }
}

function Windmill() {
  const blades = useRef<Group>(null);
  const paused = useUiStore((s) => s.paused);
  useFrame((_, dt) => {
    if (blades.current && !paused) blades.current.rotation.z -= dt * 0.8;
  });
  return (
    <>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.32, 1.4, 6]} />
        <meshStandardMaterial color={SCENE_COLORS.wall} />
      </mesh>
      <group ref={blades} position={[0, 1.3, 0.28]}>
        {[0, Math.PI / 2].map((r) => (
          <mesh key={r} rotation={[0, 0, r]} castShadow>
            <boxGeometry args={[1.4, 0.12, 0.03]} />
            <meshStandardMaterial color={SCENE_COLORS.bridge} />
          </mesh>
        ))}
      </group>
    </>
  );
}
