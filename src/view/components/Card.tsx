import type { CorkboardCard } from "../../types";
import { SynopsisEditor } from "./SynopsisEditor";

export interface CardProps {
	index: number;
	card: CorkboardCard;
	selected: boolean;
	orphan: boolean;
	width: number;
	height: number;
	statusLabel: string;
	onClick: (index: number, mods: { meta: boolean; shift: boolean }) => void;
	onDoubleClick: (index: number) => void;
	onContextMenu: (index: number, evt: MouseEvent) => void;
	onSynopsisCommit: (index: number, text: string) => void;
}

function basename(path: string): string {
	const tail = path.split("/").pop() ?? path;
	return tail.replace(/\.md$/i, "");
}

export function Card(props: CardProps) {
	const cls = [
		"corkboard-card",
		props.selected ? "is-selected" : "",
		props.orphan ? "is-orphan" : "",
		props.card.color ? `corkboard-color-${props.card.color}` : "",
	].filter(Boolean).join(" ");

	return (
		<div
			class={cls}
			style={{ width: `${props.width}px`, height: `${props.height}px` }}
			onClick={(e: MouseEvent) => props.onClick(props.index, { meta: e.metaKey || e.ctrlKey, shift: e.shiftKey })}
			onDblClick={() => props.onDoubleClick(props.index)}
			onContextMenu={(e: MouseEvent) => { e.preventDefault(); props.onContextMenu(props.index, e); }}
		>
			<div class="corkboard-card__title">{basename(props.card.path)}</div>
			<div class="corkboard-card__status">{props.statusLabel}</div>
			<SynopsisEditor
				value={props.card.synopsis}
				onCommit={(text: string) => props.onSynopsisCommit(props.index, text)}
			/>
			{props.orphan && <div class="corkboard-card__orphan-badge">⚠ missing</div>}
		</div>
	);
}
