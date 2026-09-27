import { describe, expect, it } from "vitest";

import { decodeTotal, encodeBoardScore, MAX_TOTAL, TIE_EPOCH_MS } from "./board-score";

const at = (iso: string) => new Date(iso);

describe("encodeBoardScore", () => {
  it("a higher total always wins, whatever the dates", () => {
    const later = encodeBoardScore(1_201, at("2030-12-31T23:59:59Z"));
    const earlier = encodeBoardScore(1_200, at("2026-01-01T00:00:00Z"));
    expect(later).toBeGreaterThan(earlier);
  });

  it("at equal totals, whoever reached it first ranks higher", () => {
    const first = encodeBoardScore(1_200, at("2026-03-01T10:00:00Z"));
    const second = encodeBoardScore(1_200, at("2026-03-01T10:00:01Z"));
    expect(first).toBeGreaterThan(second);
  });

  it("same total and same second encode identically (Redis member order decides)", () => {
    expect(encodeBoardScore(1_200, at("2026-03-01T10:00:00.100Z"))).toBe(encodeBoardScore(1_200, at("2026-03-01T10:00:00.900Z")));
  });

  it("dates before the epoch count as reached first", () => {
    const ancient = encodeBoardScore(1_000, at("2020-01-01T00:00:00Z"));
    const epoch = encodeBoardScore(1_000, new Date(TIE_EPOCH_MS));
    const later = encodeBoardScore(1_000, at("2026-01-01T00:00:01Z"));
    expect(ancient).toBe(epoch);
    expect(epoch).toBeGreaterThan(later);
  });

  it("round-trips the total through decodeTotal, including the extremes", () => {
    for (const total of [0, 1, 1_000, 1_337, 65_535, MAX_TOTAL]) {
      for (const date of [at("2020-01-01T00:00:00Z"), at("2026-06-15T12:34:56Z"), at("2090-01-01T00:00:00Z")]) {
        expect(decodeTotal(encodeBoardScore(total, date))).toBe(total);
      }
    }
  });

  it("stays inside the exactly-representable integer range", () => {
    expect(Number.isSafeInteger(encodeBoardScore(MAX_TOTAL, at("2020-01-01T00:00:00Z")))).toBe(true);
    expect(encodeBoardScore(MAX_TOTAL, at("2020-01-01T00:00:00Z"))).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
  });

  it("rejects totals outside the budget", () => {
    expect(() => encodeBoardScore(-1, new Date())).toThrow(RangeError);
    expect(() => encodeBoardScore(MAX_TOTAL + 1, new Date())).toThrow(RangeError);
    expect(() => encodeBoardScore(1.5, new Date())).toThrow(RangeError);
  });
});
