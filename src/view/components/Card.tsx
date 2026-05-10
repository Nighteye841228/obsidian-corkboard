import { useState, useRef, useEffect } from "preact/hooks";
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
	onTitleRename?: (index: number, newName: string) => void;
	onPointerDown?: (index: number, evt: PointerEvent) => void;
}

function basename(path: string): string {
	const tail = path.split("/").pop() ?? path;
	return tail.replace(/\.md$/i, "");
}

interface TitleProps {
	value: string;
	onRename?: (newName: string) => void;
}

function CardTitle({ value, onRename }: TitleProps) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value);
	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (editing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [editing]);

	useEffect(() => { setDraft(value); }, [value]);

	const commit = () => {
		const next = draft.trim();
		setEditing(false);
		if (next === "" || next === value) {
			setDraft(value);
			return;
		}
		onRename?.(next);
	};

	const cancel = () => {
		setDraft(value);
		setEditing(false);
	};

	if (editing && onRename) {
		return (
			<input
				ref={inputRef}
				class="corkboard-card__title corkboard-card__title-input"
				value={draft}
				onInput={(e: Event) => setDraft((e.currentTarget as HTMLInputElement).value)}
				onBlur={commit}
				onKeyDown={(e: KeyboardEvent) => {
					if (e.key === "Enter") { e.preventDefault(); commit(); }
					else if (e.key === "Escape") { e.preventDefault(); cancel(); }
				}}
				onClick={(e: MouseEvent) => e.stopPropagation()}
				onDblClick={(e: MouseEvent) => e.stopPropagation()}
				onPointerDown={(e: PointerEvent) => e.stopPropagation()}
			/>
		);
	}

	return (
		<div
			class="corkboard-card__title"
			onDblClick={(e: MouseEvent) => {
				if (!onRename) return;
				e.stopPropagation();
				setEditing(true);
			}}
		>
			{value}
		</div>
	);
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
			onPointerDown={(e: PointerEvent) => props.onPointerDown?.(props.index, e)}
		>
			<CardTitle
				value={basename(props.card.path)}
				onRename={props.onTitleRename ? (n) => props.onTitleRename!(props.index, n) : undefined}
			/>
			<div class="corkboard-card__status">{props.statusLabel}</div>
			<SynopsisEditor
				value={props.card.synopsis}
				onCommit={(text: string) => props.onSynopsisCommit(props.index, text)}
			/>
			{props.orphan && <div class="corkboard-card__orphan-badge">⚠ missing</div>}
		</div>
	);
}
