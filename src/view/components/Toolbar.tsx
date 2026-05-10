import { MIN_CARD_WIDTH, MAX_CARD_WIDTH, MIN_CARD_HEIGHT, MAX_CARD_HEIGHT } from "../../constants";

export interface ToolbarProps {
  cardWidth: number;
  cardHeight: number;
  selectedCount: number;
  onWidthChange: (n: number) => void;
  onHeightChange: (n: number) => void;
}

export function Toolbar(p: ToolbarProps) {
  return (
    <div class="corkboard-toolbar">
      <label>
        Width
        <input type="range" min={MIN_CARD_WIDTH} max={MAX_CARD_WIDTH}
          value={p.cardWidth} onInput={(e: any) => p.onWidthChange(Number(e.target.value))} />
        <span>{p.cardWidth}px</span>
      </label>
      <label>
        Height
        <input type="range" min={MIN_CARD_HEIGHT} max={MAX_CARD_HEIGHT}
          value={p.cardHeight} onInput={(e: any) => p.onHeightChange(Number(e.target.value))} />
        <span>{p.cardHeight}px</span>
      </label>
      <span class="corkboard-toolbar__selection">{p.selectedCount > 0 ? `${p.selectedCount} selected` : ""}</span>
    </div>
  );
}
