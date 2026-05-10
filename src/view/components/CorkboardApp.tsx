import { useEffect, useState, useMemo } from "preact/hooks";
import type { App } from "obsidian";
import type { CorkboardController } from "../../state/controller";
import type { SelectionStore } from "../../state/selectionStore";
import type { DragStore } from "../../state/dragStore";
import type { CorkboardSettings } from "../../types";
import { Toolbar } from "./Toolbar";
import { CardGrid } from "./CardGrid";
import { buildCardMenu, buildEmptyAreaMenu } from "./contextMenus";

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

export function CorkboardApp(p: CorkboardAppProps) {
	const [, setTick] = useState(0);
	const bump = () => setTick(t => t + 1);

	useEffect(() => {
		const u1 = p.selectionStore.subscribe(bump);
		const u2 = p.dragStore.subscribe(bump);
		return () => { u1(); u2(); };
	}, [p.selectionStore, p.dragStore]);

	const cards = p.controller.doc.data.cards;
	const selected = p.selectionStore.get();
	const orphans = useMemo(() => {
		const s = new Set<number>();
		cards.forEach((c, i) => { if (!p.pathExists(c.path)) s.add(i); });
		return s;
	}, [cards, p.pathExists]);

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
				drag={p.dragStore.get()}
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
				onCardPointerDown={(i) => p.dragStore.start(i)}
				onGridPointerMove={(evt) => {
					if (!p.dragStore.get().active) return;
					const target = (evt.target as Element | null)?.closest(".corkboard-card");
					if (!target) return;
					const grid = target.parentElement;
					if (!grid) return;
					const idx = Array.from(grid.children).indexOf(target);
					if (idx >= 0) p.dragStore.setDropTarget(idx);
				}}
				onGridPointerUp={() => {
					const s = p.dragStore.get();
					if (s.active && s.fromIndex != null && s.dropTarget != null) {
						p.controller.reorder(s.fromIndex, s.dropTarget);
					}
					p.dragStore.end();
				}}
			/>
		</div>
	);
}
