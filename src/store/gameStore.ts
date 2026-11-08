"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createInitialState, recordResult, setPlayer } from "@/game/engine";
import {
  type FarmResult,
  adoptPet,
  buyDecor,
  createFarmState,
  feedPet,
  moveDecor,
  removeDecor,
  renamePet,
  sendOutside,
  setPetSlot,
} from "@/game/farm";
import { addMistake, resolveMistake, toDateString } from "@/game/review";
import {
  type RewardEvent,
  type RewardResult,
  type RunOutcome,
  applyRunRewards,
  claimMilestones,
} from "@/game/rewards";
import type { FeedItem, GameState } from "@/game/types";

export interface QuizSummary extends RewardResult {
  milestones: RewardEvent[];
}

interface GameStore extends GameState {
  /** 結算一次挑戰：記星星、發獎勵、領里程碑；回傳給結算畫面顯示 */
  finishQuiz: (run: RunOutcome, ratio: number) => QuizSummary;
  markWrong: (questionId: string, buildingId: string) => void;
  markReviewed: (questionId: string) => void;
  setPlayer: (player: Partial<GameState["player"]>) => void;
  adopt: (kindId: string) => FarmResult;
  build: (kindId: string) => FarmResult;
  demolish: (decorId: string) => FarmResult;
  moveDecor: (decorId: string, slot: number) => FarmResult;
  feed: (petId: string, item: FeedItem) => FarmResult;
  sendOut: (petId: string) => FarmResult;
  sendHome: (petId: string) => FarmResult;
  rename: (petId: string, name: string) => void;
  reset: () => void;
}

const pickState = (s: GameState): GameState => ({
  player: s.player,
  progress: s.progress,
  mistakes: s.mistakes,
  farm: s.farm,
});

const today = () => toDateString(new Date());

/** UI 層只呼叫這些 action；遊戲規則一律寫在 src/game。 */
export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => {
      const apply = (result: FarmResult): FarmResult => {
        if (result.ok) set(result.state);
        return result;
      };
      return {
        ...createInitialState(),
        finishQuiz: (run, ratio) => {
          const day = today();
          let state = pickState(get());
          if (run.buildingId) state = recordResult(state, run.buildingId, ratio);
          const rewarded = applyRunRewards(state, run, day);
          const milestones = claimMilestones(rewarded.state, day);
          set(milestones.state);
          return { ...rewarded.result, milestones: milestones.events };
        },
        markWrong: (questionId, buildingId) =>
          set(addMistake(pickState(get()), questionId, buildingId, today())),
        markReviewed: (questionId) => set(resolveMistake(pickState(get()), questionId)),
        setPlayer: (player) => set(setPlayer(pickState(get()), player)),
        adopt: (kindId) => apply(adoptPet(pickState(get()), kindId, today())),
        build: (kindId) => apply(buyDecor(pickState(get()), kindId, today())),
        demolish: (decorId) => apply(removeDecor(pickState(get()), decorId)),
        moveDecor: (decorId, slot) => apply(moveDecor(pickState(get()), decorId, slot)),
        feed: (petId, item) => apply(feedPet(pickState(get()), petId, item, today())),
        sendOut: (petId) => apply(sendOutside(pickState(get()), petId)),
        sendHome: (petId) => apply(setPetSlot(pickState(get()), petId, null)),
        rename: (petId, name) => set(renamePet(pickState(get()), petId, name)),
        reset: () => set(createInitialState()),
      };
    },
    {
      name: "english-island-save",
      // v2：加入農場（inventory、pets、decor、每日計數）
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => pickState(s),
      migrate: (persisted, version) => {
        if (version < 1) return createInitialState();
        const old = persisted as Partial<GameState>;
        return {
          ...createInitialState(),
          ...old,
          farm: old.farm ?? createFarmState(today()),
        } as GameState;
      },
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
