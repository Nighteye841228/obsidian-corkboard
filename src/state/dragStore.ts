export type DropEdge = "before" | "after";

export interface DragState {
  active: boolean;
  fromIndices: number[];   // every card being dragged (includes primary)
  primary: number | null;  // the card the pointer pressed down on
  dropTarget: number | null;
  dropEdge: DropEdge | null;  // which side of dropTarget the cursor is on
}

export interface DragStore {
  get(): DragState;
  start(primary: number, indices: number[]): void;
  setDropTarget(idx: number | null, edge: DropEdge | null): void;
  end(): void;
  runOrQueue(fn: () => void): void;
  subscribe(fn: () => void): () => void;
}

export function createDragStore(): DragStore {
  let state: DragState = { active: false, fromIndices: [], primary: null, dropTarget: null, dropEdge: null };
  const queue: Array<() => void> = [];
  const subs = new Set<() => void>();
  const notify = () => { for (const fn of subs) fn(); };

  return {
    get: () => state,
    start(primary, indices) {
      state = { active: true, primary, fromIndices: indices.slice(), dropTarget: null, dropEdge: null };
      notify();
    },
    setDropTarget(idx, edge) {
      if (state.dropTarget === idx && state.dropEdge === edge) return;
      state = { ...state, dropTarget: idx, dropEdge: edge };
      notify();
    },
    end() {
      state = { active: false, primary: null, fromIndices: [], dropTarget: null, dropEdge: null };
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
