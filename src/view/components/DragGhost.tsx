import type { CorkboardCard } from "../../types";

export interface DragGhostProps {
  card: CorkboardCard;
  extraCount: number;
  width: number;
  height: number;
  statusLabel: string;
}

function basename(path: string): string {
  const tail = path.split("/").pop() ?? path;
  return tail.replace(/\.md$/i, "");
}

// Imperative DOM ghost. Rendered outside the preact tree, appended directly
// to document.body so its `position: fixed` is anchored to the viewport
// (Obsidian workspace containers apply `transform`, which would otherwise
// trap a fixed-positioned descendant inside the leaf and offset it by the
// leaf's own left/top).
export function createDragGhost(p: DragGhostProps): HTMLDivElement {
  const root = document.createElement("div");
  const hasStack = p.extraCount > 0;
  root.className = "corkboard-drag-ghost" + (hasStack ? " has-stack" : "");
  // Width/height/transform are per-instance dynamic values — go through
  // Obsidian's setCssStyles wrapper (linted-safe equivalent of direct
  // .style mutation). Synopsis ellipsis is static, lives in CSS.
  root.setCssStyles({
    width: `${p.width}px`,
    height: `${p.height}px`,
    transform: "translate(-9999px, -9999px)",
  });

  const title = document.createElement("div");
  title.className = "corkboard-card__title";
  title.textContent = basename(p.card.path);
  root.appendChild(title);

  const status = document.createElement("div");
  status.className = "corkboard-card__status";
  status.textContent = p.statusLabel;
  root.appendChild(status);

  const synopsis = document.createElement("div");
  synopsis.className = "corkboard-synopsis";
  synopsis.textContent = p.card.synopsis;
  root.appendChild(synopsis);

  if (hasStack) {
    const badge = document.createElement("div");
    badge.className = "corkboard-drag-ghost__badge";
    badge.textContent = `+${p.extraCount}`;
    root.appendChild(badge);
  }

  return root;
}
