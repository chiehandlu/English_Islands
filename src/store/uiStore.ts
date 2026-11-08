"use client";

import { create } from "zustand";

/** 進行中的挑戰：某一棟建築，或錯題袋複習。 */
export type QuizTarget = { kind: "building"; buildingId: string } | { kind: "review" } | null;

/** 整個 App 只有一個路由，畫面由 view 切換（靜態主機放在子路徑也能跑）。 */
export type View = "home" | "play" | "report";

/** 純介面開關（不存檔）。 */
interface UiStore {
  showLabels: boolean;
  showCarry: boolean;
  showFlows: boolean;
  paused: boolean;
  panelOpen: boolean;
  quiz: QuizTarget;
  view: View;
  setView: (view: View) => void;
  toggle: (key: "showLabels" | "showCarry" | "showFlows" | "paused" | "panelOpen") => void;
  openQuiz: (target: QuizTarget) => void;
  closeQuiz: () => void;
}

export const useUiStore = create<UiStore>()((set) => ({
  showLabels: true,
  showCarry: true,
  showFlows: true,
  // 系統設定「減少動態效果」時，小人與標記預設暫停
  paused:
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  // 手機與 iPad 直式預設收合清單，留空間給島
  panelOpen: typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
  quiz: null,
  view: "home",
  setView: (view) => set({ view, quiz: null }),
  toggle: (key) => set((s) => ({ [key]: !s[key] })),
  openQuiz: (target) => set({ quiz: target }),
  closeQuiz: () => set({ quiz: null }),
}));
