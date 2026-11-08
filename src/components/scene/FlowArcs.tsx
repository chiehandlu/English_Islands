"use client";

import { useMemo } from "react";
import { Line } from "@react-three/drei";
import { QuadraticBezierCurve3, Vector3 } from "three";
import { FLOWS, ISLAND_CENTERS } from "@/content/world";
import { distance } from "@/scene/layout";
import { type Selection, select } from "@/lib/selection";
import { FLOW_COLORS } from "./palette";

const ARC_BASE_Y = 1.2;

export function FlowArcs({ selection }: { selection: Selection }) {
  const arcs = useMemo(
    () =>
      FLOWS.flatMap((flow) =>
        flow.from.flatMap((from) =>
          flow.to.map((to) => {
            const a = ISLAND_CENTERS[from];
            const b = ISLAND_CENTERS[to];
            const lift = ARC_BASE_Y + distance(a, b) * 0.25;
            const curve = new QuadraticBezierCurve3(
              new Vector3(a[0], ARC_BASE_Y, a[1]),
              new Vector3((a[0] + b[0]) / 2, lift, (a[1] + b[1]) / 2),
              new Vector3(b[0], ARC_BASE_Y, b[1]),
            );
            return {
              key: `${flow.id}-${from}-${to}`,
              flowId: flow.id,
              points: curve.getPoints(32),
            };
          }),
        ),
      ),
    [],
  );
  const selectedFlow = selection?.kind === "flow" ? selection.id : undefined;

  return (
    <group>
      {arcs.map((arc) => {
        const active = !selectedFlow || selectedFlow === arc.flowId;
        return (
          <Line
            key={arc.key}
            points={arc.points}
            color={FLOW_COLORS[arc.flowId]}
            lineWidth={selectedFlow === arc.flowId ? 4 : 2}
            dashed={!selectedFlow}
            dashSize={0.4}
            gapSize={0.3}
            transparent
            opacity={active ? 0.9 : 0.12}
            onClick={(e) => {
              e.stopPropagation();
              select({ kind: "flow", id: arc.flowId });
            }}
          />
        );
      })}
    </group>
  );
}
