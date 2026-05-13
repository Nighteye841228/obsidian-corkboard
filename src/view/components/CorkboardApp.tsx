import { useEffect, useRef, useState } from "preact/hooks";
import type { App } from "obsidian";
import type { CorkboardController } from "../../state/controller";
import type { SelectionStore } from "../../state/selectionStore";
import type { DragStore } from "../../state/dragStore";
import type { CorkboardSettings, CorkboardCard } from "../../types";
import { Toolbar } from "./Toolbar";
import { CardGrid } from "./CardGrid";
import { DragGhost } from "./DragGhost";
import { buildCardMenu, buildEmptyAreaMenu } from "./contextMenus";
import { resolveDragSet, remapSelectionByPath } from "../../state/dragHelpers";

const DRAG_THRESHOLD_PX = 4;

export interface CorkboardAppProps {
	app: App;
	controller: CorkboardController;
	selectionStore: SelectionStore;
	dragStore: DragStore;
	settings: CorkboardSettings;
	pathExists: (path: string) => boolean;
	listFolderMd: () => string[];
	openMd: (path: string) => void;
	onRebindCard: (index: number) => void;
	renameFile: (oldPath: string, newName: string) => Promise<void>;
}

interface PendingDrag {
	pressX: number;
	pressY: number;
	primary: number;
	indices: number[];
	offsetX: number;
	offsetY: number;
	cardsSnapshot: CorkboardCard[];
}

interface InstalledListeners {
	move: (e: PointerEvent) => void;
	up: (e: PointerEvent) => void;
	key: (e: KeyboardEvent) => void;
	blur: () => void;
}

