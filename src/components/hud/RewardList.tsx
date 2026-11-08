"use client";

import { ITEM_IDS, ITEM_META, getDecorKind, getPetKind } from "@/content/farm";
import { affordableNow } from "@/game/farm";
import type { Inventory } from "@/game/types";
import type { QuizSummary } from "@/store/gameStore";
import { useGameStore } from "@/store/gameStore";

/** 一串材料的小標籤：🪙 3・🌾 6 */
export function ItemChips({
  items,
  size = "md",
}: {
  items: Partial<Inventory>;
  size?: "sm" | "md";
}) {
  const entries = ITEM_IDS.filter((id) => (items[id] ?? 0) > 0);
  if (entries.length === 0) return null;
  const cls = size === "sm" ? "px-2 py-0.5 text-sm" : "px-3 py-1 text-lg";
  return (
    <span className="inline-flex flex-wrap justify-center gap-1.5">
      {entries.map((id) => (
        <span key={id} className={`rounded-full bg-white/80 font-bold tabular-nums ${cls}`}>
          {ITEM_META[id].emoji} {items[id]}
        </span>
      ))}
    </span>
  );
}

/** 結算畫面的「獲得」區：材料、加成事件、里程碑、去農場。 */
export function RewardList({ summary, onFarm }: { summary: QuizSummary; onFarm: () => void }) {
  const farm = useGameStore((s) => s.farm);
  const affordable = affordableNow(farm);
  const nextPet = affordable.pets.map((id) => getPetKind(id)).find(Boolean);
  const nextDecor = affordable.decor.map((id) => getDecorKind(id)).find(Boolean);
  const events = [...summary.events, ...summary.milestones];

  return (
    <div className="space-y-3 rounded-2xl bg-sand/40 p-4 text-left">
      <p className="mono-label">獲得</p>
      {summary.capped ? (
        <p className="text-sm text-neutral-700">
          這棟今天的材料領完了（拿到 🪙 1），去別棟看看，明天再回來。
        </p>
      ) : (
        <div className="text-center">
          <ItemChips items={summary.gained} />
          <p className="mt-1 text-xs text-neutral-500">
            這棟今天還有 {summary.runsLeftToday} 次全額獎勵
          </p>
        </div>
      )}
      {events.length > 0 && (
        <ul className="space-y-1 text-sm">
          {events.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2">
              <span>
                ✨ {e.label}
                {e.petKind && ` ${getPetKind(e.petKind)?.emoji ?? ""}`}
                {e.decorKind && ` ${getDecorKind(e.decorKind)?.emoji ?? ""}`}
              </span>
              <ItemChips items={e.gained} size="sm" />
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onFarm}
        className="chip min-h-12 w-full justify-center text-base"
      >
        {nextPet
          ? `可以領養${nextPet.name}了！${nextPet.emoji} 去農場`
          : nextDecor
            ? `可以蓋${nextDecor.name}了！${nextDecor.emoji} 去農場`
            : "🐔 去農場看看"}
      </button>
    </div>
  );
}
