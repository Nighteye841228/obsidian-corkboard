import { describe, it, expect } from "vitest";
import { buildInitialData, serializeInitialData } from "./initialData";
import { DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT } from "../constants";

describe("buildInitialData", () => {
	it("produces an empty document for an empty file list", () => {
		const d = buildInitialData([]);
		expect(d.version).toBe(1);
		expect(d.cardWidth).toBe(DEFAULT_CARD_WIDTH);
		expect(d.cardHeight).toBe(DEFAULT_CARD_HEIGHT);
		expect(d.cards).toEqual([]);
	});

	it("produces one card per md path in given order", () => {
		const d = buildInitialData(["a/x.md", "a/y.md", "a/z.md"]);
		expect(d.cards.map(c => c.path)).toEqual(["a/x.md", "a/y.md", "a/z.md"]);
		expect(d.cards.every(c => c.synopsis === "" && c.status === "todo" && c.color === null)).toBe(true);
	});
});

describe("serializeInitialData", () => {
	it("returns parseable JSON", () => {
		const out = serializeInitialData(["a.md"]);
		const parsed: unknown = JSON.parse(out);
		expect(parsed).toMatchObject({ version: 1, cards: [{ path: "a.md", status: "todo" }] });
	});
});
