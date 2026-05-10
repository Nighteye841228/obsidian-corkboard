import type { DragState } from "../../state/dragStore";

export function DragLayer({ drag, cardCount }: { drag: DragState; cardCount: number }) {
	if (!drag.active || drag.dropTarget == null) return null;
	return (
		<div class="corkboard-drop-indicator" data-target={drag.dropTarget} data-of={cardCount} />
	);
}
