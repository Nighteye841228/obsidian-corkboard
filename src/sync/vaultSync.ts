import { corkboardPathFor, isMarkdown } from "./pathResolver";
import { CorkboardDocument } from "../data/corkboardDocument";
import type { CorkboardController } from "../state/controller";

export interface SyncIO {
	readCorkboardJson(path: string): Promise<string>;
	writeCorkboardJson(path: string, json: string): Promise<void>;
	hasCorkboard(path: string): boolean;
}

export class CorkboardSync {
	private readonly io: SyncIO;
	private readonly registry = new Map<string, CorkboardController>();

	constructor(io: SyncIO) { this.io = io; }

	registerController(corkboardPath: string, controller: CorkboardController): void {
		this.registry.set(corkboardPath, controller);
	}
	unregisterController(corkboardPath: string): void {
		this.registry.delete(corkboardPath);
	}

	async handleCreate(mdPath: string): Promise<void> {
		if (!isMarkdown(mdPath)) return;
		const cb = corkboardPathFor(mdPath);
		if (!this.io.hasCorkboard(cb)) return;
		const ctrl = this.registry.get(cb);
		if (ctrl) {
			if (ctrl.isInflight(mdPath)) return;
			ctrl.appendCardForExternalFile(mdPath);
			return;
		}
		await this.directMutate(cb, doc => {
			if (!doc.data.cards.some(c => c.path === mdPath)) {
				doc.addCard({ path: mdPath, synopsis: "", status: "todo", color: null });
			}
		});
	}

	async handleDelete(mdPath: string): Promise<void> {
		if (!isMarkdown(mdPath)) return;
		const cb = corkboardPathFor(mdPath);
		if (!this.io.hasCorkboard(cb)) return;
		const ctrl = this.registry.get(cb);
		if (ctrl) {
			if (ctrl.isInflight(mdPath)) return;
			ctrl.removeCardByPath(mdPath);
			return;
		}
		await this.directMutate(cb, doc => doc.removeCardByPath(mdPath));
	}

	async handleRename(oldPath: string, newPath: string): Promise<void> {
		if (!isMarkdown(oldPath) && !isMarkdown(newPath)) return;
		const oldCb = corkboardPathFor(oldPath);
		const newCb = corkboardPathFor(newPath);
		if (oldCb === newCb) {
			if (!this.io.hasCorkboard(oldCb)) return;
			const ctrl = this.registry.get(oldCb);
			if (ctrl) {
				if (ctrl.isInflight(oldPath) || ctrl.isInflight(newPath)) return;
				ctrl.renameCardPath(oldPath, newPath);
				return;
			}
			await this.directMutate(oldCb, doc => doc.renameCardPath(oldPath, newPath));
		} else {
			await this.handleDelete(oldPath);
			await this.handleCreate(newPath);
		}
	}

	private async directMutate(cb: string, mutate: (d: CorkboardDocument) => void): Promise<void> {
		const raw = await this.io.readCorkboardJson(cb);
		const doc = CorkboardDocument.parse(raw);
		if (doc.error) return; // do not silently overwrite a corrupt corkboard
		mutate(doc);
		await this.io.writeCorkboardJson(cb, doc.serialize());
	}
}
