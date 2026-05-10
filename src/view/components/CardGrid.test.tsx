/** @jsxImportSource preact */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/preact";
import { CardGrid } from "./CardGrid";

describe("<CardGrid>", () => {
	it("renders all card slots in order", () => {
		const cards = [
			{ path: "1.md", synopsis: "", status: "todo" as const, color: null },
			{ path: "2.md", synopsis: "", status: "todo" as const, color: null },
		];
		const { container } = render(
			<CardGrid cards={cards} selected={new Set()} orphans={new Set()}
				cardWidth={200} cardHeight={120} statusLabels={{ todo: "T", draft: "D", revision: "R", done: "X" }}
				onCardClick={() => {}} onCardDoubleClick={() => {}}
				onCardContextMenu={() => {}} onSynopsisCommit={() => {}}
				onEmptyContextMenu={() => {}} />
		);
		expect(container.querySelectorAll(".corkboard-card").length).toBe(2);
	});

	it("fires onEmptyContextMenu when right-clicking the empty area", () => {
		const onEmpty = vi.fn();
		const { container } = render(
			<CardGrid cards={[]} selected={new Set()} orphans={new Set()}
				cardWidth={200} cardHeight={120} statusLabels={{ todo: "T", draft: "D", revision: "R", done: "X" }}
				onCardClick={() => {}} onCardDoubleClick={() => {}}
				onCardContextMenu={() => {}} onSynopsisCommit={() => {}}
				onEmptyContextMenu={onEmpty} />
		);
		fireEvent.contextMenu(container.querySelector(".corkboard-grid")!);
		expect(onEmpty).toHaveBeenCalled();
	});
});
