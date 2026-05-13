import { useRef, useEffect } from "preact/hooks";
import type { CorkboardCard } from "../../types";

export interface DragGhostProps {
  card: CorkboardCard;
  extraCount: number;
  width: number;
  height: number;
  statusLabel: string;
  initialX: number;
  initialY: number;
  offsetX: number;
  offsetY: number;
  ghostRef: (el: HTMLDivElement | null) => void;
}

function basename(path: string): string {
  const tail = path.split("/").pop() ?? path;
  return tail.replace(/\.md$/i, "");
}

export function DragGhost(p: DragGhostProps) {
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
