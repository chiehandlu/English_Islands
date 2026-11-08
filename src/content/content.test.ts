import { describe, expect, it } from "vitest";
import { FLOWS } from "./flows";
import {
  CORE_KINDS,
  ISLANDS,
  UNITS,
  coreIslandsOfUnit,
  originKind,
  questionsOfKind,
  reviewIslandOfUnit,
} from "./islands";

/**
 * 內容規則（見 CLAUDE.md 與 docs/content-format.md）的自動檢查。
 * 「人寫的」規則查 UNITS（uNN.json）；拼字練習與複習島是程式產生的，另外檢查。
 */
describe("content", () => {
  const buildings = ISLANDS.flatMap((i) => i.buildings);
  const authored = buildings.filter((b) => !b.generated);
  const questions = buildings.flatMap((b) => b.questions);

  it("has unique ids across units, islands, buildings and questions", () => {
    const ids = [
      ...UNITS.map((u) => u.id),
      ...ISLANDS.map((i) => i.id),
      ...buildings.map((b) => b.id),
      ...questions.map((q) => q.id),
      ...FLOWS.map((f) => f.id),
    ];
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  it("numbers units and islands in order and places islands on distinct hexes", () => {
    UNITS.forEach((u, i) => {
      if (i > 0) expect(u.number).toBeGreaterThan(UNITS[i - 1].number);
    });
    ISLANDS.forEach((island, i) => expect(island.number).toBe(i + 1));
    const coords = ISLANDS.map((i) => i.axial.join(","));
    expect(new Set(coords).size).toBe(coords.length);
  });

  it("gives every unit three authored islands of distinct kinds plus a derived review island", () => {
    for (const u of UNITS) {
      expect(u.islands, u.id).toHaveLength(3);
      expect(new Set(u.islands.map((i) => i.kind)).size).toBe(3);
      expect(
        coreIslandsOfUnit(u)
          .map((i) => i.kind)
          .sort(),
      ).toEqual([...CORE_KINDS].sort());
      const review = reviewIslandOfUnit(u);
      expect(review, u.id).toBeDefined();
      expect(review!.buildings.map((b) => b.reviewKind).sort()).toEqual([...CORE_KINDS].sort());
      for (const b of review!.buildings) expect(b.generated).toBe("review");
    }
  });

  it("keeps buildings between 1 and 5 per island so they fit the hex slots", () => {
    for (const island of ISLANDS) {
      expect(island.buildings.length, island.id).toBeGreaterThanOrEqual(1);
      expect(island.buildings.length, island.id).toBeLessThanOrEqual(5);
    }
    // 單字島最多 4 棟人寫的，第 5 棟留給拼字練習
    for (const u of UNITS) {
      const vocab = u.islands.find((i) => i.kind === "vocab")!;
      expect(vocab.buildings.length, u.id).toBeLessThanOrEqual(4);
    }
  });

  it("adds a dictation building to every vocab island with the unit's words", () => {
    for (const u of UNITS) {
      const vocab = coreIslandsOfUnit(u).find((i) => i.kind === "vocab")!;
      const spell = vocab.buildings.find((b) => b.generated === "dictation");
      expect(spell, u.id).toBeDefined();
      expect(spell!.questions.length).toBeGreaterThanOrEqual(5);
      for (const q of spell!.questions) {
        expect(q.type).toBe("spell");
        if (q.type === "spell") {
          expect(q.mode).toBe("dictation");
          expect(q.say, q.id).toBeTruthy();
          expect(q.answer).toMatch(/^[a-z' ]+$/);
        }
      }
    }
  });

  it("gives every authored building 5–12 questions and a non-empty intro", () => {
    for (const b of authored) {
      expect(b.questions.length, b.id).toBeGreaterThanOrEqual(5);
      expect(b.questions.length, b.id).toBeLessThanOrEqual(12);
    }
    for (const b of buildings) {
      expect(b.intro.length, b.id).toBeGreaterThan(0);
      expect(b.emoji.length, b.id).toBeGreaterThan(0);
    }
  });

  it("knows which core island every question came from", () => {
    for (const u of UNITS) {
      for (const kind of CORE_KINDS) {
        const pool = questionsOfKind(u, kind);
        expect(pool.length, `${u.id} ${kind}`).toBeGreaterThan(0);
        for (const q of pool) expect(originKind(q.id), q.id).toBe(kind);
      }
    }
  });

  it("has well-formed questions", () => {
    for (const q of questions) {
      switch (q.type) {
        case "choice":
        case "listen":
          expect(q.options.length, q.id).toBeGreaterThanOrEqual(2);
          expect(q.options.length, q.id).toBeLessThanOrEqual(4);
          expect(q.answer, q.id).toBeGreaterThanOrEqual(0);
          expect(q.answer, q.id).toBeLessThan(q.options.length);
          expect(new Set(q.options).size, q.id).toBe(q.options.length);
          if (q.type === "listen") expect(q.say.length, q.id).toBeGreaterThan(0);
          break;
        case "spell":
          expect(q.answer, q.id).toMatch(/^[a-z' ]+$/);
          expect(q.answer.replace(/\s/g, "").length, q.id).toBeLessThanOrEqual(14);
          break;
        case "order": {
          expect(q.tokens.length, q.id).toBeGreaterThanOrEqual(3);
          expect(q.tokens.join(" "), q.id).toBe(q.answer);
          break;
        }
        case "match":
          expect(q.pairs.length, q.id).toBeGreaterThanOrEqual(2);
          expect(q.pairs.length, q.id).toBeLessThanOrEqual(5);
          expect(new Set(q.pairs.map((p) => p[1])).size, q.id).toBe(q.pairs.length);
          break;
        case "yesno":
          expect(typeof q.answer, q.id).toBe("boolean");
          break;
      }
      if (q.explain) expect(q.explain.length, q.id).toBeLessThanOrEqual(60);
    }
  });

  it("gives every reading building a match question so keys can drop", () => {
    for (const island of ISLANDS.filter((i) => i.kind === "reading")) {
      for (const b of island.buildings) {
        expect(
          b.questions.some((q) => q.type === "match"),
          b.id,
        ).toBe(true);
      }
    }
  });

  it("mixes question types inside an authored building", () => {
    for (const b of authored) {
      const types = new Set(b.questions.map((q) => q.type));
      expect(types.size, b.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("connects flows to existing islands", () => {
    const islandIds = ISLANDS.map((i) => i.id);
    for (const f of FLOWS) {
      for (const id of [...f.from, ...f.to]) expect(islandIds, f.id).toContain(id);
    }
  });
});
