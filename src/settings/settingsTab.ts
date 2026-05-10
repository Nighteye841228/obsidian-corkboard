import { App, PluginSettingTab, Plugin, Setting } from "obsidian";
import type { CorkboardSettings } from "../types";
import { STATUS_IDS } from "../constants";

export interface SettingsHost extends Plugin {
	settings: CorkboardSettings;
	saveSettings(): Promise<void>;
}

export class CorkboardSettingTab extends PluginSettingTab {
	plugin: SettingsHost;
	constructor(app: App, plugin: SettingsHost) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl).setName("Status labels").setHeading();

		for (const id of STATUS_IDS) {
			new Setting(containerEl)
				.setName(id)
				.setDesc(`Label shown on cards with status "${id}".`)
				.addText(t => t
					.setValue(this.plugin.settings.statusLabels[id])
					.setPlaceholder(id)
					.onChange(async (value) => {
						this.plugin.settings.statusLabels[id] = value || id;
						await this.plugin.saveSettings();
					})
				);
		}
	}
}
