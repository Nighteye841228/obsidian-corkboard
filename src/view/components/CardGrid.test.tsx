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
const noopEmptyClick = () => {};
const noopTitleRename = () => {};

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
				onEmptyClick={noopEmptyClick}
					onTitleRename={noopTitleRename}
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
				onEmptyClick={noopEmptyClick}
					onTitleRename={noopTitleRename}
				{...noopDrag} />
		);
		fireEvent.contextMenu(container.querySelector(".corkboard-grid")!);
		expect(onEmpty).toHaveBeenCalled();
	});

	it("fires onEmptyClick when clicking the empty area", () => {
		const onEmptyClick = vi.fn();
		const { container } = render(
			<CardGrid cards={[]} selected={new Set()} orphans={new Set()}
				cardWidth={200} cardHeight={120} statusLabels={{ todo: "T", draft: "D", revision: "R", done: "X" }}
				drag={inactiveDrag}
				onCardClick={() => {}} onCardDoubleClick={() => {}}
				onCardContextMenu={() => {}} onSynopsisCommit={() => {}}
				onEmptyContextMenu={() => {}}
				onEmptyClick={onEmptyClick}
					onTitleRename={noopTitleRename}
				{...noopDrag} />
		);
		fireEvent.click(container.querySelector(".corkboard-grid")!);
		expect(onEmptyClick).toHaveBeenCalled();
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
