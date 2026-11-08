import { describe, expect, it } from "vitest";
import { createInitialState } from "./engine";
import { addDays, addMistake, dueMistakes, intervalFor, resolveMistake } from "./review";

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
});
