import { describe, it, expect } from "vitest";
import { mergeSettings } from "./settings";

describe("mergeSettings", () => {
	it("returns defaults when nothing is loaded", () => {
		const s = mergeSettings(null);
		expect(s.statusLabels.todo).toBe("Todo");
	});

	it("preserves user overrides for known ids", () => {
		const s = mergeSettings({ statusLabels: { todo: "TODO!", draft: "Draft", revision: "Rev", done: "Done" } });
		expect(s.statusLabels.todo).toBe("TODO!");
	});

	it("fills missing labels with defaults", () => {
		const s = mergeSettings({ statusLabels: { todo: "X" } as any });
		expect(s.statusLabels.draft).toBe("Draft");
	});
});
