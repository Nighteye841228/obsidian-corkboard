import type { CorkboardCard, StatusId } from "../../types";
import { Card } from "./Card";

export interface CardGridProps {
	cards: CorkboardCard[];
	selected: ReadonlySet<number>;
	orphans: ReadonlySet<number>;
	cardWidth: number;
	cardHeight: number;
	statusLabels: Record<StatusId, string>;
	onCardClick: (index: number, mods: { meta: boolean; shift: boolean }) => void;
	onCardDoubleClick: (index: number) => void;
	onCardContextMenu: (index: number, evt: MouseEvent) => void;
	onSynopsisCommit: (index: number, text: string) => void;
	onEmptyContextMenu: (evt: MouseEvent) => void;
}

export function CardGrid(p: CardGridProps) {
	return (
		<div
			class="corkboard-grid"
			onContextMenu={(e: MouseEvent) => {
				if (e.target instanceof Element && e.target.closest(".corkboard-card")) return;
				e.preventDefault();
				p.onEmptyContextMenu(e);
			}}
		>
			{p.cards.map((card, i) => (
				<Card
					key={card.path + ":" + i}
					index={i}
					card={card}
					selected={p.selected.has(i)}
					orphan={p.orphans.has(i)}
					width={p.cardWidth}
					height={p.cardHeight}
					statusLabel={p.statusLabels[card.status]}
					onClick={p.onCardClick}
					onDoubleClick={p.onCardDoubleClick}
					onContextMenu={p.onCardContextMenu}
					onSynopsisCommit={p.onSynopsisCommit}
				/>
			))}
		</div>
	);
}
