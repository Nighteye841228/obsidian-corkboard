import type { CorkboardCard, StatusId } from "../../types";
import type { DropEdge } from "../../state/dragStore";
import { Card } from "./Card";

export interface CardGridProps {
	cards: CorkboardCard[];
	selected: ReadonlySet<number>;
	orphans: ReadonlySet<number>;
	cardWidth: number;
	cardHeight: number;
	statusLabels: Record<StatusId, string>;
	drag: { active: boolean; fromIndices: number[]; primary: number | null; dropTarget: number | null; dropEdge: DropEdge | null };
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
				const draggedSet = p.drag.fromIndices;
				const dragging = p.drag.active && draggedSet.includes(i);
				const dropEdge: "before" | "after" | null =
					p.drag.active && p.drag.dropTarget === i && !draggedSet.includes(i)
						? p.drag.dropEdge
						: null;
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
		</div>
	);
}
