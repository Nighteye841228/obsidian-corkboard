import { describe, it, expect } from "vitest";
import { createSelectionStore } from "./selectionStore";

describe("selectionStore", () => {
  it("starts empty", () => {
    const s = createSelectionStore();
    expect(Array.from(s.get())).toEqual([]);
  });

  it("plain click selects only one", () => {
    const s = createSelectionStore();
    s.click(2, { meta: false, shift: false });
    expect(Array.from(s.get())).toEqual([2]);
    s.click(5, { meta: false, shift: false });
    expect(Array.from(s.get())).toEqual([5]);
  });

  it("meta-click toggles", () => {
    const s = createSelectionStore();
    s.click(1, { meta: true, shift: false });
    s.click(2, { meta: true, shift: false });
    expect(Array.from(s.get()).sort()).toEqual([1, 2]);
    s.click(1, { meta: true, shift: false });
    expect(Array.from(s.get())).toEqual([2]);
  });

  it("shift-click selects a range from anchor", () => {
    const s = createSelectionStore();
    s.click(2, { meta: false, shift: false });
    s.click(5, { meta: false, shift: true });
    expect(Array.from(s.get()).sort((a,b)=>a-b)).toEqual([2,3,4,5]);
  });

  it("clear removes all", () => {
    const s = createSelectionStore();
    s.click(1, { meta: false, shift: false });
    s.clear();
    expect(Array.from(s.get())).toEqual([]);
  });

  it("notifies subscribers on change", () => {
    const s = createSelectionStore();
    let count = 0;
    const unsub = s.subscribe(() => { count++; });
    s.click(1, { meta: false, shift: false });
    s.click(2, { meta: false, shift: false });
    expect(count).toBe(2);
    unsub();
  });
});
