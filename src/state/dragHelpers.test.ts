import { describe, it, expect } from "vitest";
import { resolveDragSet, remapSelectionByPath } from "./dragHelpers";

describe("resolveDragSet", () => {
  it("returns just the pressed index when pressed card is NOT selected", () => {
    const out = resolveDragSet(5, new Set([1, 2]));
    expect(out).toEqual({ indices: [5], replaceSelection: true });
  });

  it("returns the whole selection when pressed card IS in selection", () => {
    const out = resolveDragSet(2, new Set([1, 2, 4]));
    expect(out).toEqual({ indices: [1, 2, 4], replaceSelection: false });
  });

  it("returns just the pressed index when selection is empty", () => {
    const out = resolveDragSet(3, new Set());
    expect(out).toEqual({ indices: [3], replaceSelection: true });
  });

  it("returned indices are sorted ascending", () => {
    const out = resolveDragSet(7, new Set([7, 1, 4, 9]));
    expect(out.indices).toEqual([1, 4, 7, 9]);
  });
});

describe("remapSelectionByPath", () => {
  const card = (path: string) => ({ path, synopsis: "", status: "todo" as const, color: null });

  it("maps old indices through path to new indices", () => {
    const before = [card("a"), card("b"), card("c"), card("d")];
    const after = [card("c"), card("a"), card("b"), card("d")];
    const out = remapSelectionByPath(before, after, new Set([0, 2]));
    expect(Array.from(out).sort((x, y) => x - y)).toEqual([0, 1]);
  });

  it("drops paths missing from the new array", () => {
    const before = [card("a"), card("b")];
    const after = [card("b")];
    const out = remapSelectionByPath(before, after, new Set([0, 1]));
    expect(Array.from(out)).toEqual([0]);
  });

  it("returns empty set when input is empty", () => {
    const out = remapSelectionByPath([card("a")], [card("a")], new Set());
    expect(out.size).toBe(0);
  });
});
