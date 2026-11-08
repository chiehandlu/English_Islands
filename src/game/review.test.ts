import { describe, expect, it } from "vitest";
import { UNITS, questionsOfKind } from "@/content/islands";
import { createInitialState } from "./engine";
import {
  addDays,
  addMistake,
  dueMistakes,
  frequentlyWrong,
  intervalFor,
  recordAnswer,
  resolveMistake,
  reviewSet,
  statOf,
  troubleScore,
} from "./review";
import type { Question } from "./types";

describe("review", () => {
  it("adds days across month boundaries", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 2)).toBe("2027-01-02");
  });

  it("schedules a wrong answer for tomorrow and later ones further out", () => {
    let s = addMistake(createInitialState(), "q1", "b1", "2026-11-08");
    expect(s.mistakes[0]).toMatchObject({ wrongCount: 1, dueDate: "2026-11-09" });
    s = addMistake(s, "q1", "b1", "2026-11-09");
    expect(s.mistakes).toHaveLength(1);
    expect(s.mistakes[0]).toMatchObject({ wrongCount: 2, dueDate: "2026-11-11" });
    expect(intervalFor(20)).toBe(7);
  });

  it("returns only due mistakes and removes resolved ones", () => {
    let s = addMistake(createInitialState(), "q1", "b1", "2026-11-08");
    s = addMistake(s, "q2", "b1", "2026-11-08");
    s = addMistake(s, "q2", "b1", "2026-11-09");
    expect(dueMistakes(s, "2026-11-08")).toHaveLength(0);
    expect(dueMistakes(s, "2026-11-09").map((m) => m.questionId)).toEqual(["q1"]);
    expect(dueMistakes(s, "2026-11-11")).toHaveLength(2);
    s = resolveMistake(s, "q1");
    expect(s.mistakes.map((m) => m.questionId)).toEqual(["q2"]);
  });

  it("counts right and wrong answers per question", () => {
    let s = createInitialState("2026-11-08");
    expect(statOf(s, "q1")).toEqual({ wrong: 0, right: 0, lastWrong: null });
    s = recordAnswer(s, "q1", false, "2026-11-08");
    s = recordAnswer(s, "q1", false, "2026-11-09");
    s = recordAnswer(s, "q1", true, "2026-11-10");
    expect(statOf(s, "q1")).toEqual({ wrong: 2, right: 1, lastWrong: "2026-11-09" });
    expect(troubleScore(statOf(s, "q1"))).toBe(3);
  });

  it("ranks frequently wrong questions first and drops ones answered right enough", () => {
    const qs: Question[] = ["a", "b", "c", "d"].map((id) => ({
      id,
      type: "spell",
      prompt: id,
      answer: id,
    }));
    let s = createInitialState("2026-11-08");
    // a：錯 3 對 0；b：錯 1 對 0（較近期）；c：錯 1 對 2（已抵銷）；d：沒答過
    for (let i = 0; i < 3; i++) s = recordAnswer(s, "a", false, "2026-11-01");
    s = recordAnswer(s, "b", false, "2026-11-08");
    s = recordAnswer(s, "c", false, "2026-11-02");
    s = recordAnswer(s, "c", true, "2026-11-03");
    s = recordAnswer(s, "c", true, "2026-11-04");
    expect(frequentlyWrong(s, qs).map((q) => q.id)).toEqual(["a", "b"]);
  });

  it("builds a review set with trouble questions first and fills the rest from the same kind", () => {
    const unit = UNITS[0];
    const pool = questionsOfKind(unit, "grammar");
    let s = createInitialState("2026-11-08");
    const trouble = pool.slice(0, 3);
    for (const q of trouble) {
      s = recordAnswer(s, q.id, false, "2026-11-07");
      s = recordAnswer(s, q.id, false, "2026-11-08");
    }
    const set = reviewSet(s, unit, "grammar", "2026-11-08", 10);
    expect(set.troubleCount).toBe(3);
    expect(set.questions).toHaveLength(10);
    expect(
      set.questions
        .slice(0, 3)
        .map((q) => q.id)
        .sort(),
    ).toEqual(trouble.map((q) => q.id).sort());
    expect(new Set(set.questions.map((q) => q.id)).size).toBe(10);
    for (const q of set.questions) expect(pool).toContain(q);
    // 同一天同一組
    const again = reviewSet(s, unit, "grammar", "2026-11-08", 10);
    expect(again.questions.map((q) => q.id)).toEqual(set.questions.map((q) => q.id));
    // 常錯題超過上限時只取前 limit 題
    expect(reviewSet(s, unit, "grammar", "2026-11-08", 2).troubleCount).toBe(2);
  });
});
