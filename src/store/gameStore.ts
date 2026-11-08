"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createInitialState, recordResult, setPlayer } from "@/game/engine";
import { addMistake, resolveMistake, toDateString } from "@/game/review";
import type { GameState } from "@/game/types";

interface GameStore extends GameState {
  finishQuiz: (buildingId: string, ratio: number) => void;
  markWrong: (questionId: string, buildingId: string) => void;
  markReviewed: (questionId: string) => void;
  setPlayer: (player: Partial<GameState["player"]>) => void;
  reset: () => void;
}

const pickState = (s: GameState): GameState => ({
  player: s.player,
  progress: s.progress,
  mistakes: s.mistakes,
});

const today = () => toDateString(new Date());

/** UI 層只呼叫這些 action；遊戲規則一律寫在 src/game。 */
export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),
      finishQuiz: (buildingId, ratio) => set(recordResult(pickState(get()), buildingId, ratio)),
      markWrong: (questionId, buildingId) =>
        set(addMistake(pickState(get()), questionId, buildingId, today())),
      markReviewed: (questionId) => set(resolveMistake(pickState(get()), questionId)),
      setPlayer: (player) => set(setPlayer(pickState(get()), player)),
      reset: () => set(createInitialState()),
    }),
    {
      name: "english-island-save",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => pickState(s),
      migrate: (persisted, version) =>
        version < 1 ? createInitialState() : (persisted as GameState),
    },
  ),
);

/** localStorage 讀取完成前回傳 false，避免 SSR hydration 不一致。 */
export function useHasHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useGameStore.persist.onFinishHydration(cb),
    () => useGameStore.persist.hasHydrated(),
    () => false,
  );
}
