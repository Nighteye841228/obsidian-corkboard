import { App, FuzzySuggestModal } from "obsidian";

/**
 * Lets the user pick an existing md file (already on disk in the same folder
 * as the corkboard) and add it back as a card. Useful after "Remove from
 * corkboard" — the file remains on disk but the corkboard no longer references
 * it; this modal is the way back in.
 */
export class AddCardModal extends FuzzySuggestModal<string> {
	private candidates: string[];
	private onChoose: (path: string) => void;

	constructor(app: App, candidates: string[], onChoose: (path: string) => void) {
		super(app);
		this.candidates = candidates;
		this.onChoose = onChoose;
		this.setPlaceholder("Pick a file to add as a card…");
	}

	getItems(): string[] { return this.candidates; }

	getItemText(item: string): string {
		const name = item.split("/").pop() ?? item;
		return name.replace(/\.md$/i, "");
	}

	onChooseItem(item: string, _evt: MouseEvent | KeyboardEvent): void {
		this.onChoose(item);
	}
}
