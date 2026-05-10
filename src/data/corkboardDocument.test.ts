import { describe, it, expect } from "vitest";
import { CorkboardDocument } from "./corkboardDocument";

const VALID = `{
  "version": 1, "cardWidth": 280, "cardHeight": 180,
  "cards": [
    { "path": "a.md", "synopsis": "x", "status": "todo", "color": null }
  ]
}`;

describe("CorkboardDocument.parse", () => {
	it("parses valid JSON", () => {
		const d = CorkboardDocument.parse(VALID);
		expect(d.error).toBeNull();
		expect(d.data.cards.length).toBe(1);
		expect(d.data.cards[0]!.path).toBe("a.md");
	});

	it("returns empty doc + error on invalid JSON", () => {
		const d = CorkboardDocument.parse("{ not json");
		expect(d.error).not.toBeNull();
		expect(d.data.cards.length).toBe(0);
	});

	it("returns empty doc + error on schema failure", () => {
		const d = CorkboardDocument.parse('{"version": 99}');
		expect(d.error).not.toBeNull();
		expect(d.data.cards.length).toBe(0);
	});

	it("creates an empty document on empty input (new file case)", () => {
		const d = CorkboardDocument.parse("");
		expect(d.error).toBeNull();
		expect(d.data.cards.length).toBe(0);
	});
});

describe("CorkboardDocument.serialize", () => {
	it("round-trips a parsed document", () => {
		const d = CorkboardDocument.parse(VALID);
		const round = CorkboardDocument.parse(d.serialize());
		expect(round.data).toEqual(d.data);
	});

	it("produces stable JSON formatting (2-space indent)", () => {
		const d = CorkboardDocument.parse(VALID);
		expect(d.serialize()).toMatch(/\n {2}/);
	});
});

describe("CorkboardDocument mutations", () => {
	it("addCard appends", () => {
		const d = CorkboardDocument.parse("");
		d.addCard({ path: "x.md", synopsis: "", status: "todo", color: null });
		expect(d.data.cards.length).toBe(1);
	});

	it("removeCardByPath removes the matching entry", () => {
		const d = CorkboardDocument.parse(VALID);
		d.removeCardByPath("a.md");
		expect(d.data.cards.length).toBe(0);
	});

	it("renameCardPath updates the path in place", () => {
		const d = CorkboardDocument.parse(VALID);
		d.renameCardPath("a.md", "b.md");
		expect(d.data.cards[0]!.path).toBe("b.md");
	});

	it("reorder moves an item from one index to another", () => {
		const d = CorkboardDocument.parse("");
		d.addCard({ path: "1", synopsis: "", status: "todo", color: null });
		d.addCard({ path: "2", synopsis: "", status: "todo", color: null });
		d.addCard({ path: "3", synopsis: "", status: "todo", color: null });
		d.reorder(0, 2);
		expect(d.data.cards.map(c => c.path)).toEqual(["2", "3", "1"]);
	});

	it("update mutates a card in place", () => {
		const d = CorkboardDocument.parse(VALID);
		d.update(0, { synopsis: "new", status: "draft" });
		expect(d.data.cards[0]!.synopsis).toBe("new");
		expect(d.data.cards[0]!.status).toBe("draft");
		expect(d.data.cards[0]!.path).toBe("a.md");
	});

	it("setCardSize updates dimensions", () => {
		const d = CorkboardDocument.parse(VALID);
		d.setCardSize(320, 200);
		expect(d.data.cardWidth).toBe(320);
		expect(d.data.cardHeight).toBe(200);
	});
});
