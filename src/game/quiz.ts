import type { Question } from "./types";

/**
 * 一次挑戰（session）的純規則：出題順序、選項洗牌、判斷對錯、算星。
 * 介面只呼叫這裡的函式，不自己比對答案。
 */

/** 小朋友給的答案：選擇類是選項文字、拼字與重組是字串、是非是布林、配對是左→右的對應表。 */
export type Answer = string | boolean | Record<string, string>;

export interface QuizItem {
  question: Question;
  /** 選擇／聽力題洗牌後的選項順序；其他題型為空 */
  options: string[];
  /** 重組題打散後的字；配對題打散後的右欄 */
  shuffled: string[];
}

export interface QuizSession {
  buildingId: string | null;
  items: QuizItem[];
  index: number;
  /** 每題第一次作答是否正確（只算第一次） */
  results: boolean[];
}

export const MAX_QUESTIONS = 10;

/** 可重現的亂數（mulberry32），讓測試和同一個 seed 的出題一致。 */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 洗牌直到順序和原本不同（只有一個元素時原樣回傳）。 */
function shuffleDifferent<T>(items: T[], random: () => number): T[] {
  if (items.length < 2) return [...items];
  for (let tries = 0; tries < 8; tries++) {
    const out = shuffle(items, random);
    if (out.some((v, i) => v !== items[i])) return out;
  }
  return [...items].reverse();
}

export function makeItem(question: Question, random: () => number): QuizItem {
  switch (question.type) {
    case "choice":
    case "listen":
      return { question, options: shuffle(question.options, random), shuffled: [] };
    case "order":
      return { question, options: [], shuffled: shuffleDifferent(question.tokens, random) };
    case "match":
      return {
        question,
        options: [],
        shuffled: shuffleDifferent(
          question.pairs.map((p) => p[1]),
          random,
        ),
      };
    default:
      return { question, options: [], shuffled: [] };
  }
}

/**
 * 建立一次挑戰。priority 裡的題目（常錯的）一定會被選進來，其餘隨機補到 limit，最後整體洗牌。
 */
export function createSession(
  buildingId: string | null,
  questions: Question[],
  seed = Date.now(),
  limit = MAX_QUESTIONS,
  priority: string[] = [],
): QuizSession {
  const random = rng(seed);
  const must = priority
    .map((id) => questions.find((q) => q.id === id))
    .filter((q): q is Question => Boolean(q))
    .slice(0, limit);
  const rest = shuffle(
    questions.filter((q) => !must.includes(q)),
    random,
  ).slice(0, Math.max(0, limit - must.length));
  const picked = shuffle([...must, ...rest], random);
  return {
    buildingId,
    items: picked.map((q) => makeItem(q, random)),
    index: 0,
    results: [],
  };
}

const normalize = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

/** 判斷答案；拼字與重組忽略大小寫與多餘空白。 */
export function isCorrect(question: Question, answer: Answer): boolean {
  switch (question.type) {
    case "choice":
    case "listen":
      return typeof answer === "string" && answer === question.options[question.answer];
    case "spell":
      // 字母磚沒有空白鍵，所以 post office 拼成 postoffice 也算對
      return (
        typeof answer === "string" &&
        normalize(answer).replace(/ /g, "") === normalize(question.answer).replace(/ /g, "")
      );
    case "order":
      return typeof answer === "string" && normalize(answer) === normalize(question.answer);
    case "yesno":
      return typeof answer === "boolean" && answer === question.answer;
    case "match":
      return (
        typeof answer === "object" &&
        answer !== null &&
        question.pairs.every(([left, right]) => answer[left] === right)
      );
  }
}

/** 正確答案的顯示文字（答錯時給小朋友看）。 */
export function correctAnswerText(question: Question): string {
  switch (question.type) {
    case "choice":
    case "listen":
      return question.options[question.answer];
    case "spell":
    case "order":
      return question.answer;
    case "yesno":
      return question.answer ? "Yes" : "No";
    case "match":
      return question.pairs.map(([l, r]) => `${l} → ${r}`).join("、");
  }
}

/** 答錯時要朗讀的英文：有英文正解就唸正解，否則唸題目的 say。 */
export function correctAnswerSpeech(question: Question): string | undefined {
  switch (question.type) {
    case "spell":
    case "order":
      return question.answer;
    case "choice":
    case "listen": {
      const text = question.options[question.answer];
      return /[A-Za-z]/.test(text) ? text : question.say;
    }
    case "yesno":
      return question.say;
    case "match":
      return undefined;
  }
}

export function currentItem(session: QuizSession): QuizItem | undefined {
  return session.items[session.index];
}

/** 記錄這一題的結果並前進。 */
export function submit(session: QuizSession, correct: boolean): QuizSession {
  if (session.index >= session.items.length) return session;
  return { ...session, results: [...session.results, correct], index: session.index + 1 };
}

export function isFinished(session: QuizSession): boolean {
  return session.index >= session.items.length;
}

export function summary(session: QuizSession) {
  const total = session.items.length;
  const correct = session.results.filter(Boolean).length;
  return { total, correct, ratio: total === 0 ? 0 : correct / total };
}

/** 拼字題的字母磚：答案的字母加上幾個干擾字母，再洗牌。 */
export function spellTiles(answer: string, random: () => number, extra = 3): string[] {
  const letters = answer.replace(/\s+/g, "").toLowerCase().split("");
  const pool = "abcdefghijklmnopqrstuvwxyz";
  const distractors: string[] = [];
  while (distractors.length < extra) {
    const c = pool[Math.floor(random() * pool.length)];
    if (!letters.includes(c)) distractors.push(c);
  }
  return shuffle([...letters, ...distractors], random);
}
