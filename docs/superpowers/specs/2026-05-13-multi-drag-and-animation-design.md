# Multi-card drag & drag-ghost animation — Design

Date: 2026-05-13
Status: Approved (pending implementation plan)

## Goals

1. Let the user drag **multiple selected cards together** to a new position in the corkboard.
2. Add a **ghost preview that follows the cursor** during drag, with a stacked look + `+N` badge when multiple cards are being dragged.

## Non-goals

- Cross-corkboard drag.
- Auto-scroll when dragging near the grid edge.
- "Make-room" animation (FLIP-style smooth shifting of surrounding cards).
- Touch-specific tuning beyond what Pointer Events provides for free.
- Native HTML5 Drag-and-Drop API (we stay on Pointer Events).

## Confirmed interaction decisions

| # | Decision |
|---|---|
| 1 | Drag trigger follows Finder/macOS semantics: pointer-down on a card **inside** the current selection drags the whole selection; pointer-down on a card **outside** the selection replaces the selection with that card and drags it alone. |
| 2 | Visual: a ghost element follows the cursor; when multiple cards are dragged it shows a stacked-paper look with a `+N` badge. Origin cards stay in place at `opacity: 0.4` (extending the current `is-dragging` look). No make-room animation on the rest of the grid. |
| 3 | On drop, the dragged cards land **contiguously at the drop point in their original relative order**, and the selection set is preserved (the same N cards remain selected at their new indices). |

## Architecture & data structures

### State split

| Module | Responsibility | Update frequency |
|---|---|---|
| `dragStore` (existing, extended) | Logical drag state: active, dragged indices, primary index, drop target | Low — changes only when drop target crosses a card boundary |
| `DragGhost` (new component) | Visual: cursor position, stacking visuals | High — every pointer move; updates own DOM via `ref`, bypassing the React/Preact subscriber tree |
| `selectionStore` (existing, unchanged) | Selection set | Only on click |

### `DragState` type change

```ts
interface DragState {
  active: boolean;
  fromIndices: number[];   // replaces the old fromIndex: number | null
  primary: number | null;  // the card the pointer pressed down on; drives ghost main face + ghost origin offset
  dropTarget: number | null;
}
```

`dragStore.start(primary, indices)` replaces `start(fromIndex)`. The store does **not** hold pointer x/y — those live in the ghost's DOM via a ref.

### Controller / document API change

