import { describe, it, expect } from "vitest";
import { folderOf, corkboardPathFor, isMarkdown, isCorkboard } from "./pathResolver";

describe("pathResolver", () => {
	it("folderOf returns parent vault path", () => {
		expect(folderOf("novel/ch01.md")).toBe("novel");
		expect(folderOf("a/b/c.md")).toBe("a/b");
		expect(folderOf("top.md")).toBe("");
	});

	it("corkboardPathFor builds the index file path", () => {
		expect(corkboardPathFor("novel/ch01.md")).toBe("novel/index.corkboard");
		expect(corkboardPathFor("top.md")).toBe("index.corkboard");
	});

	it("isMarkdown checks .md extension", () => {
		expect(isMarkdown("a.md")).toBe(true);
		expect(isMarkdown("a.txt")).toBe(false);
		expect(isMarkdown("a.MD")).toBe(true);
	});

	it("isCorkboard recognizes index.corkboard files", () => {
		expect(isCorkboard("a/index.corkboard")).toBe(true);
		expect(isCorkboard("a/foo.corkboard")).toBe(false);
		expect(isCorkboard("index.corkboard")).toBe(true);
	});
});
