import { describe, expect, it } from "vitest";

import { TIER_LETTERS, TIER_NAMES, TIER_RULES } from "./tier.config";
import { assertContiguousBands, tierBounds, tierForRank } from "./tier.engine";

const TOTAL = 100_000;

describe("tierForRank", () => {
  it("rank 1 is S++ and a huge rank is E, each carrying its tier name", () => {
    expect(tierForRank(1, TOTAL)).toMatchObject({ tier: "S", label: "S++", name: TIER_NAMES.S, from: 1, to: 3 });
    expect(tierForRank(5_000_000, TOTAL)).toMatchObject({ tier: "E", label: "E", name: TIER_NAMES.E, from: 20_001, to: null });
  });

  it.each([
    [3, "S++", 4, "S+"],
    [6, "S+", 7, "S"],
    [10, "S", 11, "S−"],
    [20, "S−", 21, "A+"],
    [60, "A+", 61, "A"],
    [120, "A", 121, "A−"],
    [200, "A−", 201, "B+"],
    [400, "B+", 401, "B"],
    [700, "B", 701, "B−"],
    [1_000, "B−", 1_001, "C"],
    [5_000, "C", 5_001, "D"],
    [20_000, "D", 20_001, "E"],
  ])("rank %i is %s and rank %i is %s", (last, lastLabel, first, firstLabel) => {
    expect(tierForRank(last, TOTAL).label).toBe(lastLabel);
    expect(tierForRank(first, TOTAL).label).toBe(firstLabel);
  });

  it("S stays twenty chairs regardless of how many are ranked", () => {
    for (const total of [1, 20, 500, 5_000_000]) {
      expect(tierForRank(20, total).tier).toBe("S");
      expect(tierForRank(21, total).tier).toBe("A");
    }
  });

  it("rejects ranks that are not positive integers", () => {
    expect(() => tierForRank(0, TOTAL)).toThrow(RangeError);
    expect(() => tierForRank(-3, TOTAL)).toThrow(RangeError);
    expect(() => tierForRank(1.5, TOTAL)).toThrow(RangeError);
    expect(() => tierForRank(1, -1)).toThrow(RangeError);
  });
});

describe("tierBounds", () => {
  it("spans every band of a letter and caps the open-ended one at the board size", () => {
    expect(tierBounds("S", TOTAL)).toEqual({ from: 1, to: 20 });
    expect(tierBounds("A", TOTAL)).toEqual({ from: 21, to: 200 });
    expect(tierBounds("E", TOTAL)).toEqual({ from: 20_001, to: TOTAL });
  });

  it("caps a closed tier at the board size and reports an unreached tier as empty", () => {
    expect(tierBounds("A", 121)).toEqual({ from: 21, to: 121 });
    expect(tierBounds("B", 121)).toBeNull();
    expect(tierBounds("E", 121)).toBeNull();
  });

  it("tiles the whole board with no gaps between letters", () => {
    let expectedFrom = 1;
    for (const letter of TIER_LETTERS) {
      const bounds = tierBounds(letter, TOTAL)!;
      expect(bounds.from).toBe(expectedFrom);
      expectedFrom = bounds.to + 1;
    }
    expect(expectedFrom).toBe(TOTAL + 1);
  });
});

describe("TIER_RULES", () => {
  it("bands are contiguous from rank 1 with no gaps or overlaps and end open", () => {
    expect(() => assertContiguousBands(TIER_RULES.bands)).not.toThrow();
  });

  it("assertContiguousBands catches a gap, an overlap and a closed last band", () => {
    expect(() => assertContiguousBands([{ tier: "S", label: "S", from: 1, to: 3 }, { tier: "A", label: "A", from: 5, to: null }])).toThrow(/starts at 5/);
    expect(() => assertContiguousBands([{ tier: "S", label: "S", from: 1, to: 3 }, { tier: "A", label: "A", from: 3, to: null }])).toThrow(/starts at 3/);
    expect(() => assertContiguousBands([{ tier: "S", label: "S", from: 1, to: 3 }])).toThrow(/open-ended/);
  });

  it("labels are unique and at most four characters (rank_snapshots.tier is VarChar(4))", () => {
    const labels = TIER_RULES.bands.map((b) => b.label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels.every((l) => l.length <= 4)).toBe(true);
  });
});
