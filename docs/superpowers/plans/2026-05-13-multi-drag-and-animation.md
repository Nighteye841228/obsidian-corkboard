# Multi-card drag & drag-ghost animation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-card drag (drag whole selection at once) plus a cursor-following ghost preview with stacked-paper + N visual for Obsidian Corkboard plugin.

**Architecture:** Logical drag state (`fromIndices`, `primary`, `dropTarget`) lives in the existing `dragStore`. Cursor x/y lives only in a `DragGhost` ref written directly via `transform` (bypassing the React/Preact reconciler) for 60fps smoothness. A new `CorkboardDocument.reorderMany` handles "contiguous landing with preserved relative order" semantics. Pointer flow uses Pointer Events with a 4 px move threshold to distinguish click from drag. Document-level listeners handle move/up/Escape; `window.blur` cancels stranded drags.

**Tech Stack:** TypeScript, Preact, Pointer Events, vitest, @testing-library/preact, Obsidian plugin API.

**Spec:** `docs/superpowers/specs/2026-05-13-multi-drag-and-animation-design.md`

---

## Task 1: `CorkboardDocument.reorderMany`

**Files:**
- Modify: `src/data/corkboardDocument.ts`
- Test: `src/data/corkboardDocument.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/data/corkboardDocument.test.ts` (inside `describe("CorkboardDocument mutations", ...)` block):

```ts
function makeDocWithPaths(paths: string[]): CorkboardDocument {
  const d = CorkboardDocument.parse("");
  for (const p of paths) d.addCard({ path: p, synopsis: "", status: "todo", color: null });
  return d;
}

it("reorderMany moves a contiguous slice forward", () => {
  const d = makeDocWithPaths(["a", "b", "c", "d", "e"]);
  d.reorderMany([0, 1], 4);
  expect(d.data.cards.map(c => c.path)).toEqual(["c", "d", "a", "b", "e"]);
});

it("reorderMany moves non-contiguous indices preserving relative order", () => {
  const d = makeDocWithPaths(["a", "b", "c", "d", "e"]);
  d.reorderMany([0, 2], 4);
  expect(d.data.cards.map(c => c.path)).toEqual(["b", "d", "a", "c", "e"]);
});

it("reorderMany moves a slice backward (to before original position)", () => {
  const d = makeDocWithPaths(["a", "b", "c", "d", "e"]);
  d.reorderMany([3, 4], 1);
  expect(d.data.cards.map(c => c.path)).toEqual(["a", "d", "e", "b", "c"]);
});

it("reorderMany no-ops when to is within fromIndices", () => {
  const d = makeDocWithPaths(["a", "b", "c", "d"]);
  d.reorderMany([1, 2], 1);
  expect(d.data.cards.map(c => c.path)).toEqual(["a", "b", "c", "d"]);
});

it("reorderMany handles drop at index 0", () => {
  const d = makeDocWithPaths(["a", "b", "c", "d"]);
  d.reorderMany([2, 3], 0);
  expect(d.data.cards.map(c => c.path)).toEqual(["c", "d", "a", "b"]);
});

it("reorderMany handles drop at cards.length (drop-at-end)", () => {
  const d = makeDocWithPaths(["a", "b", "c", "d"]);
  d.reorderMany([0, 1], 4);
  expect(d.data.cards.map(c => c.path)).toEqual(["c", "d", "a", "b"]);
});

it("reorderMany ignores out-of-range indices in fromIndices", () => {
  const d = makeDocWithPaths(["a", "b", "c"]);
  d.reorderMany([0, 99, -1, 2], 3);
  expect(d.data.cards.map(c => c.path)).toEqual(["b", "a", "c"]);
});

it("reorderMany ignores empty fromIndices", () => {
  const d = makeDocWithPaths(["a", "b"]);
  d.reorderMany([], 1);
  expect(d.data.cards.map(c => c.path)).toEqual(["a", "b"]);
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- corkboardDocument`
Expected: 8 new failing tests (`d.reorderMany is not a function`).

- [ ] **Step 3: Implement `reorderMany`**

In `src/data/corkboardDocument.ts`, add this method after `reorder` (around line 60):

