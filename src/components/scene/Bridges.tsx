import { ISLAND_CENTERS, ISLAND_ORDER } from "@/content/world";
import { farmCenter } from "@/scene/farm";
import { type Vec2, distance } from "@/scene/layout";
import { SCENE_COLORS } from "./palette";

function Plank({ a, b }: { a: Vec2; b: Vec2 }) {
  const angle = Math.atan2(b[0] - a[0], b[1] - a[1]);
  return (
    <mesh
      position={[(a[0] + b[0]) / 2, 0.5, (a[1] + b[1]) / 2]}
      rotation={[0, angle, 0]}
      receiveShadow
    >
      <boxGeometry args={[0.7, 0.12, distance(a, b)]} />
      <meshStandardMaterial color={SCENE_COLORS.bridge} />
    </mesh>
  );
}

/** 島與島之間的木棧橋：單元內相鄰的島，加上第一座島通往農場的橋。 */
export function Bridges() {
  const first = ISLAND_CENTERS[ISLAND_ORDER[0]];
  return (
    <group>
      {ISLAND_ORDER.slice(1).map((id, i) => (
        <Plank key={id} a={ISLAND_CENTERS[ISLAND_ORDER[i]]} b={ISLAND_CENTERS[id]} />
      ))}
      {first && <Plank a={first} b={farmCenter()} />}
    </group>
  );
}
