import type { CorkboardData, CorkboardCard, StatusId, ColorKey } from "../types";
import { STATUS_IDS, COLOR_PALETTE } from "../constants";

const STATUS_SET = new Set<string>(STATUS_IDS);
const COLOR_SET = new Set<string>(COLOR_PALETTE);

export type ValidationResult =
	| { ok: true; data: CorkboardData }
	| { ok: false; error: string };

function isObject(v: unknown): v is Record<string, unknown> {
	return v !== null && typeof v === "object" && !Array.isArray(v);
}

function validateCard(v: unknown, idx: number): { ok: true; card: CorkboardCard } | { ok: false; error: string } {
	if (!isObject(v)) return { ok: false, error: `card[${idx}] is not an object` };
	if (typeof v.path !== "string" || v.path === "") return { ok: false, error: `card[${idx}].path is invalid` };
	if (typeof v.synopsis !== "string") return { ok: false, error: `card[${idx}].synopsis is not a string` };
	if (typeof v.status !== "string" || !STATUS_SET.has(v.status)) return { ok: false, error: `card[${idx}].status is invalid` };
	if (v.color !== null && (typeof v.color !== "string" || !COLOR_SET.has(v.color))) {
		return { ok: false, error: `card[${idx}].color is invalid` };
	}
	return { ok: true, card: { path: v.path, synopsis: v.synopsis, status: v.status as StatusId, color: (v.color as ColorKey | null) } };
}

export function validateCorkboardData(v: unknown): ValidationResult {
	if (!isObject(v)) return { ok: false, error: "root is not an object" };
	if (v.version !== 1) return { ok: false, error: `unsupported version: ${String(v.version)}` };
	if (typeof v.cardWidth !== "number" || v.cardWidth <= 0) return { ok: false, error: "cardWidth invalid" };
	if (typeof v.cardHeight !== "number" || v.cardHeight <= 0) return { ok: false, error: "cardHeight invalid" };
	if (!Array.isArray(v.cards)) return { ok: false, error: "cards is not an array" };

	const cards: CorkboardCard[] = [];
	for (let i = 0; i < v.cards.length; i++) {
		const r = validateCard(v.cards[i], i);
		if (!r.ok) return r;
		cards.push(r.card);
	}
	return { ok: true, data: { version: 1, cardWidth: v.cardWidth, cardHeight: v.cardHeight, cards } };
}
