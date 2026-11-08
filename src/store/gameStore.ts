"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createInitialState, recordResult, setPlayer } from "@/game/engine";
import {
  type FarmResult,
  adoptPet,
  buyDecor,
  buyWeather,
  carePlant,
  createFarmState,
  feedPet,
  moveDecor,
  removeDecor,
  renamePet,
  sendOutside,
  setPetSlot,
  setWeather,
} from "@/game/farm";
import { addMistake, recordAnswer, resolveMistake, toDateString } from "@/game/review";
import {
  type RewardEvent,
  type RewardResult,
  type RunOutcome,
  applyRunRewards,
  claimMilestones,
} from "@/game/rewards";
import type { FeedItem, GameState, WeatherId } from "@/game/types";

export interface QuizSummary extends RewardResult {
  milestones: RewardEvent[];
}

interface GameStore extends GameState {
  /** 結算一次挑戰：記星星、發獎勵、領里程碑；回傳給結算畫面顯示 */
  finishQuiz: (run: RunOutcome, ratio: number) => QuizSummary;
  /** 答錯：進錯題袋、記一次錯 */
  markWrong: (questionId: string, buildingId: string) => void;
  /** 答對：記一次對；review 為 true 時同時從錯題袋移除 */
  markRight: (questionId: string, review: boolean) => void;
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
  care: (decorId: string, item: FeedItem) => FarmResult;
  buyWeather: (id: WeatherId) => FarmResult;
  setWeather: (id: WeatherId) => FarmResult;
  reset: () => void;
}

const pickState = (s: GameState): GameState => ({
  player: s.player,
  progress: s.progress,
  mistakes: s.mistakes,
  farm: s.farm,
  questionStats: s.questionStats,
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
        markWrong: (questionId, buildingId) => {
          const day = today();
          set(
            recordAnswer(
              addMistake(pickState(get()), questionId, buildingId, day),
              questionId,
              false,
              day,
            ),
          );
        },
        markRight: (questionId, review) => {
          let state = recordAnswer(pickState(get()), questionId, true, today());
          if (review) state = resolveMistake(state, questionId);
          set(state);
        },
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
        care: (decorId, item) => apply(carePlant(pickState(get()), decorId, item, today())),
        buyWeather: (id) => apply(buyWeather(pickState(get()), id)),
        setWeather: (id) => apply(setWeather(pickState(get()), id)),
        reset: () => set(createInitialState()),
      };
    },
    {
      name: "english-island-save",
      // v2：加入農場（inventory、pets、decor、每日計數）；v3：農場加 landExpanded；v4：questionStats
      // v5：農場加天氣（weather、weatherOwned）；植物的 growth 等欄位是選填，舊裝飾不用補
      version: 5,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => pickState(s),
      migrate: (persisted, version) => {
        if (version < 1) return createInitialState();
        const old = persisted as Partial<GameState>;
        const farm = { ...createFarmState(today()), ...(old.farm ?? {}) };
        return {
          ...createInitialState(),
          ...old,
          farm,
          questionStats: old.questionStats ?? {},
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