export function CorkboardApp(p: CorkboardAppProps) {
	const [, setTick] = useState(0);
	const bump = () => setTick(t => t + 1);

	const ghostElRef = useRef<HTMLDivElement | null>(null);
	const pendingRef = useRef<PendingDrag | null>(null);
	const ghostOffsetRef = useRef<{ ox: number; oy: number } | null>(null);
	// Track the exact listener references we installed so removeEventListener
	// matches them even after the component re-renders (handlers below are
	// fresh closures every render).
	const installedRef = useRef<InstalledListeners | null>(null);

	useEffect(() => {
		const u1 = p.selectionStore.subscribe(bump);
		const u2 = p.dragStore.subscribe(bump);
		return () => { u1(); u2(); };
	}, [p.selectionStore, p.dragStore]);

	const cards = p.controller.doc.data.cards;
	const selected = p.selectionStore.get();
	const orphans = (() => {
		const s = new Set<number>();
		cards.forEach((c, i) => { if (!p.pathExists(c.path)) s.add(i); });
		return s;
	})();

	const dragState = p.dragStore.get();

	const uninstallListeners = () => {
		const inst = installedRef.current;
		if (!inst) return;
		document.removeEventListener("pointermove", inst.move);
		document.removeEventListener("pointerup", inst.up);
		document.removeEventListener("keydown", inst.key);
		window.removeEventListener("blur", inst.blur);
		installedRef.current = null;
	};

	const teardown = () => {
		uninstallListeners();
		pendingRef.current = null;
		ghostOffsetRef.current = null;
	};

	const cancelDrag = () => {
		p.dragStore.end();
		teardown();
	};

	const findDropTargetIndex = (clientX: number, clientY: number, dragged: number[]): number | null => {
		const elAt = document.elementFromPoint(clientX, clientY);
		if (!elAt) return null;
		const cardEl = elAt.closest(".corkboard-card") as HTMLElement | null;
		if (!cardEl || !cardEl.parentElement) return null;
		const gridChildren = Array.from(cardEl.parentElement.children)
			.filter(c => c.classList.contains("corkboard-card"));
		const idx = gridChildren.indexOf(cardEl);
		if (idx < 0) return null;
		if (dragged.includes(idx)) return null;
		return idx;
	};

	const onDocPointerMove = (evt: PointerEvent) => {
		const pending = pendingRef.current;
		const state = p.dragStore.get();
		if (!state.active && pending) {
			const dx = evt.clientX - pending.pressX;
			const dy = evt.clientY - pending.pressY;
			if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
				ghostOffsetRef.current = { ox: pending.offsetX, oy: pending.offsetY };
				p.dragStore.start(pending.primary, pending.indices);
			}
			return;
		}
		if (state.active) {
			const dropIdx = findDropTargetIndex(evt.clientX, evt.clientY, state.fromIndices);
			if (dropIdx !== state.dropTarget) {
				p.dragStore.setDropTarget(dropIdx);
			}
			const ghost = ghostElRef.current;
			const offs = ghostOffsetRef.current;
			if (ghost && offs) {
				ghost.style.transform = `translate(${evt.clientX - offs.ox}px, ${evt.clientY - offs.oy}px)`;
			}
		}
	};

	const onDocPointerUp = () => {
		const state = p.dragStore.get();
		const pending = pendingRef.current;
		if (state.active && pending) {
			const dropTarget = state.dropTarget;
			const to = dropTarget == null ? p.controller.doc.data.cards.length : dropTarget;
			const fromIndices = state.fromIndices;
			const before = pending.cardsSnapshot;
			p.controller.reorderMany(fromIndices, to);
			const after = p.controller.doc.data.cards;
			const oldSelected = new Set(fromIndices);
			const newSelected = remapSelectionByPath(before, after, oldSelected);
			p.selectionStore.setAll(newSelected);
		}
		cancelDrag();
	};

	const onDocKeyDown = (evt: KeyboardEvent) => {
		if (evt.key === "Escape") cancelDrag();
	};

	const onWindowBlur = () => cancelDrag();

	const onCardPointerDown = (i: number, evt: PointerEvent) => {
		if (evt.button !== 0) return;
		const cardEl = (evt.target as Element | null)?.closest(".corkboard-card") as HTMLElement | null;
		const rect = cardEl?.getBoundingClientRect();
		const offsetX = rect ? evt.clientX - rect.left : 0;
		const offsetY = rect ? evt.clientY - rect.top : 0;

		const set = resolveDragSet(i, p.selectionStore.get());
		if (set.replaceSelection) {
			p.selectionStore.click(i, { meta: false, shift: false });
		}

		pendingRef.current = {
			pressX: evt.clientX,
			pressY: evt.clientY,
			primary: i,
			indices: set.indices,
			offsetX,
			offsetY,
			cardsSnapshot: p.controller.doc.data.cards.slice(),
		};

		uninstallListeners();
		const inst: InstalledListeners = {
			move: onDocPointerMove,
			up: onDocPointerUp,
			key: onDocKeyDown,
			blur: onWindowBlur,
		};
		document.addEventListener("pointermove", inst.move);
		document.addEventListener("pointerup", inst.up);
		document.addEventListener("keydown", inst.key);
		window.addEventListener("blur", inst.blur);
		installedRef.current = inst;
	};

	useEffect(() => () => teardown(), []);

	const ghostPrimary = dragState.active && dragState.primary !== null ? cards[dragState.primary] : null;
	const pending = pendingRef.current;

	return (
		<div class="corkboard-app">
			<Toolbar
				cardWidth={p.controller.doc.data.cardWidth}
				cardHeight={p.controller.doc.data.cardHeight}
				selectedCount={selected.size}
				onWidthChange={(w) => p.controller.setCardSize(w, p.controller.doc.data.cardHeight)}
				onHeightChange={(h) => p.controller.setCardSize(p.controller.doc.data.cardWidth, h)}
			/>
			<CardGrid
				cards={cards}
				selected={selected}
				orphans={orphans}
				cardWidth={p.controller.doc.data.cardWidth}
				cardHeight={p.controller.doc.data.cardHeight}
				statusLabels={p.settings.statusLabels}
				drag={dragState}
				onCardClick={(i, mods) => p.selectionStore.click(i, mods)}
				onCardDoubleClick={(i) => {
					const c = cards[i];
					if (c) p.openMd(c.path);
				}}
				onCardContextMenu={(i, evt) => {
					const sel = p.selectionStore.get();
					let indices: number[];
					if (sel.has(i)) {
						indices = Array.from(sel);
					} else {
						p.selectionStore.click(i, { meta: false, shift: false });
						indices = [i];
					}
					const m = buildCardMenu({
						controller: p.controller,
						indices,
						settings: p.settings,
						onRebind: p.onRebindCard,
					});
					m.showAtMouseEvent(evt);
				}}
				onSynopsisCommit={(i, text) => p.controller.updateSynopsis(i, text)}
				onTitleRename={(i, newName) => {
					const c = cards[i];
					if (!c) return;
					void p.renameFile(c.path, newName);
				}}
				onEmptyContextMenu={(evt) => {
					const m = buildEmptyAreaMenu({
						app: p.app,
						controller: p.controller,
						listFolderMd: p.listFolderMd,
					});
					m.showAtMouseEvent(evt);
				}}
				onEmptyClick={() => p.selectionStore.clear()}
				onCardPointerDown={onCardPointerDown}
				onGridPointerMove={() => {}}
				onGridPointerUp={() => {}}
			/>
			{dragState.active && ghostPrimary && pending && (
				<DragGhost
					card={ghostPrimary}
					extraCount={dragState.fromIndices.length - 1}
					width={p.controller.doc.data.cardWidth}
					height={p.controller.doc.data.cardHeight}
					statusLabel={p.settings.statusLabels[ghostPrimary.status]}
					initialX={pending.pressX}
					initialY={pending.pressY}
					offsetX={pending.offsetX}
					offsetY={pending.offsetY}
					ghostRef={(el) => { ghostElRef.current = el; }}
				/>
			)}
		</div>
	);
}
