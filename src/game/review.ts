import type { GameState, Mistake } from "./types";

/**
 * 錯題袋：答錯的題目隔天再出現；複習答對就移除，再答錯就延後。
 * 日期一律用 YYYY-MM-DD 字串，避免時區問題。
 */

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(dateString: string, days: number): string {
  const [y, m, d] = dateString.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return toDateString(date);
}

/** 第一次錯隔 1 天，再錯隔 2 天、3 天…，最多 7 天。 */
export function intervalFor(wrongCount: number): number {
  return Math.min(7, Math.max(1, wrongCount));
}

export function addMistake(
  state: GameState,
  questionId: string,
  buildingId: string,
  today: string,
): GameState {
  const existing = state.mistakes.find((m) => m.questionId === questionId);
  const wrongCount = (existing?.wrongCount ?? 0) + 1;
  const mistake: Mistake = {
    questionId,
    buildingId,
    wrongCount,
    dueDate: addDays(today, intervalFor(wrongCount)),
  };
  return {
    ...state,
    mistakes: [...state.mistakes.filter((m) => m.questionId !== questionId), mistake],
  };
}

/** 複習答對：從錯題袋移除。 */
export function resolveMistake(state: GameState, questionId: string): GameState {
  return { ...state, mistakes: state.mistakes.filter((m) => m.questionId !== questionId) };
}

export function dueMistakes(state: GameState, today: string): Mistake[] {
  return state.mistakes.filter((m) => m.dueDate <= today);
}

export function mistakeCountByBuilding(state: GameState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const m of state.mistakes) counts[m.buildingId] = (counts[m.buildingId] ?? 0) + 1;
  return counts;
}
