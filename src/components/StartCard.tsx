"use client";

import { maxTotalStars, totalStars } from "@/game/engine";
import { useGameStore, useHasHydrated } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";

const AVATARS = ["🦊", "🐱", "🐼", "🦄", "🐸", "🦖"];

/** 首頁的開始卡：選頭像、填名字（可不填），顯示目前星數。 */
export function StartCard() {
  const hydrated = useHasHydrated();
  const { player, setPlayer } = useGameStore();
  const game = useGameStore();
  const setView = useUiStore((s) => s.setView);
  if (!hydrated) return null;

  return (
    <div className="glass-card w-full space-y-5 p-6">
      <div className="flex flex-wrap justify-center gap-2">
        {AVATARS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setPlayer({ avatar: a })}
            aria-pressed={player.avatar === a}
            className="grid h-14 w-14 place-items-center rounded-2xl text-3xl aria-pressed:bg-accent/20 aria-pressed:ring-2 aria-pressed:ring-accent"
          >
            {a}
          </button>
        ))}
      </div>
      <input
        value={player.name}
        onChange={(e) => setPlayer({ name: e.target.value.slice(0, 12) })}
        placeholder="你的名字（可以不填）"
        className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-center text-lg"
      />
      <button type="button" onClick={() => setView("play")} className="btn-primary w-full text-xl">
        出發 🚤
      </button>
      {totalStars(game) > 0 && (
        <p className="text-sm text-neutral-500">
          目前 <span className="text-amber-400">★</span> {totalStars(game)} / {maxTotalStars()}
        </p>
      )}
    </div>
  );
}
