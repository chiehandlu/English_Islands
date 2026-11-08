"use client";

import { useState } from "react";
import { ITEM_IDS, ITEM_META } from "@/content/farm";
import { maxTotalStars, totalStars } from "@/game/engine";
import { hungryPets } from "@/game/farm";
import { dueMistakes, toDateString } from "@/game/review";
import { select, useSelection } from "@/lib/selection";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";

const TOGGLES = [
  { key: "showLabels", label: "名牌" },
  { key: "showCarry", label: "小人" },
  { key: "paused", label: "暫停" },
] as const;

export function TopBar() {
  const game = useGameStore();
  const ui = useUiStore();
  const selection = useSelection();
  const [bagOpen, setBagOpen] = useState(false);
  const today = toDateString(new Date());
  const due = dueMistakes(game, today).length;
  const hungry = hungryPets(game.farm, today).length;

  return (
    <div
      data-panel={ui.panelOpen}
      className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center gap-2 p-3 md:data-[panel=true]:pr-[calc(min(26rem,33vw)+1.5rem)]"
    >
      <div className="glass-card pointer-events-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2">
        <span className="text-lg" aria-hidden>
          {game.player.avatar}
        </span>
        <span className="font-bold">{game.player.name || "英文島"}</span>
        <span className="text-sm tabular-nums">
          <span className="text-amber-400">★</span> {totalStars(game)} / {maxTotalStars()}
        </span>
        <button
          type="button"
          onClick={() => setBagOpen((v) => !v)}
          aria-expanded={bagOpen}
          className="chip min-h-9 tabular-nums"
        >
          🪙 {game.farm.inventory.coin}
          <span className="text-neutral-400">・</span>🎒
        </button>
        <button
          type="button"
          onClick={() => select({ kind: "farm", id: "farm" })}
          data-selected={selection?.kind === "farm"}
          className="chip relative min-h-9 data-[selected=true]:border-accent"
        >
          🐔 農場
          {hungry > 0 && (
            <span
              className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent"
              aria-label={`${hungry} 隻寵物還沒餵`}
            />
          )}
        </button>
        <button
          type="button"
          onClick={() => ui.openQuiz({ kind: "review" })}
          disabled={due === 0}
          className="chip min-h-9 disabled:opacity-50"
        >
          📝 錯題 {due}
        </button>
        <button
          type="button"
          onClick={() => ui.setView("report")}
          className="text-sm text-neutral-500 underline"
        >
          家長
        </button>
      </div>
      {bagOpen && (
        <div className="glass-card pointer-events-auto grid grid-cols-2 gap-x-6 gap-y-1 px-4 py-3 text-sm sm:grid-cols-4">
          {ITEM_IDS.map((id) => (
            <div key={id} className="flex items-baseline gap-2">
              <span className="w-14 font-bold tabular-nums">
                {ITEM_META[id].emoji} {game.farm.inventory[id]}
              </span>
              <span className="text-xs text-neutral-500">{ITEM_META[id].source}</span>
            </div>
          ))}
        </div>
      )}
      <div className="glass-card pointer-events-auto flex gap-1 p-1">
        {TOGGLES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={ui[key]}
            onClick={() => ui.toggle(key)}
            className="tool-button"
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => select(null)}
          className="tool-button"
          aria-pressed={false}
        >
          全景
        </button>
      </div>
    </div>
  );
}
