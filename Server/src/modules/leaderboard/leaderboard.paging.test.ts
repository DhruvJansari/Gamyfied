import { describe, expect, it } from "vitest";

import { PAGE_SIZE, PODIUM_SIZE } from "./boards.config";
import { lastPageOf, pageBounds, pageOfRank, splitPage, topPercent } from "./leaderboard.paging";

describe("pageBounds", () => {
  it("page 1 starts at 0 and pages never overlap or leave a gap", () => {
    expect(pageBounds(1)).toEqual({ start: 0, stop: PAGE_SIZE - 1 });
    expect(pageBounds(2).start).toBe(pageBounds(1).stop + 1);
    expect(pageBounds(7).start).toBe(pageBounds(6).stop + 1);
  });

  it("pages inside a tier's rank range and clips the last page to it", () => {
    const tierA = { from: 21, to: 200 };
    expect(pageBounds(1, tierA)).toEqual({ start: 20, stop: 69 });
    expect(pageBounds(4, tierA)).toEqual({ start: 170, stop: 199 });
    const past = pageBounds(5, tierA);
    expect(past.stop).toBeLessThan(past.start);
  });

  it("rejects page 0 and fractions", () => {
    expect(() => pageBounds(0)).toThrow(RangeError);
    expect(() => pageBounds(1.5)).toThrow(RangeError);
  });
});

describe("lastPageOf", () => {
  it("counts the pages a scope holds, never below one", () => {
    expect(lastPageOf({ from: 1, to: 121 })).toBe(3);
    expect(lastPageOf({ from: 21, to: 200 })).toBe(4);
    expect(lastPageOf({ from: 1, to: 50 })).toBe(1);
    expect(lastPageOf({ from: 1, to: 0 })).toBe(1);
  });
});

describe("pageOfRank", () => {
  it("maps the boundaries of a page to that page", () => {
    expect(pageOfRank(1)).toBe(1);
    expect(pageOfRank(PAGE_SIZE)).toBe(1);
    expect(pageOfRank(PAGE_SIZE + 1)).toBe(2);
    expect(pageOfRank(PAGE_SIZE * 3)).toBe(3);
  });
});

describe("splitPage", () => {
  const rows = Array.from({ length: PAGE_SIZE }, (_, i) => i + 1);

  it("carves the podium out of page 1 without renumbering", () => {
    const { podium, rows: rest } = splitPage(rows, 1);
    expect(podium).toEqual(rows.slice(0, PODIUM_SIZE));
    expect(rest[0]).toBe(PODIUM_SIZE + 1);
    expect(podium.length + rest.length).toBe(PAGE_SIZE);
  });

  it("leaves other pages whole", () => {
    expect(splitPage(rows, 2)).toEqual({ podium: [], rows });
  });

  it("copes with a short first page", () => {
    expect(splitPage([1, 2], 1)).toEqual({ podium: [1, 2], rows: [] });
    expect(splitPage([], 1)).toEqual({ podium: [], rows: [] });
  });
});

describe("topPercent", () => {
  it("rank 1 is the top 1% even on a tiny board, and the last rank is 100%", () => {
    expect(topPercent(1, 1)).toBe(100);
    expect(topPercent(1, 500)).toBe(1);
    expect(topPercent(500, 500)).toBe(100);
    expect(topPercent(12, 100)).toBe(12);
    expect(topPercent(13, 1000)).toBe(2);
  });
});
