import { describe, it, expect } from "vitest";
import { validateCorkboardData } from "./schema";

describe("validateCorkboardData", () => {
	it("accepts a minimal valid document", () => {
		const r = validateCorkboardData({
			version: 1,
			cardWidth: 280, cardHeight: 180,
			cards: [],
		});
		expect(r.ok).toBe(true);
	});

	it("accepts a document with cards", () => {
		const r = validateCorkboardData({
			version: 1,
			cardWidth: 280, cardHeight: 180,
			cards: [
				{ path: "a.md", synopsis: "", status: "todo", color: null },
				{ path: "b.md", synopsis: "x", status: "draft", color: "blue" },
			],
		});
		expect(r.ok).toBe(true);
	});

	it("rejects a non-object", () => {
		expect(validateCorkboardData(null).ok).toBe(false);
		expect(validateCorkboardData("x").ok).toBe(false);
	});

	it("rejects unknown version", () => {
		const r = validateCorkboardData({ version: 2, cardWidth: 0, cardHeight: 0, cards: [] });
		expect(r.ok).toBe(false);
	});

	it("rejects bad status id", () => {
		const r = validateCorkboardData({
			version: 1, cardWidth: 280, cardHeight: 180,
			cards: [{ path: "a.md", synopsis: "", status: "bogus", color: null }],
		});
		expect(r.ok).toBe(false);
	});

	it("rejects bad color key", () => {
		const r = validateCorkboardData({
			version: 1, cardWidth: 280, cardHeight: 180,
			cards: [{ path: "a.md", synopsis: "", status: "todo", color: "rainbow" }],
		});
		expect(r.ok).toBe(false);
	});
});
