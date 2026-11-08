"use client";

import { create } from "zustand";

/** 進行中的挑戰：某一棟建築，或錯題袋複習。 */
export type QuizTarget = { kind: "building"; buildingId: string } | { kind: "review" } | null;

/** 整個 App 只有一個路由，畫面由 view 切換（靜態主機放在子路徑也能跑）。 */
export type View = "home" | "play" | "report";

/** 純介面開關（不存檔）。 */
interface UiStore {
  showLabels: boolean;
  showWalkers: boolean;
  showFlows: boolean;
  paused: boolean;
  panelOpen: boolean;
  quiz: QuizTarget;
  view: View;
  setView: (view: View) => void;
  /** 農場小鐘最後一次響的時間（performance.now），寵物會跳一下 */
  bellAt: number;
  ringBell: () => void;
  toggle: (key: "showLabels" | "showWalkers" | "showFlows" | "paused" | "panelOpen") => void;
  openQuiz: (target: QuizTarget) => void;
  closeQuiz: () => void;
  /** 最後一次按「全景」的時間；就算目前沒選東西，鏡頭也會飛回全景 */
  recenterAt: number;
  recenter: () => void;
}

export const useUiStore = create<UiStore>()((set) => ({
  showLabels: true,
  showWalkers: true,
  showFlows: true,
  // 系統設定「減少動態效果」時，小人與標記預設暫停
  paused:
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  // 手機與 iPad 直式預設收合清單，留空間給島
  panelOpen: typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
  quiz: null,
  view: "home",
  setView: (view) => set({ view, quiz: null }),
  bellAt: -10000,
  ringBell: () => set({ bellAt: performance.now() }),
  toggle: (key) => set((s) => ({ [key]: !s[key] })),
  openQuiz: (target) => set({ quiz: target }),
  closeQuiz: () => set({ quiz: null }),
  recenterAt: 0,
  recenter: () => set({ recenterAt: performance.now() }),
}));
