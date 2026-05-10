export interface DragState {
  active: boolean;
  fromIndex: number | null;
  dropTarget: number | null;
}

export interface DragStore {
  get(): DragState;
  start(fromIndex: number): void;
  setDropTarget(idx: number | null): void;
  end(): void;
  runOrQueue(fn: () => void): void;
  subscribe(fn: () => void): () => void;
}

export function createDragStore(): DragStore {
  let state: DragState = { active: false, fromIndex: null, dropTarget: null };
  const queue: Array<() => void> = [];
  const subs = new Set<() => void>();
  const notify = () => { for (const fn of subs) fn(); };

  return {
    get: () => state,
    start(fromIndex) {
      state = { active: true, fromIndex, dropTarget: null };
      notify();
    },
    setDropTarget(idx) {
      state = { ...state, dropTarget: idx };
      notify();
    },
    end() {
      state = { active: false, fromIndex: null, dropTarget: null };
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
