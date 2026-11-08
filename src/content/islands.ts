import type {
  Building,
  Card,
  CoreIslandKind,
  Island,
  IslandDef,
  IslandId,
  Question,
  Unit,
} from "@/game/types";
import { UNITS } from "./units";

/**
 * 一個單元＝四座相鄰的小島：單字、文法、閱讀（內容檔寫的）加一座自動產生的複習島。
 * 叢與叢之間隔一格水；位置只由單元順序推導，內容檔不用寫座標。
 */
const CLUSTER_OFFSETS: [number, number][] = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
];
const CLUSTER_STEP: [number, number] = [3, 1];

export function clusterBase(unitIndex: number): [number, number] {
  return [CLUSTER_STEP[0] * unitIndex, CLUSTER_STEP[1] * unitIndex];
}

export function islandAxial(unitIndex: number, islandIndex: number): [number, number] {
  const [bq, br] = clusterBase(unitIndex);
  const [oq, or] = CLUSTER_OFFSETS[islandIndex % CLUSTER_OFFSETS.length];
  return [bq + oq, br + or];
}

export const CORE_KINDS: CoreIslandKind[] = ["vocab", "grammar", "reading"];

const SPELLABLE = /^[a-z][a-z' ]*$/i;
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z]+/g, "-")
    .replace(/^-|-$/g, "");

/** 單字島第 5 棟：把這座島所有字卡變成聽寫題（聽單字、拼出來）。 */
export function dictationBuilding(unit: Unit, vocab: IslandDef): Building | null {
  const seen = new Set<string>();
  const cards: Card[] = [];
  for (const b of vocab.buildings) {
    for (const c of b.cards ?? []) {
      const key = c.en.toLowerCase();
      if (!SPELLABLE.test(c.en) || key.replace(/\s/g, "").length > 14 || seen.has(key)) continue;
      seen.add(key);
      cards.push(c);
    }
  }
  if (cards.length < 5) return null;
  const questions: Question[] = cards.map((c) => ({
    id: `${unit.id}-spell-${slug(c.en)}`,
    type: "spell",
    mode: "dictation",
    prompt: c.zh,
    say: c.say ?? c.en,
    answer: c.en.toLowerCase(),
    tags: ["spelling", "dictation"],
  }));
  return {
    id: `${unit.id}-spell`,
    name: "拼字練習",
    emoji: "✍️",
    intro: `聽單字、拼出來。這一課的 ${cards.length} 個單字都在這裡，常拼錯的會先出現。`,
    questions,
    generated: "dictation",
  };
}

const REVIEW_META: Record<CoreIslandKind, { name: string; emoji: string }> = {
  vocab: { name: "單字複習", emoji: "🔁" },
  grammar: { name: "文法複習", emoji: "🧩" },
  reading: { name: "閱讀複習", emoji: "📚" },
};

/** 每單元的複習島：三棟都是空殼，題目在遊戲時依「常錯」即時挑出（game/review.ts）。 */
export function reviewIsland(unit: Unit): IslandDef {
  return {
    id: `${unit.id}-review`,
    kind: "review",
    name: "複習島",
    buildings: CORE_KINDS.map((kind) => ({
      id: `${unit.id}-review-${kind}`,
      name: REVIEW_META[kind].name,
      emoji: REVIEW_META[kind].emoji,
      intro: "這一課裡你常答錯的題目會集中在這裡，一次 10 題。",
      questions: [],
      generated: "review",
      reviewKind: kind,
    })),
  };
}

function augment(unit: Unit, island: IslandDef): IslandDef {
  if (island.kind !== "vocab") return island;
  const extra = dictationBuilding(unit, island);
  return extra ? { ...island, buildings: [...island.buildings, extra] } : island;
}

/** 場景用的島清單：依單元順序、單元內依島順序（單字、文法、閱讀、複習），編號連續。 */
export const ISLANDS: Island[] = UNITS.flatMap((unit, u) =>
  [...unit.islands.map((island) => augment(unit, island)), reviewIsland(unit)].map((island, i) => ({
    ...island,
    unitId: unit.id,
    number: 0,
    axial: islandAxial(u, i),
  })),
).map((island, index) => ({ ...island, number: index + 1 }));

export { UNITS };

export function getUnit(id: string): Unit | undefined {
  return UNITS.find((u) => u.id === id);
}

export function getIsland(id: IslandId): Island | undefined {
  return ISLANDS.find((i) => i.id === id);
}

export function unitOfIsland(island: Pick<Island, "unitId">): Unit {
  return UNITS.find((u) => u.id === island.unitId)!;
}

export function islandsOfUnit(unit: Pick<Unit, "id">): Island[] {
  return ISLANDS.filter((i) => i.unitId === unit.id);
}

/** 單元的三座內容島（不含複習島）；完成單元看的是這三座。 */
export function coreIslandsOfUnit(unit: Pick<Unit, "id">): Island[] {
  return islandsOfUnit(unit).filter((i) => i.kind !== "review");
}

export function reviewIslandOfUnit(unit: Pick<Unit, "id">): Island | undefined {
  return islandsOfUnit(unit).find((i) => i.kind === "review");
}

export function isReviewIsland(island: Pick<Island, "kind">): boolean {
  return island.kind === "review";
}

export function findBuilding(id: string): { island: Island; building: Building } | undefined {
  for (const island of ISLANDS) {
    const building = island.buildings.find((b) => b.id === id);
    if (building) return { island, building };
  }
}

export const ALL_BUILDINGS: Building[] = ISLANDS.flatMap((i) => i.buildings);

/** 每一題原本屬於哪一種島（聽寫題算單字島）；複習島的題目也查得到原島。 */
export const QUESTION_ORIGIN: Record<string, CoreIslandKind> = {};
for (const island of ISLANDS) {
  if (island.kind === "review") continue;
  for (const b of island.buildings)
    for (const q of b.questions) QUESTION_ORIGIN[q.id] = island.kind;
}

export function originKind(questionId: string): CoreIslandKind {
  return QUESTION_ORIGIN[questionId] ?? "vocab";
}

export function findQuestion(questionId: string) {
  for (const island of ISLANDS) {
    if (island.kind === "review") continue;
    for (const building of island.buildings) {
      const question = building.questions.find((q) => q.id === questionId);
      if (question) return { island, building, question };
    }
  }
}

/** 某單元某種島的全部題目（含聽寫），複習島挑題用。 */
export function questionsOfKind(unit: Pick<Unit, "id">, kind: CoreIslandKind): Question[] {
  return coreIslandsOfUnit(unit)
    .filter((i) => i.kind === kind)
    .flatMap((i) => i.buildings.flatMap((b) => b.questions));
}
