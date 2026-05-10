/** @jsxImportSource preact */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/preact";
import { Card } from "./Card";

const baseCard = { path: "novel/a.md", synopsis: "hello", status: "todo" as const, color: null };

describe("<Card>", () => {
	it("shows the basename of the path as the title", () => {
		const { getByText } = render(
			<Card index={0} card={baseCard} selected={false} orphan={false} width={280} height={180} statusLabel="Todo"
				onClick={() => {}} onDoubleClick={() => {}} onContextMenu={() => {}} onSynopsisCommit={() => {}} />
		);
		expect(getByText("a")).toBeInTheDocument();
	});

	it("calls onClick with modifiers", () => {
		const onClick = vi.fn();
		const { container } = render(
			<Card index={2} card={baseCard} selected={false} orphan={false} width={280} height={180} statusLabel="Todo"
				onClick={onClick} onDoubleClick={() => {}} onContextMenu={() => {}} onSynopsisCommit={() => {}} />
		);
		fireEvent.click(container.querySelector(".corkboard-card")!, { metaKey: true });
		expect(onClick).toHaveBeenCalledWith(2, { meta: true, shift: false });
	});

	it("calls onDoubleClick with index", () => {
		const onDouble = vi.fn();
		const { container } = render(
			<Card index={1} card={baseCard} selected={false} orphan={false} width={280} height={180} statusLabel="Todo"
				onClick={() => {}} onDoubleClick={onDouble} onContextMenu={() => {}} onSynopsisCommit={() => {}} />
		);
		fireEvent.dblClick(container.querySelector(".corkboard-card")!);
		expect(onDouble).toHaveBeenCalledWith(1);
	});

	it("renders selected state", () => {
		const { container } = render(
			<Card index={0} card={baseCard} selected={true} orphan={false} width={280} height={180} statusLabel="Todo"
				onClick={() => {}} onDoubleClick={() => {}} onContextMenu={() => {}} onSynopsisCommit={() => {}} />
		);
		expect(container.querySelector(".corkboard-card.is-selected")).toBeTruthy();
	});

	it("renders orphan badge when orphan=true", () => {
		const { container } = render(
			<Card index={0} card={baseCard} selected={false} orphan={true} width={280} height={180} statusLabel="Todo"
				onClick={() => {}} onDoubleClick={() => {}} onContextMenu={() => {}} onSynopsisCommit={() => {}} />
		);
		expect(container.querySelector(".corkboard-card.is-orphan")).toBeTruthy();
	});
});