```ts
reorderMany(fromIndices: number[], to: number): void {
  const n = this.data.cards.length;
  // Dedupe + sort ascending, drop out-of-range
  const sorted = Array.from(new Set(fromIndices))
    .filter(i => Number.isInteger(i) && i >= 0 && i < n)
    .sort((a, b) => a - b);
  if (sorted.length === 0) return;
  if (to < 0 || to > n) return;
  // Drop-on-self: target index is one of the dragged cards
  if (sorted.includes(to)) return;
  // Capture items in ascending index order (preserves relative order)
  const items = sorted.map(i => this.data.cards[i]!);
  // Remove in descending order so earlier indices remain valid
  for (let k = sorted.length - 1; k >= 0; k--) {
    this.data.cards.splice(sorted[k]!, 1);
  }
  // Adjust insertion point by the count of removed indices that were below `to`
  const shift = sorted.filter(i => i < to).length;
  const insertAt = to - shift;
  this.data.cards.splice(insertAt, 0, ...items);
}
```

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- corkboardDocument`
Expected: all `reorderMany` tests pass, existing tests untouched.

- [ ] **Step 5: Commit**

```bash
git add src/data/corkboardDocument.ts src/data/corkboardDocument.test.ts
git commit -m "feat(doc): add CorkboardDocument.reorderMany for multi-card moves"
```

---

## Task 2: Make `reorder` delegate to `reorderMany`

**Files:**
- Modify: `src/data/corkboardDocument.ts:52-59`

- [ ] **Step 1: Confirm existing reorder test exists**

Run: `npm test -- corkboardDocument -t "reorder moves"`
Expected: PASS (existing `reorder` test still green).

- [ ] **Step 2: Replace `reorder` body to delegate**

In `src/data/corkboardDocument.ts`, replace:

```ts
reorder(from: number, to: number): void {
  if (from === to) return;
  if (from < 0 || from >= this.data.cards.length) return;
  if (to < 0 || to >= this.data.cards.length) return;
  const item = this.data.cards.splice(from, 1)[0];
  if (!item) return;
  this.data.cards.splice(to, 0, item);
}
```

with:

```ts
reorder(from: number, to: number): void {
  // Convert "splice-style to (post-removal index)" to "pre-removal index"
  // that reorderMany expects. When from < to, splice-to refers to the
  // post-removal slot which equals pre-removal (to + 1).
  const preTo = from < to ? to + 1 : to;
  this.reorderMany([from], preTo);
}
```

- [ ] **Step 3: Run all corkboardDocument tests**

Run: `npm test -- corkboardDocument`
Expected: all tests including the existing `reorder moves an item from one index to another` pass.

- [ ] **Step 4: Commit**

```bash
git add src/data/corkboardDocument.ts
git commit -m "refactor(doc): reorder() delegates to reorderMany"
```

---

## Task 3: `CorkboardController.reorderMany` thin delegate

**Files:**
- Modify: `src/state/controller.ts`
- Test: `src/state/controller.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/state/controller.test.ts` inside the `describe("CorkboardController", ...)` block:

```ts
it("reorderMany delegates to doc.reorderMany and notifies", () => {
  const doc = CorkboardDocument.parse("");
  doc.addCard({ path: "1", synopsis: "", status: "todo", color: null });
  doc.addCard({ path: "2", synopsis: "", status: "todo", color: null });
  doc.addCard({ path: "3", synopsis: "", status: "todo", color: null });
  const onChange = vi.fn();
  const c = new CorkboardController({ doc, folderPath: "", gateway: makeGateway(), onChange });
  c.reorderMany([0, 1], 3);
  expect(doc.data.cards.map(x => x.path)).toEqual(["3", "1", "2"]);
  expect(onChange).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test, confirm fail**

Run: `npm test -- controller`
Expected: FAIL (`c.reorderMany is not a function`).

- [ ] **Step 3: Implement on controller**

In `src/state/controller.ts`, add after `reorder` (around line 71):

```ts
reorderMany(fromIndices: number[], to: number): void {
  this.doc.reorderMany(fromIndices, to);
  this.onChange();
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm test -- controller`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/state/controller.ts src/state/controller.test.ts
git commit -m "feat(controller): expose reorderMany"
```

---

## Task 4: `SelectionStore.setAll(indices)`

**Files:**
- Modify: `src/state/selectionStore.ts`
- Test: `src/state/selectionStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/state/selectionStore.test.ts` inside the `describe("selectionStore", ...)` block:

```ts
it("setAll replaces the selection with the given indices", () => {
  const s = createSelectionStore();
  s.click(0, { meta: false, shift: false });
  s.setAll([3, 5, 7]);
  expect(Array.from(s.get()).sort((a,b)=>a-b)).toEqual([3, 5, 7]);
});

it("setAll([]) clears the selection", () => {
  const s = createSelectionStore();
  s.click(1, { meta: false, shift: false });
  s.setAll([]);
  expect(Array.from(s.get())).toEqual([]);
});

it("setAll notifies subscribers once", () => {
  const s = createSelectionStore();
  let count = 0;
  s.subscribe(() => { count++; });
  s.setAll([1, 2, 3]);
  expect(count).toBe(1);
});
```

- [ ] **Step 2: Run tests, confirm fail**

Run: `npm test -- selectionStore`
Expected: FAIL (`s.setAll is not a function`).

- [ ] **Step 3: Implement `setAll`**

In `src/state/selectionStore.ts`:

1. Add `setAll` to the interface (after `clear`):
   ```ts
   setAll(indices: Iterable<number>): void;
   ```

2. Add the implementation inside the returned object (after `clear`):
   ```ts
   setAll(indices) {
     selected = new Set(indices);
     anchor = null;
     notify();
   },
   ```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm test -- selectionStore`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/state/selectionStore.ts src/state/selectionStore.test.ts
git commit -m "feat(selection): add setAll to replace the selection set"
```

---

## Task 5: Extend `DragState` with `fromIndices` and `primary`

**Files:**
- Modify: `src/state/dragStore.ts`
- Test: `src/state/dragStore.test.ts`

This is a **breaking change** to the store's internal API. We rewrite tests and callers in this task plus Task 6 (CardGrid).

- [ ] **Step 1: Update tests to the new shape**

Replace `src/state/dragStore.test.ts` content:

```ts
import { describe, it, expect, vi } from "vitest";
import { createDragStore } from "./dragStore";

describe("dragStore", () => {
  it("is inactive initially", () => {
    const s = createDragStore();
    expect(s.get().active).toBe(false);
    expect(s.get().fromIndices).toEqual([]);
    expect(s.get().primary).toBeNull();
  });

  it("start activates with primary + indices", () => {
    const s = createDragStore();
    s.start(3, [1, 3, 5]);
    expect(s.get()).toEqual({ active: true, primary: 3, fromIndices: [1, 3, 5], dropTarget: null });
  });

  it("setDropTarget updates while active", () => {
    const s = createDragStore();
    s.start(0, [0]);
    s.setDropTarget(2);
    expect(s.get().dropTarget).toBe(2);
  });

  it("end resets state", () => {
    const s = createDragStore();
    s.start(2, [2]);
    s.end();
    expect(s.get()).toEqual({ active: false, primary: null, fromIndices: [], dropTarget: null });
  });

  it("queues a function while active and flushes on end", () => {
    const s = createDragStore();
    const fn = vi.fn();
    s.start(0, [0]);
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
```

- [ ] **Step 2: Run tests, confirm fail**

Run: `npm test -- dragStore`
Expected: FAIL (type mismatch / undefined fields).

- [ ] **Step 3: Replace `src/state/dragStore.ts` body**

```ts
export interface DragState {
  active: boolean;
  fromIndices: number[];   // every card being dragged (includes primary)
  primary: number | null;  // the card the pointer pressed down on
  dropTarget: number | null;
}

export interface DragStore {
  get(): DragState;
  start(primary: number, indices: number[]): void;
  setDropTarget(idx: number | null): void;
  end(): void;
  runOrQueue(fn: () => void): void;
  subscribe(fn: () => void): () => void;
}

export function createDragStore(): DragStore {
  let state: DragState = { active: false, fromIndices: [], primary: null, dropTarget: null };
  const queue: Array<() => void> = [];
  const subs = new Set<() => void>();
  const notify = () => { for (const fn of subs) fn(); };

  return {
    get: () => state,
    start(primary, indices) {
      state = { active: true, primary, fromIndices: indices.slice(), dropTarget: null };
      notify();
    },
    setDropTarget(idx) {
      state = { ...state, dropTarget: idx };
      notify();
    },
    end() {
      state = { active: false, primary: null, fromIndices: [], dropTarget: null };
      notify();
      while (queue.length) {
        const fn = queue.shift()!;
        try { fn(); } catch (e) { console.error("queued vault event handler threw", e); }
      }
    },
    runOrQueue(fn) {
      if (state.active) queue.push(fn);
      else fn();
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
```

- [ ] **Step 4: Run dragStore tests, confirm pass**

Run: `npm test -- dragStore`
Expected: all pass.

- [ ] **Step 5: Run full test suite to find breakages**

Run: `npm test`
Expected: failures in `CardGrid.test.tsx` (uses old `inactiveDrag = { fromIndex: null }` shape) and any callers passing old args to `start`. We will fix these in Task 6 and 7.

- [ ] **Step 6: Commit (broken state OK — next task fixes consumers)**

```bash
git add src/state/dragStore.ts src/state/dragStore.test.ts
git commit -m "refactor(drag): replace fromIndex with fromIndices + primary"
```

---

## Task 6: Update `CardGrid` for the new drag shape

**Files:**
- Modify: `src/view/components/CardGrid.tsx`
- Modify: `src/view/components/CardGrid.test.tsx`

- [ ] **Step 1: Update `CardGrid.tsx`**

Replace lines 12 and 42-52 in `src/view/components/CardGrid.tsx`:

Old prop type (line 12):
```ts
drag: { active: boolean; fromIndex: number | null; dropTarget: number | null };
```

New:
```ts
drag: { active: boolean; fromIndices: number[]; primary: number | null; dropTarget: number | null };
```

Old per-card calculation (lines 42-52):
```ts
{p.cards.map((card, i) => {
    const dragging = p.drag.active && p.drag.fromIndex === i;
    let dropEdge: "before" | "after" | null = null;
    if (
        p.drag.active &&
        p.drag.dropTarget === i &&
        p.drag.fromIndex !== null &&
        p.drag.fromIndex !== p.drag.dropTarget
    ) {
        dropEdge = p.drag.fromIndex < p.drag.dropTarget ? "after" : "before";
    }
```

New:
```ts
{p.cards.map((card, i) => {
    const draggedSet = p.drag.fromIndices;
    const dragging = p.drag.active && draggedSet.includes(i);
    let dropEdge: "before" | "after" | null = null;
    if (
        p.drag.active &&
        p.drag.dropTarget === i &&
        p.drag.primary !== null &&
        !draggedSet.includes(p.drag.dropTarget)
    ) {
        dropEdge = p.drag.primary < p.drag.dropTarget ? "after" : "before";
    }
```

- [ ] **Step 2: Update `CardGrid.test.tsx`**

Find the line:
```ts
const inactiveDrag = { active: false, fromIndex: null, dropTarget: null };
```

Replace with:
```ts
const inactiveDrag = { active: false, fromIndices: [], primary: null, dropTarget: null };
```

If any other test in this file constructs a drag state, apply the same shape update.

- [ ] **Step 3: Remove now-unused `DragLayer` reference**

In `src/view/components/CardGrid.tsx`, delete the `import { DragLayer } from "./DragLayer";` line and the `<DragLayer ... />` render. (We replace it with `<DragGhost>` in Task 9; until then the JSX just doesn't include a drag overlay, which is fine.)

Also remove the `DragLayer` import from the test file if present.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: dragStore and CardGrid tests pass. `CorkboardApp` may still break compile due to old `dragStore.start(i)` calls; fix in Task 7.

- [ ] **Step 5: Run typecheck**

Run: `npx tsc -noEmit -skipLibCheck`
Expected: errors in `CorkboardApp.tsx` only (we tackle that in Task 7).

- [ ] **Step 6: Commit**

```bash
git add src/view/components/CardGrid.tsx src/view/components/CardGrid.test.tsx
git commit -m "refactor(grid): consume fromIndices/primary from DragState"
```

---

## Task 7: Pure helper `resolveDragSet` + `remapSelectionByPath`

**Files:**
- Create: `src/state/dragHelpers.ts`
- Create: `src/state/dragHelpers.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/state/dragHelpers.test.ts`:

```ts
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
    expect(Array.from(out).sort((x,y)=>x-y)).toEqual([0, 1]); // "a"→1, "c"→0
  });

  it("drops paths missing from the new array", () => {
    const before = [card("a"), card("b")];
    const after = [card("b")];
    const out = remapSelectionByPath(before, after, new Set([0, 1]));
    expect(Array.from(out)).toEqual([0]); // only "b" remains
  });

  it("returns empty set when input is empty", () => {
    const out = remapSelectionByPath([card("a")], [card("a")], new Set());
    expect(out.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests, confirm fail**

Run: `npm test -- dragHelpers`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `dragHelpers.ts`**

Create `src/state/dragHelpers.ts`:

```ts
import type { CorkboardCard } from "../types";

export interface DragSet {
  indices: number[];        // sorted ascending
  replaceSelection: boolean; // true → pressed card was NOT in selection; caller should replace selection
}

export function resolveDragSet(pressed: number, selection: ReadonlySet<number>): DragSet {
  if (!selection.has(pressed)) {
    return { indices: [pressed], replaceSelection: true };
  }
  const indices = Array.from(selection).sort((a, b) => a - b);
  return { indices, replaceSelection: false };
}

export function remapSelectionByPath(
  before: CorkboardCard[],
  after: CorkboardCard[],
  selected: ReadonlySet<number>,
): Set<number> {
  const paths = new Set<string>();
  for (const i of selected) {
    const c = before[i];
    if (c) paths.add(c.path);
  }
  const next = new Set<number>();
  after.forEach((c, i) => { if (paths.has(c.path)) next.add(i); });
  return next;
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm test -- dragHelpers`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/state/dragHelpers.ts src/state/dragHelpers.test.ts
git commit -m "feat(drag): resolveDragSet + remapSelectionByPath pure helpers"
```

---

## Task 8: `DragGhost` component + CSS

**Files:**
- Create: `src/view/components/DragGhost.tsx`
- Modify: `styles.css`

This component reads its position via a ref and a document-level `pointermove` listener that's installed by `CorkboardApp` in Task 9. The component itself only owns the DOM shape and the listener lifecycle.

- [ ] **Step 1: Create `DragGhost.tsx`**

`src/view/components/DragGhost.tsx`:

```tsx
import { useRef, useEffect } from "preact/hooks";
import type { CorkboardCard } from "../../types";

export interface DragGhostProps {
  card: CorkboardCard;          // the primary card content
  extraCount: number;           // fromIndices.length - 1
  width: number;
  height: number;
  statusLabel: string;
  // initial transform (offset between pointerdown point and card top-left)
  initialX: number;             // clientX at drag start
  initialY: number;             // clientY at drag start
  offsetX: number;              // pointerdown offset inside the card (clientX - rect.left)
  offsetY: number;
}

function basename(path: string): string {
  const tail = path.split("/").pop() ?? path;
  return tail.replace(/\.md$/i, "");
}

/**
 * A fixed-position visual that follows the cursor during drag.
 * Mounted by CorkboardApp while drag is active; CorkboardApp installs the
 * document-level pointermove listener and updates this element's transform
 * via the ref (bypassing the reconciler).
 */
export function DragGhost(p: DragGhostProps & { ghostRef: (el: HTMLDivElement | null) => void }) {
  const localRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    p.ghostRef(localRef.current);
    return () => p.ghostRef(null);
  }, []);

  const hasStack = p.extraCount > 0;
  const cls = "corkboard-drag-ghost" + (hasStack ? " has-stack" : "");
  const tx = p.initialX - p.offsetX;
  const ty = p.initialY - p.offsetY;
  return (
    <div
      ref={localRef}
      class={cls}
      style={{ width: `${p.width}px`, height: `${p.height}px`, transform: `translate(${tx}px, ${ty}px)` }}
    >
      <div class="corkboard-card__title">{basename(p.card.path)}</div>
      <div class="corkboard-card__status">{p.statusLabel}</div>
      <div class="corkboard-synopsis" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {p.card.synopsis}
      </div>
      {hasStack && <div class="corkboard-drag-ghost__badge">+{p.extraCount}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Add CSS for the ghost**

Append to `styles.css`:

```css
/* Drag ghost — follows cursor while dragging. */
.corkboard-drag-ghost {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 9999;
  background: var(--background-secondary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  padding: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  opacity: 0.92;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: corkboard-ghost-in 120ms ease-out both;
}
@keyframes corkboard-ghost-in {
  from { opacity: 0; transform: translate(0, 0) scale(0.95); }
  to   { opacity: 0.92; }
}
.corkboard-drag-ghost.has-stack::before,
.corkboard-drag-ghost.has-stack::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--background-secondary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  z-index: -1;
}
.corkboard-drag-ghost.has-stack::before { transform: translate(4px, 4px); opacity: 0.7; }
.corkboard-drag-ghost.has-stack::after  { transform: translate(8px, 8px); opacity: 0.45; }
.corkboard-drag-ghost__badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--interactive-accent);
  color: var(--text-on-accent);
  border-radius: 999px;
  padding: 0 6px;
  font-size: 11px;
  line-height: 16px;
  min-width: 18px;
  text-align: center;
  z-index: 1;
}
```

- [ ] **Step 3: Verify the file compiles**

Run: `npx tsc -noEmit -skipLibCheck`
Expected: pre-existing errors in `CorkboardApp.tsx` (Task 5 left it broken). No NEW errors in `DragGhost.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/view/components/DragGhost.tsx styles.css
git commit -m "feat(view): DragGhost component + ghost CSS"
```

---

## Task 9: Rewire `CorkboardApp` pointer flow

This is the integration task. It wires together: drag-set resolution, 4 px threshold, document-level listeners, ghost mount, dropTarget via elementFromPoint (skipping dragged cards), commit reorderMany, selection remap, Escape / blur cancel.

**Files:**
- Modify: `src/view/components/CorkboardApp.tsx`
- Modify: `src/view/components/Card.tsx` (already forwards `evt`, no logic change but verify)

- [ ] **Step 1: Verify Card forwards pointerdown evt**

Read `src/view/components/Card.tsx` around line 113. It already calls `props.onPointerDown?.(props.index, e)` — pass-through is fine. No edit needed.

- [ ] **Step 2: Replace `CorkboardApp.tsx` body**

Replace the full content of `src/view/components/CorkboardApp.tsx` with:

```tsx
import { useEffect, useRef, useState } from "preact/hooks";
import type { App } from "obsidian";
import type { CorkboardController } from "../../state/controller";
import type { SelectionStore } from "../../state/selectionStore";
import type { DragStore } from "../../state/dragStore";
import type { CorkboardSettings, CorkboardCard } from "../../types";
import { Toolbar } from "./Toolbar";
import { CardGrid } from "./CardGrid";
import { DragGhost } from "./DragGhost";
import { buildCardMenu, buildEmptyAreaMenu } from "./contextMenus";
import { resolveDragSet, remapSelectionByPath } from "../../state/dragHelpers";

const DRAG_THRESHOLD_PX = 4;

export interface CorkboardAppProps {
  app: App;
  controller: CorkboardController;
  selectionStore: SelectionStore;
  dragStore: DragStore;
  settings: CorkboardSettings;
  pathExists: (path: string) => boolean;
  listFolderMd: () => string[];
  openMd: (path: string) => void;
  onRebindCard: (index: number) => void;
  renameFile: (oldPath: string, newName: string) => Promise<void>;
}

interface PendingDrag {
  pressX: number;
  pressY: number;
  primary: number;
  indices: number[];
  offsetX: number;            // pointer offset inside the primary card at press time
  offsetY: number;
  cardsSnapshot: CorkboardCard[];
}

interface InstalledListeners {
  move: (e: PointerEvent) => void;
  up: (e: PointerEvent) => void;
  key: (e: KeyboardEvent) => void;
  blur: () => void;
}

export function CorkboardApp(p: CorkboardAppProps) {
  const [, setTick] = useState(0);
  const bump = () => setTick(t => t + 1);

  const ghostElRef = useRef<HTMLDivElement | null>(null);
  const pendingRef = useRef<PendingDrag | null>(null);
  const ghostOffsetRef = useRef<{ ox: number; oy: number } | null>(null);
  // Track the *exact* listener references we installed, so removeEventListener
  // matches them even after the component re-renders (handlers below are new
  // closures on every render).
  const installedRef = useRef<InstalledListeners | null>(null);

  useEffect(() => {
    const u1 = p.selectionStore.subscribe(bump);
    const u2 = p.dragStore.subscribe(bump);
    return () => { u1(); u2(); };
  }, [p.selectionStore, p.dragStore]);

  const cards = p.controller.doc.data.cards;
  const selected = p.selectionStore.get();
  const orphans = (() => {
    const s = new Set<number>();
    cards.forEach((c, i) => { if (!p.pathExists(c.path)) s.add(i); });
    return s;
  })();

  const dragState = p.dragStore.get();

  // ---- Pointer flow ----------------------------------------------------

  const uninstallListeners = () => {
    const inst = installedRef.current;
    if (!inst) return;
    document.removeEventListener("pointermove", inst.move);
    document.removeEventListener("pointerup", inst.up);
    document.removeEventListener("keydown", inst.key);
    window.removeEventListener("blur", inst.blur);
    installedRef.current = null;
  };

  const teardown = () => {
    uninstallListeners();
    pendingRef.current = null;
    ghostOffsetRef.current = null;
  };

  const cancelDrag = () => {
    p.dragStore.end();
    teardown();
  };

  const findDropTargetIndex = (clientX: number, clientY: number, dragged: number[]): number | null => {
    const elAt = document.elementFromPoint(clientX, clientY);
    if (!elAt) return null;
    const cardEl = elAt.closest(".corkboard-card") as HTMLElement | null;
    if (!cardEl || !cardEl.parentElement) return null;
    const gridChildren = Array.from(cardEl.parentElement.children).filter(c => c.classList.contains("corkboard-card"));
    const idx = gridChildren.indexOf(cardEl);
    if (idx < 0) return null;
    if (dragged.includes(idx)) return null;
    return idx;
  };

  const onDocPointerMove = (evt: PointerEvent) => {
    const pending = pendingRef.current;
    const state = p.dragStore.get();
    if (!state.active && pending) {
      const dx = evt.clientX - pending.pressX;
      const dy = evt.clientY - pending.pressY;
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
        ghostOffsetRef.current = { ox: pending.offsetX, oy: pending.offsetY };
        p.dragStore.start(pending.primary, pending.indices);
      }
      return;
    }
    if (state.active) {
      const dropIdx = findDropTargetIndex(evt.clientX, evt.clientY, state.fromIndices);
      if (dropIdx !== state.dropTarget) {
        p.dragStore.setDropTarget(dropIdx);
      }
      const ghost = ghostElRef.current;
      const offs = ghostOffsetRef.current;
      if (ghost && offs) {
        ghost.style.transform = `translate(${evt.clientX - offs.ox}px, ${evt.clientY - offs.oy}px)`;
      }
    }
  };

  const onDocPointerUp = () => {
    const state = p.dragStore.get();
    const pending = pendingRef.current;
    if (state.active && pending) {
      const dropTarget = state.dropTarget;
      const to = dropTarget == null ? p.controller.doc.data.cards.length : dropTarget;
      const fromIndices = state.fromIndices;
      const before = pending.cardsSnapshot;
      p.controller.reorderMany(fromIndices, to);
      const after = p.controller.doc.data.cards;
      const oldSelected = new Set(fromIndices);
      const newSelected = remapSelectionByPath(before, after, oldSelected);
      p.selectionStore.setAll(newSelected);
    }
    cancelDrag();
  };

  const onDocKeyDown = (evt: KeyboardEvent) => {
    if (evt.key === "Escape") cancelDrag();
  };

  const onWindowBlur = () => cancelDrag();

  const onCardPointerDown = (i: number, evt: PointerEvent) => {
    if (evt.button !== 0) return;
    const cardEl = (evt.target as Element | null)?.closest(".corkboard-card") as HTMLElement | null;
    const rect = cardEl?.getBoundingClientRect();
    const offsetX = rect ? evt.clientX - rect.left : 0;
    const offsetY = rect ? evt.clientY - rect.top : 0;

    const set = resolveDragSet(i, p.selectionStore.get());
    if (set.replaceSelection) {
      p.selectionStore.click(i, { meta: false, shift: false });
    }

    pendingRef.current = {
      pressX: evt.clientX,
      pressY: evt.clientY,
      primary: i,
      indices: set.indices,
      offsetX,
      offsetY,
      cardsSnapshot: p.controller.doc.data.cards.slice(),
    };

    // Capture this render's handlers and remember exactly what we installed
    // so a later teardown removes the same function references.
    uninstallListeners();
    const inst: InstalledListeners = {
      move: onDocPointerMove,
      up: onDocPointerUp,
      key: onDocKeyDown,
      blur: onWindowBlur,
    };
    document.addEventListener("pointermove", inst.move);
    document.addEventListener("pointerup", inst.up);
    document.addEventListener("keydown", inst.key);
    window.addEventListener("blur", inst.blur);
    installedRef.current = inst;
  };

  // Safety: tear down on unmount.
  useEffect(() => () => teardown(), []);

  const ghostPrimary = dragState.active && dragState.primary !== null ? cards[dragState.primary] : null;
  const pending = pendingRef.current;

  return (
    <div class="corkboard-app">
      <Toolbar
        cardWidth={p.controller.doc.data.cardWidth}
        cardHeight={p.controller.doc.data.cardHeight}
        selectedCount={selected.size}
        onWidthChange={(w) => p.controller.setCardSize(w, p.controller.doc.data.cardHeight)}
        onHeightChange={(h) => p.controller.setCardSize(p.controller.doc.data.cardWidth, h)}
      />
      <CardGrid
        cards={cards}
        selected={selected}
        orphans={orphans}
        cardWidth={p.controller.doc.data.cardWidth}
        cardHeight={p.controller.doc.data.cardHeight}
        statusLabels={p.settings.statusLabels}
        drag={dragState}
        onCardClick={(i, mods) => p.selectionStore.click(i, mods)}
        onCardDoubleClick={(i) => {
          const c = cards[i];
          if (c) p.openMd(c.path);
        }}
        onCardContextMenu={(i, evt) => {
          const sel = p.selectionStore.get();
          let indices: number[];
          if (sel.has(i)) {
            indices = Array.from(sel);
          } else {
            p.selectionStore.click(i, { meta: false, shift: false });
            indices = [i];
          }
          const m = buildCardMenu({
            controller: p.controller,
            indices,
            settings: p.settings,
            onRebind: p.onRebindCard,
          });
          m.showAtMouseEvent(evt);
        }}
        onSynopsisCommit={(i, text) => p.controller.updateSynopsis(i, text)}
        onTitleRename={(i, newName) => {
          const c = cards[i];
          if (!c) return;
          void p.renameFile(c.path, newName);
        }}
        onEmptyContextMenu={(evt) => {
          const m = buildEmptyAreaMenu({
            app: p.app,
            controller: p.controller,
            listFolderMd: p.listFolderMd,
          });
          m.showAtMouseEvent(evt);
        }}
        onEmptyClick={() => p.selectionStore.clear()}
        onCardPointerDown={onCardPointerDown}
        onGridPointerMove={() => { /* document listener handles it */ }}
        onGridPointerUp={() => { /* document listener handles it */ }}
      />
      {dragState.active && ghostPrimary && pending && (
        <DragGhost
          card={ghostPrimary}
          extraCount={dragState.fromIndices.length - 1}
          width={p.controller.doc.data.cardWidth}
          height={p.controller.doc.data.cardHeight}
          statusLabel={p.settings.statusLabels[ghostPrimary.status]}
          initialX={pending.pressX}
          initialY={pending.pressY}
          offsetX={pending.offsetX}
          offsetY={pending.offsetY}
          ghostRef={(el) => { ghostElRef.current = el; }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc -noEmit -skipLibCheck`
Expected: clean (no errors). If `pending.cardsSnapshot` type causes friction, change the `PendingDrag.cardsSnapshot` field type to `import("../../types").CorkboardCard[]` and add the corresponding import.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: 79+new tests all pass. (Component-level integration of the new pointer flow is verified manually.)

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: clean build (`main.js` regenerated).

- [ ] **Step 6: Commit**

```bash
git add src/view/components/CorkboardApp.tsx
git commit -m "feat(app): multi-card drag with ghost preview + 4px threshold"
```

---

## Task 10: Delete `DragLayer` and the dead `.corkboard-drop-indicator` rule

**Files:**
- Delete: `src/view/components/DragLayer.tsx`
- Modify: `styles.css` (remove the `.corkboard-drop-indicator` rule)
- Modify: `src/view/components/CardGrid.test.tsx` (remove import if still present)

- [ ] **Step 1: Confirm DragLayer is no longer imported**

Run: `grep -r "DragLayer" src/`
Expected: no results (Task 6 removed the import; Task 9 didn't add it back).

- [ ] **Step 2: Delete the file**

Run: `rm src/view/components/DragLayer.tsx`

- [ ] **Step 3: Remove the dead CSS rule**

Edit `styles.css`, delete the line:

```css
.corkboard-drop-indicator { display: none; }
```

- [ ] **Step 4: Confirm tests + build are clean**

Run: `npm test && npm run build`
Expected: all pass, build green.

- [ ] **Step 5: Commit**

```bash
git add -u src/view/components/DragLayer.tsx styles.css
git commit -m "chore: drop unused DragLayer + .corkboard-drop-indicator"
```

---

## Task 11: Manual verification & polish

This task is intentionally manual — the integration covers DOM/pointer behaviour that is not worth heavy unit testing.

- [ ] **Step 1: Build & install into the test vault**

Run: `npm run build`
The plugin's built `main.js` is already at the vault location (`Documents/corkboard/.obsidian/plugins/corkboard/`). Reload Obsidian (Cmd+R) or toggle the plugin off/on under **Settings → Community plugins**.

- [ ] **Step 2: Single-card drag**

In a corkboard with ≥ 3 cards:
1. Click a card to focus.
2. Press, move 5 px, release on another card.
3. Verify: card lands at the dropped position; selection is just that card afterwards; ghost appeared during drag and is gone after release.

- [ ] **Step 3: Multi-card drag**

1. Click card A; Cmd-click cards B, D (three cards selected).
2. Press on card B (in selection), drag to a different position, release.
3. Verify: all three cards land contiguously in their original relative order; selection set is still the same three cards (now at new indices); ghost showed `+2` badge during drag.

- [ ] **Step 4: Drag from a card NOT in the current selection**

1. Multi-select cards A, B, C.
2. Press on card E (NOT selected). Drag.
3. Verify: selection becomes just `E`, and only `E` is dragged.

- [ ] **Step 5: Drop on empty grid area**

1. Drag any card past the last card into the empty space.
2. Release.
3. Verify: card moves to the end of the list.

- [ ] **Step 6: Click vs drag threshold**

1. Click a card without moving the pointer.
2. Verify: no `is-dragging` flash, no ghost; selection becomes that card.

- [ ] **Step 7: Escape mid-drag**

1. Start a drag (move > 4 px).
2. While holding, press Escape.
3. Verify: ghost disappears, no reorder, cards visually return to normal.

- [ ] **Step 8: Window blur mid-drag**

1. Start a drag.
2. While holding, switch app (Cmd-Tab on macOS).
3. Verify: drag cancels (no stranded ghost when you return).

- [ ] **Step 9: Right-click does not start drag**

1. Right-click a card.
2. Verify: context menu appears, no ghost, no drag state.

- [ ] **Step 10: Drag while vault events arrive**

1. Open the corkboard.
2. From the file explorer, create a new md file in the same folder while you're holding a drag (this is awkward to test alone — alternative: rename a card's file from the explorer immediately after dropping).
3. Verify: corkboard re-renders cleanly with the new/renamed entry, no stale state. The `runOrQueue` queue should flush after drag end.

- [ ] **Step 11: Commit any polish fixes**

If manual verification reveals issues:
- Fix the issue.
- Re-run the relevant verification step.
- Commit each fix as its own small commit referencing the issue.

If everything passes, no commit needed for this task.

---

## Self-review checklist (do this after the plan is fully implemented)

- All `reorderMany` tests pass, including drop-on-self no-op.
- `reorder(from, to)` still passes its existing test.
- `SelectionStore.setAll` is unit-tested and notifies once.
- `dragStore` no longer exposes `fromIndex`; `fromIndices` and `primary` everywhere.
- `CardGrid` consumes the new drag shape with no compile errors.
- `CorkboardApp` has document-level listeners that are always torn down (component unmount, drag end, cancel).
- `DragLayer.tsx` deleted; `.corkboard-drop-indicator` rule removed; no orphan references remain (`grep -r "DragLayer" src/`, `grep "drop-indicator" styles.css`).
- `npm test` passes 100%.
- `npm run build` is clean (tsc + esbuild).
- Manual verification steps 2–10 all pass.
