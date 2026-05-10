import { Menu } from "obsidian";
import type { CorkboardController } from "../../state/controller";
import type { ColorKey, StatusId, CorkboardSettings } from "../../types";
import { COLOR_PALETTE, STATUS_IDS } from "../../constants";

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
				for (const i of indices) controller.setStatus(i, s as StatusId);
			})
		);
	}
	m.addSeparator();

	for (const c of COLOR_PALETTE) {
		m.addItem(item =>
			item.setTitle(`Colour: ${c}`).setIcon("palette").onClick(() => {
				for (const i of indices) controller.setColor(i, c as ColorKey);
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

export function buildEmptyAreaMenu(opts: { controller: CorkboardController }): Menu {
	const m = new Menu();
	m.addItem(item =>
		item.setTitle("New card").setIcon("plus").onClick(async () => { await opts.controller.createCard(); })
	);
	return m;
}