- Add `CorkboardDocument.reorderMany(fromIndices: number[], to: number): void`.
  - `fromIndices` are indices into the **current** `data.cards` array; duplicates and out-of-range entries are ignored.
  - `to` is also an index in the **current** (pre-removal) array. Semantically: "place the dragged slice such that, after removal, its first card sits where the card at original index `to` used to be." This matches the existing `reorder` convention used by the UI (`dropTarget` is the hovered card's index in the current array).
  - Algorithm:
    1. Capture the items at `fromIndices` (in ascending order — relative order preserved).
    2. If `to` is itself in `fromIndices` → no-op return (drop-on-self).
    3. Remove the captured items from the array (descending order, so earlier indices stay stable).
    4. Compute `shift = count of indices in fromIndices that are < to`.
    5. `insertAt = to - shift`. Insert the captured slice at `insertAt`.
  - Special value `to === cards.length` is allowed and means "drop at end" (after all remaining cards).
- `CorkboardDocument.reorder(from, to)` becomes a thin wrapper: `reorderMany([from], to)`. The original direct splice/splice is removed; existing tests must keep passing.
- `CorkboardController` gains a `reorderMany` thin delegate; existing `reorder` keeps its signature.

### Files touched

- **Modify:** `src/state/dragStore.ts`, `src/data/corkboardDocument.ts`, `src/state/controller.ts`, `src/view/components/CorkboardApp.tsx`, `src/view/components/CardGrid.tsx`, `src/view/components/Card.tsx`, `styles.css`.
- **Add:** `src/view/components/DragGhost.tsx`.
- **Delete:** `src/view/components/DragLayer.tsx` (currently a stub rendering an element styled `display: none`) and the corresponding `.corkboard-drop-indicator` CSS rule.

## Interaction flow

### Pointer-down

Handler lives in `CorkboardApp` (decision logic), `Card.tsx` only forwards the event with index + client coordinates.

1. `onCardPointerDown(i, evt)` reaches the App.
2. App resolves the drag set:
   - If `selection.has(i)` → `indices = Array.from(selection).sort()`.
   - Else → `selection.click(i, {meta:false, shift:false})` and `indices = [i]`.
3. **No `dragStore.start()` yet.** App records `{ primary: i, pressX, pressY }` and attaches document-level `pointermove` / `pointerup` listeners.
4. Drag only "starts for real" once cumulative pointer movement exceeds **4 px**; at that moment we call `dragStore.start(i, indices)` and mount `DragGhost`. Below the threshold the gesture is treated as a click — no ghost flash, no reorder.

This 4 px threshold also fixes an existing minor issue: today a pure click briefly flashes the `is-dragging` styling because `dragStore.start` is called on pointerdown unconditionally.

### Pointer-move (document-level, only while drag is active)

1. Use `document.elementFromPoint(x, y)` to find the `.corkboard-card` under the cursor.
   - Found → `setDropTarget(thatCardIndex)`.
   - Not found → `setDropTarget(null)` (cursor over empty grid space; treat as "drop at end" on commit).
2. **Skip the dragged cards themselves**: if the hit card's index is in `fromIndices`, search neighbouring cards for the nearest non-dragged card, or fall back to `null` if all neighbours are also dragged.
3. Update the ghost position by writing `ref.style.transform = translate(${x - offsetX}px, ${y - offsetY}px)` where `offsetX/Y` is the pointer offset inside the primary card at press time. The store is NOT touched on every move.

### Pointer-up (document-level)

1. If `active === false` (threshold never crossed) → tear down listeners, no-op.
2. If `active && dropTarget != null` → call `controller.reorderMany(fromIndices, dropTarget)`.
3. If `active && dropTarget == null` → call `controller.reorderMany(fromIndices, cards.length)` (drop at end).
4. After reorder commits, **re-map selection by path**: take the original selected paths (snapshotted at drag start), find their new indices in the updated `doc.data.cards`, and write them to the selection store. This requires a new `SelectionStore.setAll(indices: Iterable<number>): void` method (the current public API only has `click` and `clear`); add it alongside.
5. `dragStore.end()` and unmount `DragGhost`.

### Escape / window blur

While drag is active, the following listeners are attached:
- `document.addEventListener("keydown")` — cancel on Escape.
- `window.addEventListener("blur")` — cancel when the Obsidian window loses focus (avoids stranded ghost on Cmd-Tab while the pointer is held).

Both trigger `dragStore.end()` with **no** reorder commit; selection is left as-is.

## Visual treatment

### `DragGhost` component

- `position: fixed; top: 0; left: 0; pointer-events: none; z-index: 9999`.
- Body re-uses `Card`'s presentational fragments (title, status, synopsis preview clipped to first line), with class `corkboard-drag-ghost` — **not** `is-dragging`, so origin-card styles don't leak in.
- The main face renders the **primary** card content (the card the pointer pressed on).
- Stacking when `fromIndices.length > 1`: two pseudo-elements (`::before`, `::after`) on the ghost root rendered as empty card-shaped rectangles, offset by `4px` / `8px` to the right and down, behind the main face, to suggest a paper stack. Active when class `has-stack` is present.
- Top-right absolute `+N` badge (`N = fromIndices.length - 1`); badge & stack pseudo-elements only rendered when `N > 0`.
- Initial transform uses the pointerdown-time card-corner-to-cursor offset, so the ghost appears to "lift off" from the original card position without snapping under the cursor.
- Cursor tracking: while drag is active, document-level `pointermove` writes `ref.current.style.transform`. Updates bypass the store and the Preact reconciler.

### Entry / exit transitions

- Enter: `opacity 0 → 1` and `scale 0.95 → 1`, 120 ms `ease-out`.
- Cancel (Escape / blur): `opacity → 0`, transform linearly interpolated back toward the origin-card coordinates, 160 ms `ease-in`, then unmount.
- Successful drop: unmount immediately (no fly-back; the origin cards already show up at their new positions, so the visual transition reads naturally).

### Origin cards

- Each card whose index is in `fromIndices` keeps the existing `is-dragging` class (`opacity: 0.4; transform: scale(0.97)`). The previous single-card rule already supports this — we just apply the class to every dragged index.
- The existing `is-drop-before` / `is-drop-after` inset shadow on the `dropTarget` card stays as the precise drop indicator.

### CSS additions (`styles.css`)

```
.corkboard-drag-ghost { /* position: fixed; pointer-events: none; transitions */ }
.corkboard-drag-ghost.has-stack::before,
.corkboard-drag-ghost.has-stack::after { /* offset paper-stack pseudo elements */ }
.corkboard-drag-ghost__badge { /* absolute top-right +N badge */ }
```

Deletions: `.corkboard-drop-indicator { display: none; }` (paired with `DragLayer.tsx` removal).

## Edge cases

1. **Drop on self / drop equals origin** — `reorderMany` returns no-op when the computed insertion index equals the current position of the slice. No file write.
2. **Drop on empty grid space** — `dropTarget` is `null`; on commit we substitute `cards.length` (drop at end).
3. **Drop target is itself a dragged card** — filtered out during pointer-move; never enters `dropTarget`.
4. **External vault events during drag** (vaultSync create/delete/rename) — already handled by `dragStore.runOrQueue`: events queued while `active`, flushed on `end()`. Multi-drag does not change this.
5. **Card deleted externally mid-drag** — `reorderMany` resolves dragged cards by **path** (snapshot at drag start) and recomputes indices against the current `doc.data.cards` at commit time. Missing paths are dropped from the move silently.
6. **Escape mid-drag** — no reorder, no file write; selection unchanged.
7. **Click without crossing 4 px threshold** — purely a click; handled by existing `onCardClick`. No drag side effects.
8. **Window/leaf blur with pointer held** — document-level `blur` listener cancels drag, preventing a stranded ghost.

## Testing

### New / updated unit tests

- `corkboardDocument.test.ts` — `reorderMany`:
  - Contiguous slice moves forward (relative order preserved).
  - Non-contiguous indices move to an interior position.
  - `to ∈ fromIndices` → no-op (drop-on-self).
  - Drop at index 0 (first position).
  - Drop at `cards.length` (end).
  - Mixed: dragging some indices from before `to` and some from after `to` (verifies the `shift` calculation).
- `selectionStore.test.ts` — new `setAll(indices)` replaces the selection set; subscribers notified once.
- `controller.test.ts` — `reorder(from, to)` still delegates to `reorderMany([from], to)`; existing assertions hold.
- `dragStore.test.ts` — `start(primary, indices)` populates state; `end()` clears `fromIndices` and `primary`; `runOrQueue` behaviour unchanged.
- A new small helper test for **selection re-mapping by path** (pure function: `(oldCards, newCards, selectedPaths) → newIndexSet`).

### Out of scope for automated tests

- Per-frame ghost position (manual verification).
- HTML5 DnD (we don't use it).
- Auto-scroll near grid edges (not in this release).

## Implementation order (rough — full plan to be produced by writing-plans)

1. `CorkboardDocument.reorderMany` + unit tests.
2. Wrap `CorkboardDocument.reorder` and `CorkboardController.reorder` as thin shims; confirm existing tests stay green.
3. Extend `dragStore` with `fromIndices` / `primary`; update its tests.
4. Rewrite `CorkboardApp` pointer-down flow: drag-set resolution, 4 px threshold, document-level listeners, Escape / blur teardown.
5. Update `Card.tsx` so pointer-down passes the event up (including client coordinates).
6. Add `DragGhost.tsx` and matching CSS rules.
7. Delete `DragLayer.tsx` and `.corkboard-drop-indicator` rule.
8. Implement selection re-mapping by path after `reorderMany` commits.
9. Manual verification: single drag, multi-select drag, Escape, blur, drop on empty space, vault events during drag.
