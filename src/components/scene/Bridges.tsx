import { ISLAND_CENTERS, ISLAND_ORDER } from "@/content/world";
import { distance } from "@/scene/layout";
import { SCENE_COLORS } from "./palette";

/** 相鄰人生階段之間的木棧橋（人生航道）。 */
export function Bridges() {
  return (
    <group>
      {ISLAND_ORDER.slice(1).map((id, i) => {
        const a = ISLAND_CENTERS[ISLAND_ORDER[i]];
        const b = ISLAND_CENTERS[id];
        const angle = Math.atan2(b[0] - a[0], b[1] - a[1]);
        return (
          <mesh
            key={id}
            position={[(a[0] + b[0]) / 2, 0.5, (a[1] + b[1]) / 2]}
            rotation={[0, angle, 0]}
            receiveShadow
          >
            <boxGeometry args={[0.7, 0.12, distance(a, b)]} />
            <meshStandardMaterial color={SCENE_COLORS.bridge} />
          </mesh>
        );
      })}
    </group>
  );
}
