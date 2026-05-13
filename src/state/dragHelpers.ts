import type { CorkboardCard } from "../types";

export interface DragSet {
  indices: number[];
  replaceSelection: boolean;
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
