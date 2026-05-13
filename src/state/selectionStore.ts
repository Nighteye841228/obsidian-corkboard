export interface ClickModifiers { meta: boolean; shift: boolean; }

export interface SelectionStore {
  get(): ReadonlySet<number>;
  click(index: number, mods: ClickModifiers): void;
  clear(): void;
  setAll(indices: Iterable<number>): void;
  subscribe(fn: () => void): () => void;
}

export function createSelectionStore(): SelectionStore {
  let selected = new Set<number>();
  let anchor: number | null = null;
  const subs = new Set<() => void>();
  const notify = () => { for (const fn of subs) fn(); };

  return {
    get: () => selected,
    click(index, mods) {
      if (mods.shift && anchor !== null) {
        const lo = Math.min(anchor, index), hi = Math.max(anchor, index);
        const next = new Set<number>();
        for (let i = lo; i <= hi; i++) next.add(i);
        selected = next;
      } else if (mods.meta) {
        const next = new Set(selected);
        if (next.has(index)) next.delete(index); else next.add(index);
        selected = next;
        anchor = index;
      } else {
        selected = new Set([index]);
        anchor = index;
      }
      notify();
    },
    clear() {
      selected = new Set();
      anchor = null;
      notify();
    },
    setAll(indices) {
      selected = new Set(indices);
      anchor = null;
      notify();
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
