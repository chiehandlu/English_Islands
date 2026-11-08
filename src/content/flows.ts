import type { CarryKind, Flow, IslandId, WalkerKind } from "@/game/types";
import { ISLANDS, UNITS, islandsOfUnit } from "./islands";

/**
 * 協作線由單元自動推導：單字 → 文法 → 閱讀，小人沿線搬運。
 * 不需要在內容檔裡寫。
 */
export const FLOWS: Flow[] = UNITS.flatMap((unit) => {
  const islands = islandsOfUnit(unit);
  const byKind = (kind: string) => islands.find((i) => i.kind === kind)?.id;
  const vocab = byKind("vocab");
  const grammar = byKind("grammar");
  const reading = byKind("reading");
  const flows: Flow[] = [];
  if (vocab && grammar)
    flows.push({
      id: `${unit.id}-a`,
      title: "單字進句子",
      description: `學會的單字，拿到文法島造句。`,
      from: [vocab],
      to: [grammar],
      carry: "schoolbag",
      walker: "child",
      bidirectional: false,
    });
  if (grammar && reading)
    flows.push({
      id: `${unit.id}-b`,
      title: "句子進故事",
      description: `會造句之後，就能讀懂故事。`,
      from: [grammar],
      to: [reading],
      carry: "letter",
      walker: "teen",
      bidirectional: false,
    });
  return flows;
});

export const WALKER_LABELS: Record<WalkerKind, string> = {
  parent: "家長",
  partner: "老師",
  child: "小學生",
  teen: "大哥哥大姊姊",
  grandparent: "長輩",
  helper: "醫護",
};

export const CARRY_LABELS: Record<CarryKind, string> = {
  heart: "愛心",
  bottle: "水壺",
  schoolbag: "書包",
  coin: "零用錢",
  letter: "信",
  photo: "相簿",
  medkit: "醫藥箱",
  seedling: "樹苗",
};

export function getFlow(id: string): Flow | undefined {
  return FLOWS.find((f) => f.id === id);
}

export function flowIslands(flow: Flow): IslandId[] {
  return [...new Set([...flow.from, ...flow.to])];
}

export function flowsForIsland(islandId: IslandId): Flow[] {
  return FLOWS.filter((f) => flowIslands(f).includes(islandId));
}

export const ISLAND_IDS = ISLANDS.map((i) => i.id);
