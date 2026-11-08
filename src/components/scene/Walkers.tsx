"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type InstancedMesh, Object3D } from "three";
import { FLOWS, ISLAND_CENTERS, ISLAND_ORDER } from "@/content/world";
import {
  buildRoutes,
  createWalkers,
  isCarrying,
  positionOnRoute,
  stepWalker,
} from "@/scene/walkers";
import type { Selection } from "@/lib/selection";
import { CARRY_COLORS, WALKER_COLORS } from "./palette";

const WALKERS_PER_ROUTE = 3;
const BRIDGE_Y = 0.56;
const ISLAND_Y = 0.7;

interface Props {
  selection: Selection;
  paused: boolean;
  showCarry: boolean;
}

/** 走動小人：三個 InstancedMesh（身體／頭／道具）一次畫出全部小人。 */
export function Walkers({ selection, paused, showCarry }: Props) {
  const routes = useMemo(() => buildRoutes(FLOWS, ISLAND_ORDER, ISLAND_CENTERS), []);
  const walkers = useRef(createWalkers(routes, WALKERS_PER_ROUTE));
  const count = routes.length * WALKERS_PER_ROUTE;
  const bodies = useRef<InstancedMesh>(null);
  const heads = useRef<InstancedMesh>(null);
  const carries = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const selectedFlow = selection?.kind === "flow" ? selection.id : undefined;

  useLayoutEffect(() => {
    const color = new Color();
    walkers.current.forEach((w, i) => {
      const route = routes[w.routeIndex];
      bodies.current?.setColorAt(i, color.set(WALKER_COLORS[route.walker]));
      heads.current?.setColorAt(i, color.set("#f2d0b4"));
      carries.current?.setColorAt(i, color.set(CARRY_COLORS[route.carry]));
    });
    for (const mesh of [bodies, heads, carries]) {
      if (mesh.current?.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    }
  }, [routes]);

  useFrame(({ clock }, dt) => {
    const step = paused ? 0 : Math.min(dt, 0.1);
    walkers.current.forEach((w, i) => {
      const route = routes[w.routeIndex];
      const next = step > 0 ? stepWalker(w, route, step).state : w;
      walkers.current[i] = next;

      const visible = !selectedFlow || selectedFlow === route.flowId;
      const [x, z] = positionOnRoute(route, next.progress);
      // 靠近島中心時走在地面上，橋上時略低
      const nearIsland = route.waypoints.some(([wx, wz]) => Math.hypot(wx - x, wz - z) < 2.6);
      const ground = nearIsland ? ISLAND_Y : BRIDGE_Y;
      const bounce =
        next.phase === "walking" && !paused
          ? Math.abs(Math.sin(clock.elapsedTime * 8 + i)) * 0.08
          : 0;
      const scale = visible ? 1 : 0;

      dummy.position.set(x, ground + 0.22 + bounce, z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      bodies.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.y = ground + 0.55 + bounce;
      dummy.updateMatrix();
      heads.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.y = ground + 0.88 + bounce;
      dummy.scale.setScalar(visible && showCarry && isCarrying(next, route) ? 1 : 0);
      dummy.updateMatrix();
      carries.current?.setMatrixAt(i, dummy.matrix);
    });
    for (const mesh of [bodies, heads, carries]) {
      if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={bodies} args={[undefined, undefined, count]} castShadow>
        <cylinderGeometry args={[0.1, 0.13, 0.44, 8]} />
        <meshStandardMaterial />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, count]} castShadow>
        <sphereGeometry args={[0.14, 10, 8]} />
        <meshStandardMaterial />
      </instancedMesh>
      <instancedMesh ref={carries} args={[undefined, undefined, count]}>
        <boxGeometry args={[0.18, 0.18, 0.18]} />
        <meshStandardMaterial />
      </instancedMesh>
    </group>
  );
}
