import { questionsOfKind } from "@/content/islands";
import type { CoreIslandKind, GameState, Mistake, Question, QuestionStat, Unit } from "./types";

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

// ---------- 常錯統計與複習島 ----------

const EMPTY_STAT: QuestionStat = { wrong: 0, right: 0, lastWrong: null };

export function statOf(state: GameState, questionId: string): QuestionStat {
  return state.questionStats[questionId] ?? EMPTY_STAT;
}

/** 每答一題就記一筆；錯題袋、複習島、拼字練習都靠這個挑題。 */
export function recordAnswer(
  state: GameState,
  questionId: string,
  correct: boolean,
  today: string,
): GameState {
  const prev = statOf(state, questionId);
  const next: QuestionStat = correct
    ? { ...prev, right: prev.right + 1 }
    : { ...prev, wrong: prev.wrong + 1, lastWrong: today };
  return { ...state, questionStats: { ...state.questionStats, [questionId]: next } };
}

/** 常錯分數：錯越多、越近期越高；答對會慢慢抵銷。 */
export function troubleScore(stat: QuestionStat): number {
  return stat.wrong * 2 - stat.right;
}

/** 從一組題目裡挑出常錯的，分數高的在前；分數 ≤ 0 的不算常錯。 */
export function frequentlyWrong(state: GameState, questions: Question[]): Question[] {
  return questions
    .map((q) => ({ q, stat: statOf(state, q.id) }))
    .filter(({ stat }) => stat.wrong > 0 && troubleScore(stat) > 0)
    .sort((a, b) => {
      const d = troubleScore(b.stat) - troubleScore(a.stat);
      if (d !== 0) return d;
      return (b.stat.lastWrong ?? "").localeCompare(a.stat.lastWrong ?? "");
    })
    .map(({ q }) => q);
}

export interface ReviewSet {
  /** 這次要出的題（常錯在前，不足補其他題） */
  questions: Question[];
  /** 其中幾題是常錯題 */
  troubleCount: number;
}

/**
 * 複習島某一棟這次要出的題：先放該單元該種島的常錯題，不滿 limit 再補同種島的其他題。
 * 補題用日期當種子，同一天出一樣的，隔天換一批。
 */
export function reviewSet(
  state: GameState,
  unit: Pick<Unit, "id">,
  kind: CoreIslandKind,
  today: string,
  limit = 10,
  random: () => number = seeded(today + kind),
): ReviewSet {
  const pool = questionsOfKind(unit, kind);
  const trouble = frequentlyWrong(state, pool).slice(0, limit);
  const rest = pool.filter((q) => !trouble.includes(q));
  const fill = shuffleWith(rest, random).slice(0, Math.max(0, limit - trouble.length));
  return { questions: [...trouble, ...fill], troubleCount: trouble.length };
}

function seeded(text: string): () => number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWith<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * 拼字練習這次一定要出的字：還沒過關時先出「還沒拼對過的字」，再加常拼錯的；
 * 過關後只優先常拼錯的。
 */
export function dictationPriority(state: GameState, questions: Question[], limit = 5): Question[] {
  const trouble = frequentlyWrong(state, questions).slice(0, limit);
  const unspelled = questions.filter((q) => (state.questionStats[q.id]?.right ?? 0) < 1);
  if (unspelled.length === 0) return trouble;
  // 還沒拼對過、又常拼錯的排最前面
  const first = trouble.filter((q) => unspelled.includes(q));
  return [...first, ...unspelled.filter((q) => !first.includes(q))];
}
