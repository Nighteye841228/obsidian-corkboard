import type { CorkboardData, CorkboardCard } from "../types";
import { DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT } from "../constants";
import { validateCorkboardData } from "./schema";

function emptyData(): CorkboardData {
	return {
		version: 1,
		cardWidth: DEFAULT_CARD_WIDTH,
		cardHeight: DEFAULT_CARD_HEIGHT,
		cards: [],
	};
}

export class CorkboardDocument {
	data: CorkboardData;
	error: string | null;

	private constructor(data: CorkboardData, error: string | null) {
		this.data = data;
		this.error = error;
	}

	static parse(raw: string): CorkboardDocument {
		if (raw.trim() === "") return new CorkboardDocument(emptyData(), null);
		let json: unknown;
		try {
			json = JSON.parse(raw);
		} catch (e) {
			return new CorkboardDocument(emptyData(), `JSON parse error: ${(e as Error).message}`);
		}
		const r = validateCorkboardData(json);
		if (!r.ok) return new CorkboardDocument(emptyData(), r.error);
		return new CorkboardDocument(r.data, null);
	}

	serialize(): string {
		return JSON.stringify(this.data, null, 2);
	}

	addCard(card: CorkboardCard): void {
		this.data.cards.push(card);
	}

	removeCardByPath(path: string): void {
		this.data.cards = this.data.cards.filter(c => c.path !== path);
	}

	renameCardPath(oldPath: string, newPath: string): void {
		for (const c of this.data.cards) if (c.path === oldPath) c.path = newPath;
	}

	reorder(from: number, to: number): void {
		if (from === to) return;
		if (from < 0 || from >= this.data.cards.length) return;
		if (to < 0 || to >= this.data.cards.length) return;
		const item = this.data.cards.splice(from, 1)[0];
		if (!item) return;
		this.data.cards.splice(to, 0, item);
	}

	reorderMany(fromIndices: number[], to: number): void {
		const n = this.data.cards.length;
		const sorted = Array.from(new Set(fromIndices))
			.filter(i => Number.isInteger(i) && i >= 0 && i < n)
			.sort((a, b) => a - b);
		if (sorted.length === 0) return;
		if (to < 0 || to > n) return;
		if (sorted.includes(to)) return;
		const items = sorted.map(i => this.data.cards[i]!);
		for (let k = sorted.length - 1; k >= 0; k--) {
			this.data.cards.splice(sorted[k]!, 1);
		}
		const shift = sorted.filter(i => i < to).length;
		const insertAt = to - shift;
		this.data.cards.splice(insertAt, 0, ...items);
	}

	update(index: number, patch: Partial<CorkboardCard>): void {
		const card = this.data.cards[index];
		if (!card) return;
		Object.assign(card, patch);
	}

	setCardSize(width: number, height: number): void {
		this.data.cardWidth = width;
		this.data.cardHeight = height;
	}
}
