"use client";

import { maxTotalStars, totalStars } from "@/game/engine";
import { dueMistakes, toDateString } from "@/game/review";
import { select } from "@/lib/selection";
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
  const due = dueMistakes(game, toDateString(new Date())).length;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center gap-2 p-3">
      <div className="glass-card pointer-events-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2">
        <span className="text-lg" aria-hidden>
          {game.player.avatar}
        </span>
        <span className="font-bold">{game.player.name || "英文島"}</span>
        <span className="text-sm tabular-nums">
          <span className="text-amber-400">★</span> {totalStars(game)} / {maxTotalStars()}
        </span>
        <button
          type="button"
          onClick={() => ui.openQuiz({ kind: "review" })}
          disabled={due === 0}
          className="chip min-h-9 disabled:opacity-50"
        >
          🎒 錯題袋 {due}
        </button>
        <button
          type="button"
          onClick={() => ui.setView("report")}
          className="text-sm text-neutral-500 underline"
        >
          家長
        </button>
      </div>
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
