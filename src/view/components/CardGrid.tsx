import type { CorkboardCard, StatusId } from "../../types";
import { Card } from "./Card";
import { DragLayer } from "./DragLayer";

export interface CardGridProps {
	cards: CorkboardCard[];
	selected: ReadonlySet<number>;
	orphans: ReadonlySet<number>;
	cardWidth: number;
	cardHeight: number;
	statusLabels: Record<StatusId, string>;
	drag: { active: boolean; fromIndex: number | null; dropTarget: number | null };
	onCardClick: (index: number, mods: { meta: boolean; shift: boolean }) => void;
	onCardDoubleClick: (index: number) => void;
	onCardContextMenu: (index: number, evt: MouseEvent) => void;
	onSynopsisCommit: (index: number, text: string) => void;
	onTitleRename: (index: number, newName: string) => void;
	onEmptyContextMenu: (evt: MouseEvent) => void;
	onEmptyClick: () => void;
	onCardPointerDown: (index: number, evt: PointerEvent) => void;
	onGridPointerMove: (evt: PointerEvent) => void;
	onGridPointerUp: (evt: PointerEvent) => void;
}

export function CardGrid(p: CardGridProps) {
	const gridClass = p.drag.active ? "corkboard-grid is-dragging" : "corkboard-grid";
	return (
		<div
			class={gridClass}
			onClick={(e: MouseEvent) => {
				if (e.target instanceof Element && e.target.closest(".corkboard-card")) return;
				p.onEmptyClick();
			}}
			onContextMenu={(e: MouseEvent) => {
				if (e.target instanceof Element && e.target.closest(".corkboard-card")) return;
				e.preventDefault();
				p.onEmptyContextMenu(e);
			}}
			onPointerMove={p.onGridPointerMove}
			onPointerUp={p.onGridPointerUp}
		>
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
				return (
					<Card
						key={card.path + ":" + i}
						index={i}
						card={card}
						selected={p.selected.has(i)}
						orphan={p.orphans.has(i)}
						dragging={dragging}
						dropEdge={dropEdge}
						width={p.cardWidth}
						height={p.cardHeight}
						statusLabel={p.statusLabels[card.status]}
						onClick={p.onCardClick}
						onDoubleClick={p.onCardDoubleClick}
						onContextMenu={p.onCardContextMenu}
						onSynopsisCommit={p.onSynopsisCommit}
						onTitleRename={p.onTitleRename}
						onPointerDown={p.onCardPointerDown}
					/>
				);
			})}
			<DragLayer drag={p.drag} cardCount={p.cards.length} />
		</div>
	);
}
