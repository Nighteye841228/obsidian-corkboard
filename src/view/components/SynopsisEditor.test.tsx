/** @jsxImportSource preact */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/preact";
import { SynopsisEditor } from "./SynopsisEditor";

describe("<SynopsisEditor>", () => {
	it("renders the value", () => {
		const { getByRole } = render(<SynopsisEditor value="hello" onCommit={() => {}} />);
		expect((getByRole("textbox") as HTMLTextAreaElement).value).toBe("hello");
	});

	it("commits on blur with the latest text", () => {
		const onCommit = vi.fn();
		const { getByRole } = render(<SynopsisEditor value="" onCommit={onCommit} />);
		const ta = getByRole("textbox") as HTMLTextAreaElement;
		fireEvent.input(ta, { target: { value: "new text" } });
		fireEvent.blur(ta);
		expect(onCommit).toHaveBeenCalledWith("new text");
	});

	it("Escape reverts to the original value and does not commit", () => {
		const onCommit = vi.fn();
		const { getByRole } = render(<SynopsisEditor value="orig" onCommit={onCommit} />);
		const ta = getByRole("textbox") as HTMLTextAreaElement;
		fireEvent.input(ta, { target: { value: "draft" } });
		fireEvent.keyDown(ta, { key: "Escape" });
		fireEvent.blur(ta);
		expect(onCommit).not.toHaveBeenCalled();
		expect(ta.value).toBe("orig");
	});

	it("does not commit if value is unchanged on blur", () => {
		const onCommit = vi.fn();
		const { getByRole } = render(<SynopsisEditor value="x" onCommit={onCommit} />);
		fireEvent.blur(getByRole("textbox"));
		expect(onCommit).not.toHaveBeenCalled();
	});
});
