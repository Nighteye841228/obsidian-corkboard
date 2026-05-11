import { TextFileView, WorkspaceLeaf, TFile, normalizePath } from "obsidian";
import { render } from "preact";
import { CorkboardDocument } from "../data/corkboardDocument";
import { CorkboardController, VaultGateway } from "../state/controller";
import { createSelectionStore, SelectionStore } from "../state/selectionStore";
import { createDragStore, DragStore } from "../state/dragStore";
import { VIEW_TYPE_CORKBOARD } from "../constants";
import { folderOf } from "../sync/pathResolver";
import { serializeInitialData } from "../data/initialData";
import { CorkboardApp } from "./components/CorkboardApp";
import type { CorkboardSettings } from "../types";

export interface CorkboardViewDeps {
	buildGateway: (folderPath: string) => VaultGateway;
	onViewOpened: (corkboardPath: string, controller: CorkboardController) => void;
	onViewClosed: (corkboardPath: string) => void;
	getSettings: () => CorkboardSettings;
	pathExists: (path: string) => boolean;
	listFolderMd: (folderPath: string) => string[];
	onRebindCard: (corkboardPath: string, cardIndex: number) => void;
}

export class CorkboardView extends TextFileView {
	private deps: CorkboardViewDeps;
	private doc: CorkboardDocument | null = null;
	private controller: CorkboardController | null = null;
	private selection: SelectionStore | null = null;
	private drag: DragStore | null = null;
	private mounted = false;
	private corkboardPathRegistered: string | null = null;
	private originalRaw = "";          // last bytes loaded from disk
	private corruptError: string | null = null;

	constructor(leaf: WorkspaceLeaf, deps: CorkboardViewDeps) {
		super(leaf);
		this.deps = deps;
	}

	getViewType(): string { return VIEW_TYPE_CORKBOARD; }
	getDisplayText(): string { return this.file?.parent?.name ?? "Corkboard"; }
	getIcon(): string { return "layout-grid"; }

	// When in corrupt mode we echo back the original bytes so Obsidian never
	// silently overwrites a file the user might be able to repair.
	getViewData(): string {
		if (this.corruptError) return this.originalRaw;
		return this.doc ? this.doc.serialize() : "";
	}

	setViewData(data: string, _clear: boolean): void {
		this.originalRaw = data;
		const folderPath = this.file ? folderOf(this.file.path) : "";
		const parsed = CorkboardDocument.parse(data);

		if (parsed.error) {
			this.corruptError = parsed.error;
			this.doc = null;
			this.controller = null;
			this.selection = null;
			this.drag = null;
			this.renderError();
			return;
		}

		this.corruptError = null;
		this.doc = parsed;
		this.selection = createSelectionStore();
		this.drag = createDragStore();
		this.controller = new CorkboardController({
			doc: this.doc,
			folderPath,
			gateway: this.deps.buildGateway(folderPath),
			onChange: () => {
				// Force immediate save instead of relying on the 2 s requestSave debounce.
				// Critical when the user switches tabs / closes the leaf right after a mutation.
				if (!this.corruptError) {
					void this.save().catch((e: unknown) => console.error("Corkboard save failed", e));
				}
				this.renderApp();
			},
		});
		if (this.file) {
			const corkboardPath = this.file.path;
			if (this.corkboardPathRegistered && this.corkboardPathRegistered !== corkboardPath) {
				this.deps.onViewClosed(this.corkboardPathRegistered);
			}
			this.corkboardPathRegistered = corkboardPath;
			this.deps.onViewOpened(corkboardPath, this.controller);
		}
		this.renderApp();
	}

	clear(): void {
		if (this.mounted) {
			render(null, this.contentEl);
			this.mounted = false;
		}
		this.doc = null;
		this.controller = null;
		this.selection = null;
		this.drag = null;
	}

	async onClose(): Promise<void> {
		if (this.corkboardPathRegistered) {
			this.deps.onViewClosed(this.corkboardPathRegistered);
			this.corkboardPathRegistered = null;
		}
		this.clear();
	}

	private renderApp(): void {
		if (!this.controller || !this.selection || !this.drag) return;
		const folderPath = this.file ? folderOf(this.file.path) : "";
		render(
			<CorkboardApp
				app={this.app}
				controller={this.controller}
				selectionStore={this.selection}
				dragStore={this.drag}
				settings={this.deps.getSettings()}
				pathExists={this.deps.pathExists}
				listFolderMd={() => this.deps.listFolderMd(folderPath)}
				openMd={(p) => { void this.openMd(p); }}
				onRebindCard={(i) => this.deps.onRebindCard(this.corkboardPathRegistered!, i)}
				renameFile={(oldPath, newName) => this.renameFile(oldPath, newName)}
			/>,
			this.contentEl,
		);
		this.mounted = true;
	}

	private renderError(): void {
		const reset = async () => {
			// Replace corrupt content with a fresh document populated by the folder's
			// current md files (so the user's existing notes are not orphaned).
			const folderPath = this.file ? folderOf(this.file.path) : "";
			const fresh = serializeInitialData(this.deps.listFolderMd(folderPath));
			// Bypass our suppression — the user explicitly chose to overwrite.
			this.corruptError = null;
			this.originalRaw = fresh;
			// vault.process is atomic; safer than vault.modify against concurrent writes.
			if (this.file) await this.app.vault.process(this.file, () => fresh);
			this.setViewData(fresh, true);
		};
		const showRaw = () => {
			const blob = new Blob([this.originalRaw], { type: "text/plain" });
			const url = URL.createObjectURL(blob);
			window.open(url, "_blank");
		};

		render(
			<div class="corkboard-error-banner">
				<div class="corkboard-error-banner__title">⚠ This corkboard file is corrupt</div>
				<div class="corkboard-error-banner__detail">{this.corruptError}</div>
				<div class="corkboard-error-banner__actions">
					<button onClick={showRaw}>Show raw</button>
					<button onClick={() => { void reset(); }}>Reset (overwrite)</button>
				</div>
			</div>,
			this.contentEl,
		);
		this.mounted = true;
	}

	private async openMd(path: string): Promise<void> {
		const af = this.app.vault.getAbstractFileByPath(path);
		if (af instanceof TFile) {
			await this.app.workspace.getLeaf("tab").openFile(af);
		}
	}

	/**
	 * Rename an md file referenced by a card. The new name is the basename only
	 * (without `.md` and without folder prefix). The vault's rename event will
	 * propagate to the corkboard via vaultSync, updating the card path in place.
	 */
	private async renameFile(oldPath: string, newName: string): Promise<void> {
		const af = this.app.vault.getAbstractFileByPath(oldPath);
		if (!(af instanceof TFile)) return;
		const folder = folderOf(oldPath);
		const safe = newName.replace(/[\\/:*?"<>|]/g, "").trim();
		if (safe === "") return;
		const target = normalizePath(
			(folder === "" ? safe : `${folder}/${safe}`) + ".md",
		);
		if (target === oldPath) return;
		await this.app.fileManager.renameFile(af, target);
	}
}
