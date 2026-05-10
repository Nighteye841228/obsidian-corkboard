export class Plugin {
	app: any;
	manifest: any;
	constructor(app: any, manifest: any) {
		this.app = app;
		this.manifest = manifest;
	}
	addRibbonIcon() {}
	addCommand() {}
	addSettingTab() {}
	registerEvent() {}
	registerView() {}
	registerExtensions() {}
	loadData() {
		return Promise.resolve({});
	}
	saveData() {
		return Promise.resolve();
	}
}

export class TextFileView {
	contentEl = document.createElement("div");
	file: any = null;
	data = "";
	constructor(public leaf: any) {}
	getViewData() {
		return this.data;
	}
	setViewData(data: string) {
		this.data = data;
	}
	clear() {
		this.data = "";
	}
	requestSave() {}
	onOpen() {
		return Promise.resolve();
	}
	onClose() {
		return Promise.resolve();
	}
	getViewType() {
		return "";
	}
}

export class Notice {
	constructor(public message: string) {}
}

export class Menu {
	items: any[] = [];
	addItem(cb: (item: any) => void) {
		const item = {
			title: "",
			icon: "",
			onClick: () => {},
			setTitle(t: string) {
				item.title = t;
				return item;
			},
			setIcon(i: string) {
				item.icon = i;
				return item;
			},
			onClick(fn: () => void) {
				item.onClick = fn;
				return item;
			},
		};
		cb(item);
		this.items.push(item);
		return this;
	}
	addSeparator() {
		this.items.push({ separator: true });
		return this;
	}
	showAtMouseEvent() {}
	showAtPosition() {}
}

export class TFile {
	constructor(
		public path: string,
		public name: string,
		public parent: any = null,
	) {}
	get basename() {
		return this.name.replace(/\.md$/, "");
	}
	get extension() {
		return this.name.split(".").pop() ?? "";
	}
}

export class TFolder {
	children: any[] = [];
	constructor(
		public path: string,
		public name: string,
	) {}
}

export class PluginSettingTab {
	constructor(
		public app: any,
		public plugin: any,
	) {}
	display() {}
	hide() {}
}

export class Setting {
	constructor(public containerEl: HTMLElement) {}
	setName() {
		return this;
	}
	setDesc() {
		return this;
	}
	addText(cb: (t: any) => void) {
		cb({
			setValue() {
				return this;
			},
			onChange() {
				return this;
			},
			setPlaceholder() {
				return this;
			},
		});
		return this;
	}
}
