import { describe, expect, it } from "vitest";
import {
  correctAnswerText,
  createSession,
  isCorrect,
  isFinished,
  makeItem,
  rng,
  spellTiles,
  submit,
  summary,
} from "./quiz";
import type { Question } from "./types";

const choice: Question = {
  id: "c1",
  type: "choice",
  prompt: "The pilot ___ planes.",
  options: ["flies", "fly", "flys"],
  answer: 0,
};
const spell: Question = { id: "s1", type: "spell", prompt: "獸醫", answer: "vet" };
const order: Question = {
  id: "o1",
  type: "order",
  prompt: "排句子",
  tokens: ["The", "cook", "makes", "food."],
  answer: "The cook makes food.",
};
const yesno: Question = { id: "y1", type: "yesno", prompt: "The sweater is $30.", answer: true };
const match: Question = {
  id: "m1",
  type: "match",
  prompt: "連連看",
  pairs: [
    ["cashier", "supermarket"],
    ["vet", "animal hospital"],
  ],
};

describe("quiz", () => {
  it("checks every question type", () => {
    expect(isCorrect(choice, "flies")).toBe(true);
    expect(isCorrect(choice, "fly")).toBe(false);
    expect(isCorrect(spell, " VET ")).toBe(true);
    expect(isCorrect(spell, "vat")).toBe(false);
    expect(isCorrect(order, "the cook makes food.")).toBe(true);
    expect(isCorrect(order, "The cook food makes.")).toBe(false);
    expect(isCorrect(yesno, true)).toBe(true);
    expect(isCorrect(yesno, false)).toBe(false);
    expect(isCorrect(match, { cashier: "supermarket", vet: "animal hospital" })).toBe(true);
    expect(isCorrect(match, { cashier: "animal hospital", vet: "supermarket" })).toBe(false);
  });

  it("shuffles options but keeps the same set", () => {
    const item = makeItem(choice, rng(7));
    expect([...item.options].sort()).toEqual([...choice.options].sort());
    const ordered = makeItem(order, rng(7));
    expect(ordered.shuffled.join(" ")).not.toBe(order.tokens.join(" "));
    expect([...ordered.shuffled].sort()).toEqual([...order.tokens].sort());
  });

  it("is deterministic for a seed and caps the question count", () => {
    const questions = [choice, spell, order, yesno, match];
    const a = createSession("b", questions, 42, 3);
    const b = createSession("b", questions, 42, 3);
    expect(a.items.map((i) => i.question.id)).toEqual(b.items.map((i) => i.question.id));
    expect(a.items).toHaveLength(3);
  });

  it("tracks first-try results and finishes", () => {
    let s = createSession("b", [choice, spell], 1);
    s = submit(s, true);
    s = submit(s, false);
    expect(isFinished(s)).toBe(true);
    expect(summary(s)).toEqual({ total: 2, correct: 1, ratio: 0.5 });
    expect(submit(s, true).results).toHaveLength(2);
  });

  it("renders the correct answer for feedback", () => {
    expect(correctAnswerText(choice)).toBe("flies");
    expect(correctAnswerText(yesno)).toBe("Yes");
    expect(correctAnswerText(match)).toContain("cashier → supermarket");
  });

  it("builds spelling tiles with all answer letters plus distractors", () => {
    const tiles = spellTiles("post office", rng(3));
    expect(tiles).toHaveLength("postoffice".length + 3);
    for (const c of "postoffice") expect(tiles).toContain(c);
  });
});
