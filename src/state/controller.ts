import type { ColorKey, StatusId } from "../types";
import { CorkboardDocument } from "../data/corkboardDocument";
import { nextUntitled } from "../utils/filename";
import { composeWithSynopsis } from "../sync/synopsisInjector";

export interface VaultGateway {
	listFolderMd(folderPath: string): string[]; // vault paths of .md files in the folder
	create(path: string, content: string): Promise<void>;
	delete(path: string): Promise<void>;
	getFrontmatterEnd(path: string): number | null;
	process(path: string, fn: (content: string) => string): Promise<string>;
	exists(path: string): boolean;
}

export interface ControllerOpts {
	doc: CorkboardDocument;
	folderPath: string;            // vault path of the folder, e.g. "novel" or ""
	gateway: VaultGateway;
	onChange: () => void;          // called after every successful mutation
}

export class CorkboardController {
	readonly doc: CorkboardDocument;
	readonly folderPath: string;
	private readonly gw: VaultGateway;
	private readonly onChange: () => void;
	private readonly inflight = new Set<string>();

	constructor(opts: ControllerOpts) {
		this.doc = opts.doc;
		this.folderPath = opts.folderPath;
		this.gw = opts.gateway;
		this.onChange = opts.onChange;
	}

	isInflight(path: string): boolean { return this.inflight.has(path); }

	async createCard(): Promise<void> {
		const existing = this.gw.listFolderMd(this.folderPath).map(p => p.split("/").pop()!);
		const name = nextUntitled(existing);
		const path = this.folderPath === "" ? name : `${this.folderPath}/${name}`;
		this.inflight.add(path);
		try {
			await this.gw.create(path, "");
			this.doc.addCard({ path, synopsis: "", status: "todo", color: null });
			this.onChange();
		} finally {
			queueMicrotask(() => this.inflight.delete(path));
		}
	}

	removeCardByPath(path: string): void {
		this.doc.removeCardByPath(path);
		this.onChange();
	}

	renameCardPath(oldPath: string, newPath: string): void {
		this.doc.renameCardPath(oldPath, newPath);
		this.onChange();
	}

	appendCardForExternalFile(path: string): void {
		if (this.doc.data.cards.some(c => c.path === path)) return;
		this.doc.addCard({ path, synopsis: "", status: "todo", color: null });
		this.onChange();
	}

	reorder(from: number, to: number): void {
		this.doc.reorder(from, to);
		this.onChange();
	}

	updateSynopsis(index: number, text: string): void {
		this.doc.update(index, { synopsis: text });
		this.onChange();
	}

	setStatus(index: number, status: StatusId): void {
		this.doc.update(index, { status });
		this.onChange();
	}

	setColor(index: number, color: ColorKey | null): void {
		this.doc.update(index, { color });
		this.onChange();
	}

	setCardSize(width: number, height: number): void {
		this.doc.setCardSize(width, height);
		this.onChange();
	}

	async writeSynopsisToMd(index: number): Promise<void> {
		const card = this.doc.data.cards[index];
		if (!card) return;
		const fmEnd = this.gw.getFrontmatterEnd(card.path);
		await this.gw.process(card.path, content => composeWithSynopsis(content, card.synopsis, fmEnd));
	}
}
