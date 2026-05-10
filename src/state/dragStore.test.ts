import { describe, it, expect, vi } from "vitest";
import { createDragStore } from "./dragStore";

describe("dragStore", () => {
  it("is inactive initially", () => {
    const s = createDragStore();
    expect(s.get().active).toBe(false);
  });

  it("start activates", () => {
    const s = createDragStore();
    s.start(3);
    expect(s.get()).toEqual({ active: true, fromIndex: 3, dropTarget: null });
  });

  it("setDropTarget updates while active", () => {
    const s = createDragStore();
    s.start(0);
    s.setDropTarget(2);
    expect(s.get().dropTarget).toBe(2);
  });

  it("end resets state", () => {
    const s = createDragStore();
    s.start(0);
    s.end();
    expect(s.get().active).toBe(false);
  });

  it("queues a function while active and flushes on end", () => {
    const s = createDragStore();
    const fn = vi.fn();
    s.start(0);
    s.runOrQueue(fn);
    expect(fn).not.toHaveBeenCalled();
    s.end();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("runs immediately when not active", () => {
    const s = createDragStore();
    const fn = vi.fn();
    s.runOrQueue(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
