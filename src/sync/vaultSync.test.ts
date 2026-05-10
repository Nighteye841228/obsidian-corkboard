import { describe, it, expect, vi } from "vitest";
import { CorkboardSync } from "./vaultSync";
import { CorkboardDocument } from "../data/corkboardDocument";

function fakeController() {
	const doc = CorkboardDocument.parse("");
	return {
		doc,
		folderPath: "novel",
		isInflight: vi.fn().mockReturnValue(false),
		appendCardForExternalFile: vi.fn().mockImplementation((p: string) => doc.addCard({ path: p, synopsis: "", status: "todo", color: null })),
		removeCardByPath: vi.fn().mockImplementation((p: string) => doc.removeCardByPath(p)),
		renameCardPath: vi.fn().mockImplementation((o: string, n: string) => doc.renameCardPath(o, n)),
	};
}

describe("CorkboardSync", () => {
	it("dispatches create for md inside a folder with a registered view", async () => {
		const sync = new CorkboardSync({
			readCorkboardJson: vi.fn(),
			writeCorkboardJson: vi.fn(),
			hasCorkboard: vi.fn().mockReturnValue(true),
		});
		const ctrl = fakeController();
		sync.registerController("novel/index.corkboard", ctrl as any);
		await sync.handleCreate("novel/ch01.md");
		expect(ctrl.appendCardForExternalFile).toHaveBeenCalledWith("novel/ch01.md");
	});

	it("ignores events when path is in controller's inflight", async () => {
		const sync = new CorkboardSync({
			readCorkboardJson: vi.fn(),
			writeCorkboardJson: vi.fn(),
			hasCorkboard: vi.fn().mockReturnValue(true),
		});
		const ctrl = fakeController();
		ctrl.isInflight = vi.fn().mockReturnValue(true);
		sync.registerController("novel/index.corkboard", ctrl as any);
		await sync.handleCreate("novel/ch01.md");
		expect(ctrl.appendCardForExternalFile).not.toHaveBeenCalled();
	});

	it("falls back to direct JSON update when no controller is registered", async () => {
		const readCorkboardJson = vi.fn().mockResolvedValue(`{"version":1,"cardWidth":280,"cardHeight":180,"cards":[]}`);
		const writeCorkboardJson = vi.fn();
		const sync = new CorkboardSync({
			readCorkboardJson,
			writeCorkboardJson,
			hasCorkboard: vi.fn().mockReturnValue(true),
		});
		await sync.handleCreate("novel/ch01.md");
		expect(writeCorkboardJson).toHaveBeenCalledOnce();
		const written = JSON.parse(writeCorkboardJson.mock.calls[0]![1]);
		expect(written.cards.map((c: any) => c.path)).toEqual(["novel/ch01.md"]);
	});

	it("does nothing when the folder has no corkboard", async () => {
		const writeCorkboardJson = vi.fn();
		const sync = new CorkboardSync({
			readCorkboardJson: vi.fn(),
			writeCorkboardJson,
			hasCorkboard: vi.fn().mockReturnValue(false),
		});
		await sync.handleCreate("novel/ch01.md");
		expect(writeCorkboardJson).not.toHaveBeenCalled();
	});

	it("handleRename across folders = remove from old + add to new", async () => {
		const sync = new CorkboardSync({
			readCorkboardJson: vi.fn(),
			writeCorkboardJson: vi.fn(),
			hasCorkboard: vi.fn().mockReturnValue(true),
		});
		const oldCtrl = fakeController();
		const newCtrl = fakeController();
		sync.registerController("a/index.corkboard", oldCtrl as any);
		sync.registerController("b/index.corkboard", newCtrl as any);
		await sync.handleRename("a/x.md", "b/x.md");
		expect(oldCtrl.removeCardByPath).toHaveBeenCalledWith("a/x.md");
		expect(newCtrl.appendCardForExternalFile).toHaveBeenCalledWith("b/x.md");
	});

	it("handleRename within same folder updates path in place", async () => {
		const sync = new CorkboardSync({
			readCorkboardJson: vi.fn(),
			writeCorkboardJson: vi.fn(),
			hasCorkboard: vi.fn().mockReturnValue(true),
		});
		const ctrl = fakeController();
		sync.registerController("a/index.corkboard", ctrl as any);
		await sync.handleRename("a/old.md", "a/new.md");
		expect(ctrl.renameCardPath).toHaveBeenCalledWith("a/old.md", "a/new.md");
	});
});
