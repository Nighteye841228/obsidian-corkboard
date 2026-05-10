import { App, Menu } from "obsidian";
import type { CorkboardController } from "../../state/controller";
import type { CorkboardSettings } from "../../types";
import { COLOR_PALETTE, STATUS_IDS } from "../../constants";
import { AddCardModal } from "./AddCardModal";

export function buildCardMenu(opts: {
	controller: CorkboardController;
	indices: number[];
	settings: CorkboardSettings;
	onRebind: (index: number) => void;
}): Menu {
	const { controller, indices, settings } = opts;
	const m = new Menu();

	m.addItem(item =>
		item.setTitle("Write synopsis to file").setIcon("file-pen").onClick(async () => {
			for (const i of indices) await controller.writeSynopsisToMd(i);
		})
	);
	m.addSeparator();

	// status submenu (flat list — Obsidian Menu is flat in stable API)
	for (const s of STATUS_IDS) {
		m.addItem(item =>
			item.setTitle(`Status: ${settings.statusLabels[s]}`).setIcon("check-square").onClick(() => {
				for (const i of indices) controller.setStatus(i, s);
			})
		);
	}
	m.addSeparator();

	for (const c of COLOR_PALETTE) {
		m.addItem(item =>
			item.setTitle(`Colour: ${c}`).setIcon("palette").onClick(() => {
				for (const i of indices) controller.setColor(i, c);
			})
		);
	}
	m.addItem(item =>
		item.setTitle("Colour: none").setIcon("palette").onClick(() => {
			for (const i of indices) controller.setColor(i, null);
		})
	);
	m.addSeparator();

	if (indices.length === 1) {
		m.addItem(item =>
			item.setTitle("Rebind to another file…").setIcon("link").onClick(() => opts.onRebind(indices[0]!))
		);
	}

	m.addItem(item =>
		item.setTitle(`Remove ${indices.length > 1 ? `${indices.length} cards` : "card"} from corkboard`).setIcon("trash").onClick(() => {
			const sortedDesc = [...indices].sort((a, b) => b - a);
			for (const i of sortedDesc) {
				const path = controller.doc.data.cards[i]?.path;
				if (path) controller.removeCardByPath(path);
			}
		})
	);
	return m;
}

export function buildEmptyAreaMenu(opts: {
	app: App;
	controller: CorkboardController;
	listFolderMd: () => string[];
}): Menu {
	const { app, controller, listFolderMd } = opts;
	const m = new Menu();
	m.addItem(item =>
		item.setTitle("New card").setIcon("plus").onClick(async () => { await controller.createCard(); })
	);

	// Candidates: md files in the folder that are not already cards.
	const present = new Set(controller.doc.data.cards.map(c => c.path));
	const candidates = listFolderMd().filter(p => !present.has(p));
	m.addItem(item => {
		item.setTitle("Add existing file…").setIcon("link");
		if (candidates.length === 0) {
			item.setDisabled(true);
		} else {
			item.onClick(() => {
				new AddCardModal(app, candidates, (path) => {
					controller.appendCardForExternalFile(path);
				}).open();
			});
		}
	});
	return m;
}
