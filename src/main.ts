import { Plugin, TFile, TAbstractFile, Notice, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_CORKBOARD, FILE_EXT_CORKBOARD, CORKBOARD_FILE_NAME } from "./constants";
import type { CorkboardSettings } from "./types";
import { mergeSettings } from "./settings/settings";
import { CorkboardSettingTab } from "./settings/settingsTab";
import { CorkboardView } from "./view/CorkboardView";
import { CorkboardSync } from "./sync/vaultSync";
import { VaultGateway } from "./state/controller";
import { isMarkdown, folderOf } from "./sync/pathResolver";

export default class CorkboardPlugin extends Plugin {
  settings!: CorkboardSettings;
  private sync!: CorkboardSync;

  async onload() {
    this.settings = mergeSettings((await this.loadData()) as Partial<CorkboardSettings> | null);

    this.sync = new CorkboardSync({
      readCorkboardJson: async (path) => {
        const af = this.app.vault.getAbstractFileByPath(path);
        if (af instanceof TFile) return await this.app.vault.read(af);
        return "";
      },
      writeCorkboardJson: async (path, json) => {
        const af = this.app.vault.getAbstractFileByPath(path);
        if (af instanceof TFile) await this.app.vault.modify(af, json);
      },
      hasCorkboard: (path) => this.app.vault.getAbstractFileByPath(path) instanceof TFile,
    });

    this.registerView(VIEW_TYPE_CORKBOARD, (leaf: WorkspaceLeaf) => new CorkboardView(leaf, {
      buildGateway: (folderPath) => this.buildGateway(folderPath),
      getSettings: () => this.settings,
      pathExists: (p) => this.app.vault.getAbstractFileByPath(p) instanceof TFile,
      onViewOpened: (corkboardPath, controller) => this.sync.registerController(corkboardPath, controller),
      onViewClosed: (corkboardPath) => this.sync.unregisterController(corkboardPath),
      onRebindCard: (_corkboardPath, _i) => { new Notice("Rebind not implemented in v0.1.0"); },
    }));
    this.registerExtensions([FILE_EXT_CORKBOARD], VIEW_TYPE_CORKBOARD);

    this.registerEvent(this.app.vault.on("create", async (af: TAbstractFile) => {
      if (af instanceof TFile && isMarkdown(af.path)) await this.sync.handleCreate(af.path);
    }));
    this.registerEvent(this.app.vault.on("delete", async (af: TAbstractFile) => {
      if (af instanceof TFile && isMarkdown(af.path)) await this.sync.handleDelete(af.path);
    }));
    this.registerEvent(this.app.vault.on("rename", async (af: TAbstractFile, oldPath: string) => {
      if (af instanceof TFile) await this.sync.handleRename(oldPath, af.path);
    }));

    this.addCommand({
      id: "create-corkboard-here",
      name: "Create corkboard for current folder",
      callback: async () => {
        const af = this.app.workspace.getActiveFile();
        const folder = af ? folderOf(af.path) : "";
        const path = folder === "" ? CORKBOARD_FILE_NAME : `${folder}/${CORKBOARD_FILE_NAME}`;
        if (this.app.vault.getAbstractFileByPath(path)) {
          new Notice("This folder already has a corkboard.");
          return;
        }
        await this.app.vault.create(path, "");
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) await this.app.workspace.getLeaf("tab").openFile(file);
      },
    });

    this.addSettingTab(new CorkboardSettingTab(this.app, this));
  }

  onunload() {}

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private buildGateway(folderPath: string): VaultGateway {
    const app = this.app;
    return {
      listFolderMd: () => {
        const f = app.vault.getAbstractFileByPath(folderPath);
        if (!f || !("children" in f)) return [];
        return ((f as any).children as TAbstractFile[])
          .filter(c => c instanceof TFile && (c as TFile).extension === "md")
          .map(c => (c as TFile).path);
      },
      create: async (path, content) => { await app.vault.create(path, content); },
      delete: async (path) => {
        const af = app.vault.getAbstractFileByPath(path);
        if (af) await app.vault.delete(af);
      },
      getFrontmatterEnd: (path) => {
        const af = app.vault.getAbstractFileByPath(path);
        if (!(af instanceof TFile)) return null;
        const cache = app.metadataCache.getFileCache(af);
        const fm = cache?.frontmatterPosition;
        return fm ? fm.end.offset : null;
      },
      process: async (path, fn) => {
        const af = app.vault.getAbstractFileByPath(path);
        if (!(af instanceof TFile)) return "";
        return await app.vault.process(af, fn);
      },
      exists: (path) => app.vault.getAbstractFileByPath(path) instanceof TFile,
    };
  }
}
