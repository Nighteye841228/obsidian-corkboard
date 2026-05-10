/** @jsxImportSource preact */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/preact";
import { CardGrid } from "./CardGrid";
import { DragLayer } from "./DragLayer";

const inactiveDrag = { active: false, fromIndex: null, dropTarget: null };
const noopDrag = {
	onCardPointerDown: () => {},
	onGridPointerMove: () => {},
	onGridPointerUp: () => {},
};

describe("<CardGrid>", () => {
	it("renders all card slots in order", () => {
		const cards = [
			{ path: "1.md", synopsis: "", status: "todo" as const, color: null },
			{ path: "2.md", synopsis: "", status: "todo" as const, color: null },
		];
		const { container } = render(
			<CardGrid cards={cards} selected={new Set()} orphans={new Set()}
				cardWidth={200} cardHeight={120} statusLabels={{ todo: "T", draft: "D", revision: "R", done: "X" }}
				drag={inactiveDrag}
				onCardClick={() => {}} onCardDoubleClick={() => {}}
				onCardContextMenu={() => {}} onSynopsisCommit={() => {}}
				onEmptyContextMenu={() => {}}
				{...noopDrag} />
		);
		expect(container.querySelectorAll(".corkboard-card").length).toBe(2);
	});

	it("fires onEmptyContextMenu when right-clicking the empty area", () => {
		const onEmpty = vi.fn();
		const { container } = render(
			<CardGrid cards={[]} selected={new Set()} orphans={new Set()}
				cardWidth={200} cardHeight={120} statusLabels={{ todo: "T", draft: "D", revision: "R", done: "X" }}
				drag={inactiveDrag}
				onCardClick={() => {}} onCardDoubleClick={() => {}}
				onCardContextMenu={() => {}} onSynopsisCommit={() => {}}
				onEmptyContextMenu={onEmpty}
				{...noopDrag} />
		);
		fireEvent.contextMenu(container.querySelector(".corkboard-grid")!);
		expect(onEmpty).toHaveBeenCalled();
	});

	it("renders drop indicator when drag is active", () => {
		const { container } = render(<DragLayer drag={{ active: true, fromIndex: 0, dropTarget: 1 }} cardCount={3} />);
		expect(container.querySelector(".corkboard-drop-indicator")).toBeTruthy();
	});

	it("does not render drop indicator when inactive", () => {
		const { container } = render(<DragLayer drag={{ active: false, fromIndex: null, dropTarget: null }} cardCount={3} />);
		expect(container.querySelector(".corkboard-drop-indicator")).toBeFalsy();
	});
});
