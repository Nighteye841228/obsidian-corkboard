# Corkboard Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Scrivener-style corkboard plugin for Obsidian: a `.corkboard` file per folder renders the folder's `.md` files as flowing-grid index cards with synopsis / status / colour, drag-reorder, multi-select, and context-menu actions.

**Architecture:** Four layers — Data (`CorkboardDocument`), State (controller + UI stores), Sync (vault events ↔ corkboard JSON), View (`TextFileView` shell that mounts a Preact tree). Controller is the single mutation pipe; vault events route through it when a view is open and write JSON directly otherwise. Obsidian's `TextFileView.requestSave` handles dirty/save.

**Tech Stack:** TypeScript, esbuild, Obsidian API (`TextFileView`, `Vault`, `MetadataCache`, `Menu`), Preact (automatic JSX runtime), Vitest + jsdom + @testing-library/preact for tests.

---

## Reference

- Spec: `docs/superpowers/specs/2026-05-09-corkboard-plugin-design.md`
- Conventions for the Obsidian plugin scaffold are in `AGENTS.md` at the plugin root.
- Plugin folder is currently `obsidian-sample-plugin/` and will be renamed to `corkboard/` in Task 1. **All paths below assume the post-rename folder name `corkboard/`.** When working before Task 1 completes, substitute `obsidian-sample-plugin/` for `corkboard/`.

The plugin folder is at: `/Users/nighteye1228/Documents/corkboard/.obsidian/plugins/corkboard/` (after Task 1).

All file paths in tasks are **relative to that plugin folder** unless prefixed otherwise.

---

## Task 1: Rename plugin folder and update manifest

**Files:**
- Modify: `manifest.json`
- Modify: `package.json`
- Modify: `versions.json`

- [ ] **Step 1: Inspect current state**

```bash
ls -la /Users/nighteye1228/Documents/corkboard/.obsidian/plugins/
cat /Users/nighteye1228/Documents/corkboard/.obsidian/plugins/obsidian-sample-plugin/manifest.json
```

Expected: see the `obsidian-sample-plugin/` folder containing the sample manifest with `id: "sample-plugin"`.

- [ ] **Step 2: Update `manifest.json`**

Replace contents of `/Users/nighteye1228/Documents/corkboard/.obsidian/plugins/obsidian-sample-plugin/manifest.json` with:

```json
{
  "id": "corkboard",
  "name": "Corkboard",
  "version": "0.1.0",
  "minAppVersion": "1.4.0",
  "description": "Scrivener-style corkboard view for Obsidian folders. Each folder gets an index.corkboard with cards for its markdown files.",
  "author": "victor",
  "isDesktopOnly": true
}
```

- [ ] **Step 3: Update `package.json`**

Replace `name` and `description`:

```json
{
  "name": "obsidian-corkboard",
  "version": "0.1.0",
  "description": "Scrivener-style corkboard plugin for Obsidian.",
  ...
}
```

Leave the rest of `package.json` untouched.

- [ ] **Step 4: Update `versions.json`**

Replace contents with:

```json
{
  "0.1.0": "1.4.0"
}
```

- [ ] **Step 5: Rename the plugin folder**

```bash
cd /Users/nighteye1228/Documents/corkboard/.obsidian/plugins/
mv obsidian-sample-plugin corkboard
ls
```

Expected: the folder is now named `corkboard/`.

- [ ] **Step 6: Verify**

```bash
cd /Users/nighteye1228/Documents/corkboard/.obsidian/plugins/corkboard
cat manifest.json | grep '"id"'
```

Expected: `"id": "corkboard",`. The folder name and `id` now match (Obsidian requirement).

- [ ] **Step 7: Commit (inside the inner repo)**

```bash
cd /Users/nighteye1228/Documents/corkboard/.obsidian/plugins/corkboard
git add manifest.json package.json versions.json
git commit -m "chore: rename plugin to corkboard, set v0.1.0 / minAppVersion 1.4.0"
```

---

## Task 2: Install runtime and dev dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add Preact runtime dep**

```bash
cd /Users/nighteye1228/Documents/corkboard/.obsidian/plugins/corkboard
npm install preact@^10.20.0
```

- [ ] **Step 2: Add test dev deps**

```bash
npm install --save-dev vitest@^1.6.0 @testing-library/preact@^3.2.4 @testing-library/jest-dom@^6.4.0 jsdom@^24.0.0
```

- [ ] **Step 3: Verify**

```bash
cat package.json | grep -E '(preact|vitest|@testing-library|jsdom)'
```

Expected: see all four lines.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add preact runtime + vitest test stack"
```

---

## Task 3: Configure esbuild for Preact JSX

**Files:**
- Modify: `esbuild.config.mjs`
- Modify: `tsconfig.json`

- [ ] **Step 1: Read the existing esbuild config**

```bash
cat /Users/nighteye1228/Documents/corkboard/.obsidian/plugins/corkboard/esbuild.config.mjs
```

Note the `loader`, `format`, `external`, and `target` settings.

- [ ] **Step 2: Add JSX handling to `esbuild.config.mjs`**

Inside the build options object (top-level keys, alongside `entryPoints`, `bundle`, etc.) add:

```js
  jsx: "automatic",
  jsxImportSource: "preact",
  loader: { ".tsx": "tsx", ".ts": "ts" },
```

Keep all existing fields (entryPoints, format, external, etc.).

- [ ] **Step 3: Update `tsconfig.json`**

Replace `compilerOptions` keys for JSX so it stays in sync with esbuild. Add or update:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["DOM", "ES2020"],
    "noEmit": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

- [ ] **Step 4: Sanity build (no source files exist yet — should still succeed against existing `src/main.ts`)**

```bash
npm run build
```

Expected: build completes (or fails only because of pre-existing sample code, not because of JSX config). If it fails for a JSX reason, fix the config.

- [ ] **Step 5: Commit**

```bash
git add esbuild.config.mjs tsconfig.json
git commit -m "build: configure esbuild + tsc for preact automatic JSX"
```

---

## Task 4: Configure Vitest with jsdom and Obsidian mock

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/__mocks__/obsidian.ts`
- Create: `tests/setup.ts`
- Modify: `package.json` (add `test` script)

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    alias: {
      obsidian: "/tests/__mocks__/obsidian.ts",
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "preact",
  },
});
```

- [ ] **Step 2: Create the Obsidian mock**

Create `tests/__mocks__/obsidian.ts`:

```ts
export class Plugin {
  app: any;
  manifest: any;
  constructor(app: any, manifest: any) { this.app = app; this.manifest = manifest; }
  addRibbonIcon() {}
  addCommand() {}
  addSettingTab() {}
  registerEvent() {}
  registerView() {}
  registerExtensions() {}
  loadData() { return Promise.resolve({}); }
  saveData() { return Promise.resolve(); }
}

export class TextFileView {
  contentEl = document.createElement("div");
  file: any = null;
  data = "";
  constructor(public leaf: any) {}
  getViewData() { return this.data; }
  setViewData(data: string) { this.data = data; }
  clear() { this.data = ""; }
  requestSave() {}
  onOpen() { return Promise.resolve(); }
  onClose() { return Promise.resolve(); }
  getViewType() { return ""; }
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
      setTitle(t: string) { item.title = t; return item; },
      setIcon(i: string) { item.icon = i; return item; },
      onClick(fn: () => void) { item.onClick = fn; return item; },
    };
    cb(item);
    this.items.push(item);
    return this;
  }
  addSeparator() { this.items.push({ separator: true }); return this; }
  showAtMouseEvent() {}
  showAtPosition() {}
}

export class TFile {
  constructor(public path: string, public name: string, public parent: any = null) {}
  get basename() { return this.name.replace(/\.md$/, ""); }
  get extension() { return this.name.split(".").pop() ?? ""; }
}

export class TFolder {
  children: any[] = [];
  constructor(public path: string, public name: string) {}
}

export class PluginSettingTab {
  constructor(public app: any, public plugin: any) {}
  display() {}
  hide() {}
}

export class Setting {
  constructor(public containerEl: HTMLElement) {}
  setName() { return this; }
  setDesc() { return this; }
  addText(cb: (t: any) => void) {
    cb({ setValue() { return this; }, onChange() { return this; }, setPlaceholder() { return this; } });
    return this;
  }
}
```

- [ ] **Step 3: Create `tests/setup.ts`**

```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 4: Add `test` script in `package.json`**

In the `scripts` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Sanity-run vitest**

```bash
npm run test
```

Expected: vitest runs and reports "No test files found". (Not an error — there are no tests yet.)

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts tests/ package.json
git commit -m "test: configure vitest + jsdom + obsidian mock"
```

---

## Task 5: Set up source tree skeleton

**Files:**
- Delete: `src/settings.ts` (sample)
- Modify: `src/main.ts` (replace sample with stub)
- Create: empty subdirectories `src/data/`, `src/state/`, `src/sync/`, `src/view/`, `src/view/components/`, `src/settings/`, `src/utils/` (each with a `.gitkeep`)

- [ ] **Step 1: Remove the sample settings file**

```bash
cd /Users/nighteye1228/Documents/corkboard/.obsidian/plugins/corkboard
git rm src/settings.ts
```

- [ ] **Step 2: Create empty subdirectories with placeholder `.gitkeep`**

```bash
mkdir -p src/data src/state src/sync src/view/components src/settings src/utils
touch src/data/.gitkeep src/state/.gitkeep src/sync/.gitkeep src/view/.gitkeep src/view/components/.gitkeep src/settings/.gitkeep src/utils/.gitkeep
```

- [ ] **Step 3: Replace `src/main.ts` with a stub**

Overwrite `src/main.ts` so the build still succeeds:

```ts
import { Plugin } from "obsidian";

export default class CorkboardPlugin extends Plugin {
  async onload() {}
  onunload() {}
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: build succeeds (produces `main.js` at plugin root).

- [ ] **Step 5: Commit**

```bash
git add src/main.ts \
  src/data/.gitkeep src/state/.gitkeep src/sync/.gitkeep \
  src/view/.gitkeep src/view/components/.gitkeep \
  src/settings/.gitkeep src/utils/.gitkeep
git commit -m "refactor: stub plugin entry, scaffold source layout"
```

---

## Task 6: Define core types and constants

**Files:**
- Create: `src/types.ts`
- Create: `src/constants.ts`

- [ ] **Step 1: Write `src/types.ts`**

```ts
export type StatusId = "todo" | "draft" | "revision" | "done";

export type ColorKey =
  | "red" | "orange" | "yellow" | "green"
  | "blue" | "purple" | "pink" | "gray";

export interface CorkboardCard {
  path: string;
  synopsis: string;
  status: StatusId;
  color: ColorKey | null;
}

export interface CorkboardData {
  version: 1;
  cardWidth: number;
  cardHeight: number;
  cards: CorkboardCard[];
}

export interface CorkboardSettings {
  statusLabels: Record<StatusId, string>;
}
```

- [ ] **Step 2: Write `src/constants.ts`**

```ts
import type { ColorKey, StatusId, CorkboardSettings } from "./types";

export const VIEW_TYPE_CORKBOARD = "corkboard";
export const FILE_EXT_CORKBOARD = "corkboard";
export const CORKBOARD_FILE_NAME = "index.corkboard";

export const DEFAULT_CARD_WIDTH = 280;
export const DEFAULT_CARD_HEIGHT = 180;
export const MIN_CARD_WIDTH = 160;
export const MIN_CARD_HEIGHT = 120;
export const MAX_CARD_WIDTH = 480;
export const MAX_CARD_HEIGHT = 320;

export const STATUS_IDS: StatusId[] = ["todo", "draft", "revision", "done"];

export const COLOR_PALETTE: ColorKey[] = [
  "red", "orange", "yellow", "green",
  "blue", "purple", "pink", "gray",
];

export const COLOR_HEX: Record<ColorKey, string> = {
  red:    "#e57373",
  orange: "#ffb74d",
  yellow: "#fff176",
  green:  "#81c784",
  blue:   "#64b5f6",
  purple: "#ba68c8",
  pink:   "#f48fb1",
  gray:   "#bdbdbd",
};

export const DEFAULT_SETTINGS: CorkboardSettings = {
  statusLabels: {
    todo: "Todo",
    draft: "Draft",
    revision: "Revision",
    done: "Done",
  },
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/constants.ts
git commit -m "feat(types): core types + constants for corkboard"
```

---

## Task 7: `utils/debounce.ts`

**Files:**
- Create: `src/utils/debounce.ts`
- Test: `src/utils/debounce.test.ts`

- [ ] **Step 1: Write the failing test**

`src/utils/debounce.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { debounce } from "./debounce";

describe("debounce", () => {
  it("calls the function once after the wait period for many rapid calls", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d(); d(); d();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("passes the latest arguments", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 50);
    d(1); d(2); d(3);
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledWith(3);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/utils/debounce.test.ts
```

Expected: FAIL with "Cannot find module ./debounce".

- [ ] **Step 3: Implement**

`src/utils/debounce.ts`:

```ts
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): (...args: A) => void {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => { t = null; fn(...args); }, ms);
  };
}
```

- [ ] **Step 4: Run test**

```bash
npm run test -- src/utils/debounce.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/debounce.ts src/utils/debounce.test.ts
git commit -m "feat(utils): debounce helper"
```

---

## Task 8: `utils/filename.ts` — `nextUntitled`

**Files:**
- Create: `src/utils/filename.ts`
- Test: `src/utils/filename.test.ts`

- [ ] **Step 1: Write the failing test**

`src/utils/filename.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { nextUntitled } from "./filename";

describe("nextUntitled", () => {
  it("returns Untitled-1.md when none exist", () => {
    expect(nextUntitled([])).toBe("Untitled-1.md");
  });

  it("returns Untitled-2.md when Untitled-1 exists", () => {
    expect(nextUntitled(["Untitled-1.md"])).toBe("Untitled-2.md");
  });

  it("fills the first gap", () => {
    expect(nextUntitled(["Untitled-1.md", "Untitled-3.md"])).toBe("Untitled-2.md");
  });

  it("ignores unrelated names", () => {
    expect(nextUntitled(["foo.md", "bar.md"])).toBe("Untitled-1.md");
  });

  it("ignores wrong extensions", () => {
    expect(nextUntitled(["Untitled-1.txt"])).toBe("Untitled-1.md");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/utils/filename.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`src/utils/filename.ts`:

```ts
export function nextUntitled(existingFileNames: string[]): string {
  const taken = new Set<number>();
  for (const name of existingFileNames) {
    const m = name.match(/^Untitled-(\d+)\.md$/);
    if (m) taken.add(Number(m[1]));
  }
  let i = 1;
  while (taken.has(i)) i++;
  return `Untitled-${i}.md`;
}
```

- [ ] **Step 4: Run test**

```bash
npm run test -- src/utils/filename.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/filename.ts src/utils/filename.test.ts
git commit -m "feat(utils): nextUntitled fills lowest free Untitled-N slot"
```

---

## Task 9: `data/schema.ts` — runtime validator

**Files:**
- Create: `src/data/schema.ts`
- Test: `src/data/schema.test.ts`

- [ ] **Step 1: Write the failing test**

`src/data/schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateCorkboardData } from "./schema";

describe("validateCorkboardData", () => {
  it("accepts a minimal valid document", () => {
    const r = validateCorkboardData({
      version: 1,
      cardWidth: 280, cardHeight: 180,
      cards: [],
    });
    expect(r.ok).toBe(true);
  });

  it("accepts a document with cards", () => {
    const r = validateCorkboardData({
      version: 1,
      cardWidth: 280, cardHeight: 180,
      cards: [
        { path: "a.md", synopsis: "", status: "todo", color: null },
        { path: "b.md", synopsis: "x", status: "draft", color: "blue" },
      ],
    });
    expect(r.ok).toBe(true);
  });

  it("rejects a non-object", () => {
    expect(validateCorkboardData(null).ok).toBe(false);
    expect(validateCorkboardData("x").ok).toBe(false);
  });

  it("rejects unknown version", () => {
    const r = validateCorkboardData({ version: 2, cardWidth: 0, cardHeight: 0, cards: [] });
    expect(r.ok).toBe(false);
  });

  it("rejects bad status id", () => {
    const r = validateCorkboardData({
      version: 1, cardWidth: 280, cardHeight: 180,
      cards: [{ path: "a.md", synopsis: "", status: "bogus", color: null }],
    });
    expect(r.ok).toBe(false);
  });

  it("rejects bad color key", () => {
    const r = validateCorkboardData({
      version: 1, cardWidth: 280, cardHeight: 180,
      cards: [{ path: "a.md", synopsis: "", status: "todo", color: "rainbow" }],
    });
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test -- src/data/schema.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`src/data/schema.ts`:

```ts
import type { CorkboardData, CorkboardCard, StatusId, ColorKey } from "../types";
import { STATUS_IDS, COLOR_PALETTE } from "../constants";

const STATUS_SET = new Set<string>(STATUS_IDS);
const COLOR_SET = new Set<string>(COLOR_PALETTE);

export type ValidationResult =
  | { ok: true; data: CorkboardData }
  | { ok: false; error: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function validateCard(v: unknown, idx: number): { ok: true; card: CorkboardCard } | { ok: false; error: string } {
  if (!isObject(v)) return { ok: false, error: `card[${idx}] is not an object` };
  if (typeof v.path !== "string" || v.path === "") return { ok: false, error: `card[${idx}].path is invalid` };
  if (typeof v.synopsis !== "string") return { ok: false, error: `card[${idx}].synopsis is not a string` };
  if (typeof v.status !== "string" || !STATUS_SET.has(v.status)) return { ok: false, error: `card[${idx}].status is invalid` };
  if (v.color !== null && (typeof v.color !== "string" || !COLOR_SET.has(v.color))) {
    return { ok: false, error: `card[${idx}].color is invalid` };
  }
  return { ok: true, card: { path: v.path, synopsis: v.synopsis, status: v.status as StatusId, color: (v.color as ColorKey | null) } };
}

export function validateCorkboardData(v: unknown): ValidationResult {
  if (!isObject(v)) return { ok: false, error: "root is not an object" };
  if (v.version !== 1) return { ok: false, error: `unsupported version: ${String(v.version)}` };
  if (typeof v.cardWidth !== "number" || v.cardWidth <= 0) return { ok: false, error: "cardWidth invalid" };
  if (typeof v.cardHeight !== "number" || v.cardHeight <= 0) return { ok: false, error: "cardHeight invalid" };
  if (!Array.isArray(v.cards)) return { ok: false, error: "cards is not an array" };

  const cards: CorkboardCard[] = [];
  for (let i = 0; i < v.cards.length; i++) {
    const r = validateCard(v.cards[i], i);
    if (!r.ok) return r;
    cards.push(r.card);
  }
  return { ok: true, data: { version: 1, cardWidth: v.cardWidth, cardHeight: v.cardHeight, cards } };
}
```

- [ ] **Step 4: Run test**

```bash
npm run test -- src/data/schema.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/schema.ts src/data/schema.test.ts
git commit -m "feat(data): runtime schema validator for corkboard JSON"
```

---

## Task 10: `data/corkboardDocument.ts` — parse, serialize, mutations

**Files:**
- Create: `src/data/corkboardDocument.ts`
- Test: `src/data/corkboardDocument.test.ts`

- [ ] **Step 1: Write failing tests**

`src/data/corkboardDocument.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { CorkboardDocument } from "./corkboardDocument";

const VALID = `{
  "version": 1, "cardWidth": 280, "cardHeight": 180,
  "cards": [
    { "path": "a.md", "synopsis": "x", "status": "todo", "color": null }
  ]
}`;

describe("CorkboardDocument.parse", () => {
  it("parses valid JSON", () => {
    const d = CorkboardDocument.parse(VALID);
    expect(d.error).toBeNull();
    expect(d.data.cards.length).toBe(1);
    expect(d.data.cards[0].path).toBe("a.md");
  });

  it("returns empty doc + error on invalid JSON", () => {
    const d = CorkboardDocument.parse("{ not json");
    expect(d.error).not.toBeNull();
    expect(d.data.cards.length).toBe(0);
  });

  it("returns empty doc + error on schema failure", () => {
    const d = CorkboardDocument.parse('{"version": 99}');
    expect(d.error).not.toBeNull();
    expect(d.data.cards.length).toBe(0);
  });

  it("creates an empty document on empty input (new file case)", () => {
    const d = CorkboardDocument.parse("");
    expect(d.error).toBeNull();
    expect(d.data.cards.length).toBe(0);
  });
});

describe("CorkboardDocument.serialize", () => {
  it("round-trips a parsed document", () => {
    const d = CorkboardDocument.parse(VALID);
    const round = CorkboardDocument.parse(d.serialize());
    expect(round.data).toEqual(d.data);
  });

  it("produces stable JSON formatting (2-space indent)", () => {
    const d = CorkboardDocument.parse(VALID);
    expect(d.serialize()).toMatch(/\n  /);
  });
});

describe("CorkboardDocument mutations", () => {
  it("addCard appends", () => {
    const d = CorkboardDocument.parse("");
    d.addCard({ path: "x.md", synopsis: "", status: "todo", color: null });
    expect(d.data.cards.length).toBe(1);
  });

  it("removeCardByPath removes the matching entry", () => {
    const d = CorkboardDocument.parse(VALID);
    d.removeCardByPath("a.md");
    expect(d.data.cards.length).toBe(0);
  });

  it("renameCardPath updates the path in place", () => {
    const d = CorkboardDocument.parse(VALID);
    d.renameCardPath("a.md", "b.md");
    expect(d.data.cards[0].path).toBe("b.md");
  });

  it("reorder moves an item from one index to another", () => {
    const d = CorkboardDocument.parse("");
    d.addCard({ path: "1", synopsis: "", status: "todo", color: null });
    d.addCard({ path: "2", synopsis: "", status: "todo", color: null });
    d.addCard({ path: "3", synopsis: "", status: "todo", color: null });
    d.reorder(0, 2);
    expect(d.data.cards.map(c => c.path)).toEqual(["2", "3", "1"]);
  });

  it("update mutates a card in place", () => {
    const d = CorkboardDocument.parse(VALID);
    d.update(0, { synopsis: "new", status: "draft" });
    expect(d.data.cards[0].synopsis).toBe("new");
    expect(d.data.cards[0].status).toBe("draft");
    expect(d.data.cards[0].path).toBe("a.md");
  });

  it("setCardSize updates dimensions", () => {
    const d = CorkboardDocument.parse(VALID);
    d.setCardSize(320, 200);
    expect(d.data.cardWidth).toBe(320);
    expect(d.data.cardHeight).toBe(200);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test -- src/data/corkboardDocument.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`src/data/corkboardDocument.ts`:

```ts
import type { CorkboardData, CorkboardCard } from "../types";
import { DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT } from "../constants";
import { validateCorkboardData } from "./schema";

function emptyData(): CorkboardData {
  return {
    version: 1,
    cardWidth: DEFAULT_CARD_WIDTH,
    cardHeight: DEFAULT_CARD_HEIGHT,
    cards: [],
  };
}

export class CorkboardDocument {
  data: CorkboardData;
  error: string | null;

  private constructor(data: CorkboardData, error: string | null) {
    this.data = data;
    this.error = error;
  }

  static parse(raw: string): CorkboardDocument {
    if (raw.trim() === "") return new CorkboardDocument(emptyData(), null);
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      return new CorkboardDocument(emptyData(), `JSON parse error: ${(e as Error).message}`);
    }
    const r = validateCorkboardData(json);
    if (!r.ok) return new CorkboardDocument(emptyData(), r.error);
    return new CorkboardDocument(r.data, null);
  }

  serialize(): string {
    return JSON.stringify(this.data, null, 2);
  }

  addCard(card: CorkboardCard): void {
    this.data.cards.push(card);
  }

  removeCardByPath(path: string): void {
    this.data.cards = this.data.cards.filter(c => c.path !== path);
  }

  renameCardPath(oldPath: string, newPath: string): void {
    for (const c of this.data.cards) if (c.path === oldPath) c.path = newPath;
  }

  reorder(from: number, to: number): void {
    if (from === to) return;
    if (from < 0 || from >= this.data.cards.length) return;
    if (to < 0 || to >= this.data.cards.length) return;
    const [item] = this.data.cards.splice(from, 1);
    this.data.cards.splice(to, 0, item);
  }

  update(index: number, patch: Partial<CorkboardCard>): void {
    if (index < 0 || index >= this.data.cards.length) return;
    Object.assign(this.data.cards[index], patch);
  }

  setCardSize(width: number, height: number): void {
    this.data.cardWidth = width;
    this.data.cardHeight = height;
  }
}
```

- [ ] **Step 4: Run test**

```bash
npm run test -- src/data/corkboardDocument.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/corkboardDocument.ts src/data/corkboardDocument.test.ts
git commit -m "feat(data): CorkboardDocument with parse / serialize / mutations"
```

---

## Task 11: `state/selectionStore.ts`

**Files:**
- Create: `src/state/selectionStore.ts`
- Test: `src/state/selectionStore.test.ts`

- [ ] **Step 1: Write failing tests**

`src/state/selectionStore.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createSelectionStore } from "./selectionStore";

describe("selectionStore", () => {
  it("starts empty", () => {
    const s = createSelectionStore();
    expect(Array.from(s.get())).toEqual([]);
  });

  it("plain click selects only one", () => {
    const s = createSelectionStore();
    s.click(2, { meta: false, shift: false });
    expect(Array.from(s.get())).toEqual([2]);
    s.click(5, { meta: false, shift: false });
    expect(Array.from(s.get())).toEqual([5]);
  });

  it("meta-click toggles", () => {
    const s = createSelectionStore();
    s.click(1, { meta: true, shift: false });
    s.click(2, { meta: true, shift: false });
    expect(Array.from(s.get()).sort()).toEqual([1, 2]);
    s.click(1, { meta: true, shift: false });
    expect(Array.from(s.get())).toEqual([2]);
  });

  it("shift-click selects a range from anchor", () => {
    const s = createSelectionStore();
    s.click(2, { meta: false, shift: false });
    s.click(5, { meta: false, shift: true });
    expect(Array.from(s.get()).sort((a,b)=>a-b)).toEqual([2,3,4,5]);
  });

  it("clear removes all", () => {
    const s = createSelectionStore();
    s.click(1, { meta: false, shift: false });
    s.clear();
    expect(Array.from(s.get())).toEqual([]);
  });

  it("notifies subscribers on change", () => {
    const s = createSelectionStore();
    let count = 0;
    const unsub = s.subscribe(() => { count++; });
    s.click(1, { meta: false, shift: false });
    s.click(2, { meta: false, shift: false });
    expect(count).toBe(2);
    unsub();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test -- src/state/selectionStore.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`src/state/selectionStore.ts`:

```ts
export interface ClickModifiers { meta: boolean; shift: boolean; }

export interface SelectionStore {
  get(): ReadonlySet<number>;
  click(index: number, mods: ClickModifiers): void;
  clear(): void;
  subscribe(fn: () => void): () => void;
}

export function createSelectionStore(): SelectionStore {
  let selected = new Set<number>();
  let anchor: number | null = null;
  const subs = new Set<() => void>();
  const notify = () => { for (const fn of subs) fn(); };

  return {
    get: () => selected,
    click(index, mods) {
      if (mods.shift && anchor !== null) {
        const lo = Math.min(anchor, index), hi = Math.max(anchor, index);
        const next = new Set<number>();
        for (let i = lo; i <= hi; i++) next.add(i);
        selected = next;
      } else if (mods.meta) {
        const next = new Set(selected);
        if (next.has(index)) next.delete(index); else next.add(index);
        selected = next;
        anchor = index;
      } else {
        selected = new Set([index]);
        anchor = index;
      }
      notify();
    },
    clear() {
      selected = new Set();
      anchor = null;
      notify();
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
```

- [ ] **Step 4: Run test**

```bash
npm run test -- src/state/selectionStore.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/selectionStore.ts src/state/selectionStore.test.ts
git commit -m "feat(state): selection store with click / meta / shift / clear"
```

---

## Task 12: `state/dragStore.ts`

**Files:**
- Create: `src/state/dragStore.ts`
- Test: `src/state/dragStore.test.ts`

- [ ] **Step 1: Write failing tests**

`src/state/dragStore.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { createDragStore } from "./dragStore";

describe("dragStore", () => {
  it("is inactive initially", () => {
    const s = createDragStore();
    expect(s.get().active).toBe(false);
  });

  it("start activates", () => {
    const s = createDragStore();
    s.start(3);
    expect(s.get()).toEqual({ active: true, fromIndex: 3, dropTarget: null });
  });

  it("setDropTarget updates while active", () => {
    const s = createDragStore();
    s.start(0);
    s.setDropTarget(2);
    expect(s.get().dropTarget).toBe(2);
  });

  it("end resets state", () => {
    const s = createDragStore();
    s.start(0);
    s.end();
    expect(s.get().active).toBe(false);
  });

  it("queues a function while active and flushes on end", () => {
    const s = createDragStore();
    const fn = vi.fn();
    s.start(0);
    s.runOrQueue(fn);
    expect(fn).not.toHaveBeenCalled();
    s.end();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("runs immediately when not active", () => {
    const s = createDragStore();
    const fn = vi.fn();
    s.runOrQueue(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test -- src/state/dragStore.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`src/state/dragStore.ts`:

```ts
export interface DragState {
  active: boolean;
  fromIndex: number | null;
  dropTarget: number | null;
}

export interface DragStore {
  get(): DragState;
  start(fromIndex: number): void;
  setDropTarget(idx: number | null): void;
  end(): void;
  runOrQueue(fn: () => void): void;
  subscribe(fn: () => void): () => void;
}

export function createDragStore(): DragStore {
  let state: DragState = { active: false, fromIndex: null, dropTarget: null };
  const queue: Array<() => void> = [];
  const subs = new Set<() => void>();
  const notify = () => { for (const fn of subs) fn(); };

  return {
    get: () => state,
    start(fromIndex) {
      state = { active: true, fromIndex, dropTarget: null };
      notify();
    },
    setDropTarget(idx) {
      state = { ...state, dropTarget: idx };
      notify();
    },
    end() {
      state = { active: false, fromIndex: null, dropTarget: null };
      notify();
      while (queue.length) {
        const fn = queue.shift()!;
        try { fn(); } catch (e) { console.error("queued vault event handler threw", e); }
      }
    },
    runOrQueue(fn) {
      if (state.active) queue.push(fn);
      else fn();
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
```

- [ ] **Step 4: Run test**

```bash
npm run test -- src/state/dragStore.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/dragStore.ts src/state/dragStore.test.ts
git commit -m "feat(state): drag store with run-or-queue for sync events mid-drag"
```

---

## Task 13: `sync/pathResolver.ts`

**Files:**
- Create: `src/sync/pathResolver.ts`
- Test: `src/sync/pathResolver.test.ts`

- [ ] **Step 1: Write failing tests**

`src/sync/pathResolver.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { folderOf, corkboardPathFor, isMarkdown, isCorkboard } from "./pathResolver";

describe("pathResolver", () => {
  it("folderOf returns parent vault path", () => {
    expect(folderOf("novel/ch01.md")).toBe("novel");
    expect(folderOf("a/b/c.md")).toBe("a/b");
    expect(folderOf("top.md")).toBe("");
  });

  it("corkboardPathFor builds the index file path", () => {
    expect(corkboardPathFor("novel/ch01.md")).toBe("novel/index.corkboard");
    expect(corkboardPathFor("top.md")).toBe("index.corkboard");
  });

  it("isMarkdown checks .md extension", () => {
    expect(isMarkdown("a.md")).toBe(true);
    expect(isMarkdown("a.txt")).toBe(false);
    expect(isMarkdown("a.MD")).toBe(true);
  });

  it("isCorkboard recognizes index.corkboard files", () => {
    expect(isCorkboard("a/index.corkboard")).toBe(true);
    expect(isCorkboard("a/foo.corkboard")).toBe(false);
    expect(isCorkboard("index.corkboard")).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test -- src/sync/pathResolver.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`src/sync/pathResolver.ts`:

```ts
import { CORKBOARD_FILE_NAME } from "../constants";

export function folderOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

export function corkboardPathFor(mdPath: string): string {
  const folder = folderOf(mdPath);
  return folder === "" ? CORKBOARD_FILE_NAME : `${folder}/${CORKBOARD_FILE_NAME}`;
}

export function isMarkdown(path: string): boolean {
  return /\.md$/i.test(path);
}

export function isCorkboard(path: string): boolean {
  const i = path.lastIndexOf("/");
  const name = i === -1 ? path : path.slice(i + 1);
  return name === CORKBOARD_FILE_NAME;
}
```

- [ ] **Step 4: Run test**

```bash
npm run test -- src/sync/pathResolver.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sync/pathResolver.ts src/sync/pathResolver.test.ts
git commit -m "feat(sync): pathResolver helpers (folderOf, corkboardPathFor, ext checks)"
```

---

## Task 14: `sync/synopsisInjector.ts`

**Files:**
- Create: `src/sync/synopsisInjector.ts`
- Test: `src/sync/synopsisInjector.test.ts`

The injector is implemented as a pure string transform (`composeWithSynopsis(content, synopsis, frontmatterEnd)`). The actual `vault.process` call lives in the controller and just runs the transform; the transform is pure and easy to test.

- [ ] **Step 1: Write failing tests**

`src/sync/synopsisInjector.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { composeWithSynopsis } from "./synopsisInjector";

describe("composeWithSynopsis", () => {
  it("inserts at the head when there is no frontmatter", () => {
    const out = composeWithSynopsis("body line\n", "summary", null);
    expect(out).toBe("summary\n\nbody line\n");
  });

  it("inserts after frontmatter and a blank line", () => {
    const fm = "---\ntitle: x\n---\n";
    const body = "body line\n";
    const out = composeWithSynopsis(fm + body, "summary", fm.length);
    expect(out).toBe(fm + "\nsummary\n\nbody line\n");
  });

  it("does not duplicate existing newlines after frontmatter", () => {
    const fm = "---\ntitle: x\n---\n\n";
    const body = "body line\n";
    const out = composeWithSynopsis(fm + body, "summary", fm.length);
    // does not strip; just inserts as a fresh paragraph
    expect(out.startsWith(fm)).toBe(true);
    expect(out.includes("summary\n\nbody line")).toBe(true);
  });

  it("handles multi-line synopsis", () => {
    const out = composeWithSynopsis("body\n", "line1\nline2", null);
    expect(out).toBe("line1\nline2\n\nbody\n");
  });

  it("handles empty file", () => {
    const out = composeWithSynopsis("", "s", null);
    expect(out).toBe("s\n");
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test -- src/sync/synopsisInjector.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`src/sync/synopsisInjector.ts`:

```ts
/**
 * Insert `synopsis` as a new paragraph immediately after frontmatter (if any),
 * separated by blank lines from surrounding content. Pure string transform.
 *
 * @param content full file content
 * @param synopsis text to insert (no trailing newline expected)
 * @param frontmatterEnd offset of the first byte after the closing `---\n`,
 *                       or null if the file has no frontmatter
 */
export function composeWithSynopsis(
  content: string,
  synopsis: string,
  frontmatterEnd: number | null,
): string {
  if (content === "") return synopsis + "\n";
  const insertAt = frontmatterEnd ?? 0;
  const before = content.slice(0, insertAt);
  const after = content.slice(insertAt);
  const lead = (before.endsWith("\n") || before === "") ? "\n" : "\n\n";
  const trail = after.startsWith("\n") ? "\n" : "\n\n";
  return before + lead + synopsis + trail + after.replace(/^\n+/, "");
}
```

> Implementation note: the transform always treats the synopsis as a fresh paragraph and may produce one extra newline above it; this is harmless in markdown rendering and keeps the function purely additive.

- [ ] **Step 4: Run test**

```bash
npm run test -- src/sync/synopsisInjector.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sync/synopsisInjector.ts src/sync/synopsisInjector.test.ts
git commit -m "feat(sync): pure composeWithSynopsis transform"
```

---

## Task 15: `state/controller.ts` — CorkboardController

**Files:**
- Create: `src/state/controller.ts`
- Test: `src/state/controller.test.ts`

The controller depends on a small `VaultGateway` interface (defined in this task) so we can unit-test without a real Obsidian Vault.

- [ ] **Step 1: Write failing tests**

`src/state/controller.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { CorkboardDocument } from "../data/corkboardDocument";
import { CorkboardController, VaultGateway } from "./controller";

function makeGateway(): VaultGateway & { listMd: () => string[]; reads: string[] } {
  const files = new Map<string, string>();
  return {
    listMd: () => Array.from(files.keys()).filter(p => p.endsWith(".md")),
    reads: [],
    listFolderMd: vi.fn().mockImplementation(() => Array.from(files.keys()).filter(p => p.endsWith(".md"))),
    create: vi.fn().mockImplementation(async (path: string, content: string) => { files.set(path, content); }),
    delete: vi.fn().mockImplementation(async (path: string) => { files.delete(path); }),
    getFrontmatterEnd: vi.fn().mockReturnValue(null),
    process: vi.fn().mockImplementation(async (path: string, fn: (s: string) => string) => {
      const out = fn(files.get(path) ?? "");
      files.set(path, out);
      return out;
    }),
    exists: (p: string) => files.has(p),
  } as any;
}

describe("CorkboardController", () => {
  it("createCard creates a new md file and appends a card", async () => {
    const doc = CorkboardDocument.parse("");
    const gw = makeGateway();
    const onChange = vi.fn();
    const c = new CorkboardController({ doc, folderPath: "novel", gateway: gw, onChange });
    await c.createCard();
    expect(gw.create).toHaveBeenCalledTimes(1);
    expect(doc.data.cards.length).toBe(1);
    expect(doc.data.cards[0].path).toBe("novel/Untitled-1.md");
    expect(onChange).toHaveBeenCalled();
  });

  it("createCard skips existing Untitled-1", async () => {
    const doc = CorkboardDocument.parse("");
    const gw = makeGateway();
    await gw.create!("novel/Untitled-1.md", "");
    const c = new CorkboardController({ doc, folderPath: "novel", gateway: gw, onChange: () => {} });
    await c.createCard();
    expect(doc.data.cards[0].path).toBe("novel/Untitled-2.md");
  });

  it("removeCardByPath removes the card", async () => {
    const doc = CorkboardDocument.parse(`{"version":1,"cardWidth":280,"cardHeight":180,"cards":[{"path":"a.md","synopsis":"","status":"todo","color":null}]}`);
    const c = new CorkboardController({ doc, folderPath: "", gateway: makeGateway(), onChange: () => {} });
    c.removeCardByPath("a.md");
    expect(doc.data.cards.length).toBe(0);
  });

  it("reorder mutates and notifies", () => {
    const doc = CorkboardDocument.parse("");
    doc.addCard({ path: "1", synopsis: "", status: "todo", color: null });
    doc.addCard({ path: "2", synopsis: "", status: "todo", color: null });
    const onChange = vi.fn();
    const c = new CorkboardController({ doc, folderPath: "", gateway: makeGateway(), onChange });
    c.reorder(0, 1);
    expect(doc.data.cards.map(x=>x.path)).toEqual(["2","1"]);
    expect(onChange).toHaveBeenCalled();
  });

  it("updateSynopsis updates the right card", () => {
    const doc = CorkboardDocument.parse(`{"version":1,"cardWidth":280,"cardHeight":180,"cards":[{"path":"a.md","synopsis":"old","status":"todo","color":null}]}`);
    const c = new CorkboardController({ doc, folderPath: "", gateway: makeGateway(), onChange: () => {} });
    c.updateSynopsis(0, "new");
    expect(doc.data.cards[0].synopsis).toBe("new");
  });

  it("writeSynopsisToMd calls gateway.process with composed content", async () => {
    const doc = CorkboardDocument.parse(`{"version":1,"cardWidth":280,"cardHeight":180,"cards":[{"path":"a.md","synopsis":"summary","status":"todo","color":null}]}`);
    const gw = makeGateway();
    await gw.create!("a.md", "body\n");
    const c = new CorkboardController({ doc, folderPath: "", gateway: gw, onChange: () => {} });
    await c.writeSynopsisToMd(0);
    expect(gw.process).toHaveBeenCalled();
  });

  it("inflight prevents echo on self-initiated create (sync layer queries inflight set)", async () => {
    const doc = CorkboardDocument.parse("");
    const gw = makeGateway();
    const c = new CorkboardController({ doc, folderPath: "novel", gateway: gw, onChange: () => {} });
    const p = c.createCard();
    expect(c.isInflight("novel/Untitled-1.md")).toBe(true);
    await p;
    // queueMicrotask deferral: still considered inflight in same microtask, cleared after flush
    await new Promise<void>(r => queueMicrotask(() => r()));
    expect(c.isInflight("novel/Untitled-1.md")).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test -- src/state/controller.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`src/state/controller.ts`:

```ts
import type { CorkboardCard, ColorKey, StatusId } from "../types";
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
```

- [ ] **Step 4: Run test**

```bash
npm run test -- src/state/controller.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/controller.ts src/state/controller.test.ts
git commit -m "feat(state): CorkboardController with inflight guard + vault gateway interface"
```

---

## Task 16: `sync/vaultSync.ts`

**Files:**
- Create: `src/sync/vaultSync.ts`
- Test: `src/sync/vaultSync.test.ts`

`vaultSync` exposes a registry: views can register/unregister their controllers, keyed by corkboard path. When vault events arrive, sync layer dispatches to the correct controller (or to a fallback "no-view" path that mutates JSON directly). Tests use a fake gateway and fake registry.

- [ ] **Step 1: Write failing tests**

`src/sync/vaultSync.test.ts`:

```ts
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
    const written = JSON.parse(writeCorkboardJson.mock.calls[0][1]);
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
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test -- src/sync/vaultSync.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`src/sync/vaultSync.ts`:

```ts
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
```

- [ ] **Step 4: Run test**

```bash
npm run test -- src/sync/vaultSync.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sync/vaultSync.ts src/sync/vaultSync.test.ts
git commit -m "feat(sync): CorkboardSync with controller registry + direct fallback"
```

---

## Task 17: `view/CorkboardView.ts` — Obsidian view shell

**Files:**
- Create: `src/view/CorkboardView.ts`

This task is mostly integration with Obsidian; we don't unit-test the view (covered by manual integration). We do verify it compiles and the build still succeeds.

The view also implements the spec §7 corrupt-JSON path: when `CorkboardDocument.parse` returns an `error`, the view enters **read-only mode**: no controller is created, `requestSave` is suppressed, `getViewData` echoes back the original bytes, and the contentEl shows an error banner with [Show raw] and [Reset] buttons.

- [ ] **Step 1: Write the view shell**

`src/view/CorkboardView.ts`:

```ts
import { TextFileView, WorkspaceLeaf, TFile } from "obsidian";
import { render } from "preact";
import { h } from "preact";
import { CorkboardDocument } from "../data/corkboardDocument";
import { CorkboardController, VaultGateway } from "../state/controller";
import { createSelectionStore, SelectionStore } from "../state/selectionStore";
import { createDragStore, DragStore } from "../state/dragStore";
import { VIEW_TYPE_CORKBOARD, DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT } from "../constants";
import { folderOf } from "../sync/pathResolver";
import { CorkboardApp } from "./components/CorkboardApp";

export interface CorkboardViewDeps {
  buildGateway: (folderPath: string) => VaultGateway;
  onViewOpened: (corkboardPath: string, controller: CorkboardController) => void;
  onViewClosed: (corkboardPath: string) => void;
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

  // Suppress requestSave while in corrupt mode (controller never exists then,
  // so onChange wouldn't fire — but the override is here as a defence in depth).
  requestSave(): void {
    if (this.corruptError) return;
    super.requestSave();
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
        this.requestSave();
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
    render(
      <CorkboardApp
        controller={this.controller}
        selectionStore={this.selection}
        dragStore={this.drag}
        openMd={(path: string) => this.openMd(path)}
      />,
      this.contentEl,
    );
    this.mounted = true;
  }

  private renderError(): void {
    const reset = async () => {
      // Replace corrupt content with a fresh empty document.
      const empty = JSON.stringify(
        { version: 1, cardWidth: DEFAULT_CARD_WIDTH, cardHeight: DEFAULT_CARD_HEIGHT, cards: [] },
        null, 2,
      );
      // Bypass our suppression — the user explicitly chose to overwrite.
      this.corruptError = null;
      this.originalRaw = empty;
      if (this.file) await this.app.vault.modify(this.file, empty);
      this.setViewData(empty, true);
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
          <button onClick={reset}>Reset (overwrite)</button>
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
}
```

- [ ] **Step 2: Add the placeholder `CorkboardApp` so the import resolves (real impl in later task)**

Create `src/view/components/CorkboardApp.tsx`:

```tsx
import { h } from "preact";
import type { CorkboardController } from "../../state/controller";
import type { SelectionStore } from "../../state/selectionStore";
import type { DragStore } from "../../state/dragStore";

export interface CorkboardAppProps {
  controller: CorkboardController;
  selectionStore: SelectionStore;
  dragStore: DragStore;
  openMd: (path: string) => void;
}

export function CorkboardApp(_props: CorkboardAppProps) {
  return <div className="corkboard-app">corkboard placeholder</div>;
}
```

- [ ] **Step 3: Verify the project builds**

```bash
npm run build
```

Expected: success. `main.js` exists at the plugin root.

- [ ] **Step 4: Verify tests still pass**

```bash
npm run test
```

Expected: all green (the new files have no tests yet).

- [ ] **Step 5: Commit**

```bash
git add src/view/CorkboardView.ts src/view/components/CorkboardApp.tsx
git commit -m "feat(view): CorkboardView shell + Preact mount placeholder"
```

---

## Task 18: `<Card>` component

**Files:**
- Create: `src/view/components/Card.tsx`
- Test: `src/view/components/Card.test.tsx`

- [ ] **Step 1: Write failing tests**

`src/view/components/Card.test.tsx`:

```tsx
/** @jsxImportSource preact */
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
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test -- src/view/components/Card.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`src/view/components/Card.tsx`:

```tsx
/** @jsxImportSource preact */
import type { CorkboardCard } from "../../types";
import { SynopsisEditor } from "./SynopsisEditor";

export interface CardProps {
  index: number;
  card: CorkboardCard;
  selected: boolean;
  orphan: boolean;
  width: number;
  height: number;
  statusLabel: string;
  onClick: (index: number, mods: { meta: boolean; shift: boolean }) => void;
  onDoubleClick: (index: number) => void;
  onContextMenu: (index: number, evt: MouseEvent) => void;
  onSynopsisCommit: (index: number, text: string) => void;
}

function basename(path: string): string {
  const tail = path.split("/").pop() ?? path;
  return tail.replace(/\.md$/i, "");
}

export function Card(props: CardProps) {
  const cls = [
    "corkboard-card",
    props.selected ? "is-selected" : "",
    props.orphan ? "is-orphan" : "",
    props.card.color ? `corkboard-color-${props.card.color}` : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      class={cls}
      style={{ width: `${props.width}px`, height: `${props.height}px` }}
      onClick={(e: MouseEvent) => props.onClick(props.index, { meta: e.metaKey || e.ctrlKey, shift: e.shiftKey })}
      onDblClick={() => props.onDoubleClick(props.index)}
      onContextMenu={(e: MouseEvent) => { e.preventDefault(); props.onContextMenu(props.index, e); }}
    >
      <div class="corkboard-card__title">{basename(props.card.path)}</div>
      <div class="corkboard-card__status">{props.statusLabel}</div>
      <SynopsisEditor
        value={props.card.synopsis}
        onCommit={(text: string) => props.onSynopsisCommit(props.index, text)}
      />
      {props.orphan && <div class="corkboard-card__orphan-badge">⚠ missing</div>}
    </div>
  );
}
```

- [ ] **Step 4: Create a stub `SynopsisEditor` so the import resolves (full impl in next task)**

`src/view/components/SynopsisEditor.tsx`:

```tsx
/** @jsxImportSource preact */
export interface SynopsisEditorProps { value: string; onCommit: (text: string) => void; }
export function SynopsisEditor(props: SynopsisEditorProps) {
  return <div class="corkboard-synopsis">{props.value}</div>;
}
```

- [ ] **Step 5: Run test**

```bash
npm run test -- src/view/components/Card.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/view/components/Card.tsx src/view/components/SynopsisEditor.tsx src/view/components/Card.test.tsx
git commit -m "feat(view): <Card> with click/dblclick/contextmenu and orphan badge"
```

---

## Task 19: `<SynopsisEditor>`

**Files:**
- Modify: `src/view/components/SynopsisEditor.tsx`
- Test: `src/view/components/SynopsisEditor.test.tsx`

- [ ] **Step 1: Write failing tests**

`src/view/components/SynopsisEditor.test.tsx`:

```tsx
/** @jsxImportSource preact */
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
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test -- src/view/components/SynopsisEditor.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Replace `src/view/components/SynopsisEditor.tsx`:

```tsx
/** @jsxImportSource preact */
import { useEffect, useRef, useState } from "preact/hooks";

export interface SynopsisEditorProps {
  value: string;
  onCommit: (text: string) => void;
}

export function SynopsisEditor(props: SynopsisEditorProps) {
  const [text, setText] = useState(props.value);
  const lastExternal = useRef(props.value);

  useEffect(() => {
    if (props.value !== lastExternal.current) {
      setText(props.value);
      lastExternal.current = props.value;
    }
  }, [props.value]);

  const cancel = () => {
    setText(lastExternal.current);
  };

  const commitIfChanged = () => {
    if (text !== lastExternal.current) {
      lastExternal.current = text;
      props.onCommit(text);
    }
  };

  return (
    <textarea
      class="corkboard-synopsis"
      value={text}
      onInput={(e: any) => setText(e.target.value)}
      onBlur={commitIfChanged}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          cancel();
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
    />
  );
}
```

- [ ] **Step 4: Run test**

```bash
npm run test -- src/view/components/SynopsisEditor.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Verify Card test still passes**

```bash
npm run test -- src/view/components/Card.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/view/components/SynopsisEditor.tsx src/view/components/SynopsisEditor.test.tsx
git commit -m "feat(view): <SynopsisEditor> with blur-commit, Esc cancel, no-op when unchanged"
```

---

## Task 20: `<CardGrid>`

**Files:**
- Create: `src/view/components/CardGrid.tsx`
- Test: `src/view/components/CardGrid.test.tsx`

The grid is a simple flex-wrap layout with uniform-size children. It owns the empty-area context menu hook.

- [ ] **Step 1: Write failing tests**

`src/view/components/CardGrid.test.tsx`:

```tsx
/** @jsxImportSource preact */
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/preact";
import { CardGrid } from "./CardGrid";

describe("<CardGrid>", () => {
  it("renders all card slots in order", () => {
    const cards = [
      { path: "1.md", synopsis: "", status: "todo" as const, color: null },
      { path: "2.md", synopsis: "", status: "todo" as const, color: null },
    ];
    const { container } = render(
      <CardGrid cards={cards} selected={new Set()} orphans={new Set()}
        cardWidth={200} cardHeight={120} statusLabels={{ todo: "T", draft: "D", revision: "R", done: "X" }}
        onCardClick={() => {}} onCardDoubleClick={() => {}}
        onCardContextMenu={() => {}} onSynopsisCommit={() => {}}
        onEmptyContextMenu={() => {}} />
    );
    expect(container.querySelectorAll(".corkboard-card").length).toBe(2);
  });

  it("fires onEmptyContextMenu when right-clicking the empty area", () => {
    const onEmpty = vi.fn();
    const { container } = render(
      <CardGrid cards={[]} selected={new Set()} orphans={new Set()}
        cardWidth={200} cardHeight={120} statusLabels={{ todo: "T", draft: "D", revision: "R", done: "X" }}
        onCardClick={() => {}} onCardDoubleClick={() => {}}
        onCardContextMenu={() => {}} onSynopsisCommit={() => {}}
        onEmptyContextMenu={onEmpty} />
    );
    fireEvent.contextMenu(container.querySelector(".corkboard-grid")!);
    expect(onEmpty).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test -- src/view/components/CardGrid.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`src/view/components/CardGrid.tsx`:

```tsx
/** @jsxImportSource preact */
import type { CorkboardCard, StatusId } from "../../types";
import { Card } from "./Card";

export interface CardGridProps {
  cards: CorkboardCard[];
  selected: ReadonlySet<number>;
  orphans: ReadonlySet<number>;
  cardWidth: number;
  cardHeight: number;
  statusLabels: Record<StatusId, string>;
  onCardClick: (index: number, mods: { meta: boolean; shift: boolean }) => void;
  onCardDoubleClick: (index: number) => void;
  onCardContextMenu: (index: number, evt: MouseEvent) => void;
  onSynopsisCommit: (index: number, text: string) => void;
  onEmptyContextMenu: (evt: MouseEvent) => void;
}

export function CardGrid(p: CardGridProps) {
  return (
    <div
      class="corkboard-grid"
      onContextMenu={(e: MouseEvent) => {
        if (e.target instanceof Element && e.target.closest(".corkboard-card")) return;
        e.preventDefault();
        p.onEmptyContextMenu(e);
      }}
    >
      {p.cards.map((card, i) => (
        <Card
          key={card.path + ":" + i}
          index={i}
          card={card}
          selected={p.selected.has(i)}
          orphan={p.orphans.has(i)}
          width={p.cardWidth}
          height={p.cardHeight}
          statusLabel={p.statusLabels[card.status]}
          onClick={p.onCardClick}
          onDoubleClick={p.onCardDoubleClick}
          onContextMenu={p.onCardContextMenu}
          onSynopsisCommit={p.onSynopsisCommit}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test**

```bash
npm run test -- src/view/components/CardGrid.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/view/components/CardGrid.tsx src/view/components/CardGrid.test.tsx
git commit -m "feat(view): <CardGrid> flowing layout + empty-area context menu hook"
```

---

## Task 21: Context-menu builders

**Files:**
- Create: `src/view/components/contextMenus.ts`

Wraps Obsidian's `Menu` API. Pure-ish: takes the controller + indices and returns a configured `Menu` ready to `showAtMouseEvent`. We don't unit-test against the real `Menu` here (mocked); the manual test plan covers the actual menu behavior.

- [ ] **Step 1: Implement**

`src/view/components/contextMenus.ts`:

```ts
import { Menu } from "obsidian";
import type { CorkboardController } from "../../state/controller";
import type { ColorKey, StatusId, CorkboardSettings } from "../../types";
import { COLOR_PALETTE, STATUS_IDS } from "../../constants";

export function buildCardMenu(opts: {
  controller: CorkboardController;
  indices: number[];
  settings: CorkboardSettings;
  onRebind: (index: number) => void;
}): Menu {
  const { controller, indices, settings } = opts;
  const m = new Menu();

  m.addItem(item =>
    item.setTitle("Write synopsis to file").setIcon("file-pen").onClick(async () => {
      for (const i of indices) await controller.writeSynopsisToMd(i);
    })
  );
  m.addSeparator();

  // status submenu (flat list — Obsidian Menu is flat in stable API)
  for (const s of STATUS_IDS) {
    m.addItem(item =>
      item.setTitle(`Status: ${settings.statusLabels[s]}`).setIcon("check-square").onClick(() => {
        for (const i of indices) controller.setStatus(i, s as StatusId);
      })
    );
  }
  m.addSeparator();

  for (const c of COLOR_PALETTE) {
    m.addItem(item =>
      item.setTitle(`Colour: ${c}`).setIcon("palette").onClick(() => {
        for (const i of indices) controller.setColor(i, c as ColorKey);
      })
    );
  }
  m.addItem(item =>
    item.setTitle("Colour: none").setIcon("palette").onClick(() => {
      for (const i of indices) controller.setColor(i, null);
    })
  );
  m.addSeparator();

  if (indices.length === 1) {
    m.addItem(item =>
      item.setTitle("Rebind to another file…").setIcon("link").onClick(() => opts.onRebind(indices[0]))
    );
  }

  m.addItem(item =>
    item.setTitle(`Remove ${indices.length > 1 ? `${indices.length} cards` : "card"} from corkboard`).setIcon("trash").onClick(() => {
      const sortedDesc = [...indices].sort((a, b) => b - a);
      for (const i of sortedDesc) {
        const path = controller.doc.data.cards[i]?.path;
        if (path) controller.removeCardByPath(path);
      }
    })
  );
  return m;
}

export function buildEmptyAreaMenu(opts: { controller: CorkboardController }): Menu {
  const m = new Menu();
  m.addItem(item =>
    item.setTitle("New card").setIcon("plus").onClick(async () => { await opts.controller.createCard(); })
  );
  return m;
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build && npm run test
```

Expected: build OK, tests OK.

- [ ] **Step 3: Commit**

```bash
git add src/view/components/contextMenus.ts
git commit -m "feat(view): card + empty-area context menu builders"
```

---

## Task 22: `<Toolbar>`

**Files:**
- Create: `src/view/components/Toolbar.tsx`

Simple controls: card width / height sliders that call into the controller. Pure presentation; no logic worth testing in isolation.

- [ ] **Step 1: Implement**

`src/view/components/Toolbar.tsx`:

```tsx
/** @jsxImportSource preact */
import { MIN_CARD_WIDTH, MAX_CARD_WIDTH, MIN_CARD_HEIGHT, MAX_CARD_HEIGHT } from "../../constants";

export interface ToolbarProps {
  cardWidth: number;
  cardHeight: number;
  selectedCount: number;
  onWidthChange: (n: number) => void;
  onHeightChange: (n: number) => void;
}

export function Toolbar(p: ToolbarProps) {
  return (
    <div class="corkboard-toolbar">
      <label>
        Width
        <input type="range" min={MIN_CARD_WIDTH} max={MAX_CARD_WIDTH}
          value={p.cardWidth} onInput={(e: any) => p.onWidthChange(Number(e.target.value))} />
        <span>{p.cardWidth}px</span>
      </label>
      <label>
        Height
        <input type="range" min={MIN_CARD_HEIGHT} max={MAX_CARD_HEIGHT}
          value={p.cardHeight} onInput={(e: any) => p.onHeightChange(Number(e.target.value))} />
        <span>{p.cardHeight}px</span>
      </label>
      <span class="corkboard-toolbar__selection">{p.selectedCount > 0 ? `${p.selectedCount} selected` : ""}</span>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/view/components/Toolbar.tsx
git commit -m "feat(view): <Toolbar> with size sliders + selection count"
```

---

## Task 23: Drag reorder logic + `<DragLayer>`

**Files:**
- Create: `src/view/components/DragLayer.tsx`
- Modify: `src/view/components/CardGrid.tsx` to use drag store
- Test: extend `src/view/components/CardGrid.test.tsx`

Drag is implemented at the grid level using pointer events. Card receives `onPointerDown`. Grid tracks pointer move → computes hover index from the card under the cursor → fires `controller.reorder` on pointer up.

- [ ] **Step 1: Implement `<DragLayer>` (visual indicator)**

`src/view/components/DragLayer.tsx`:

```tsx
/** @jsxImportSource preact */
import type { DragState } from "../../state/dragStore";

export function DragLayer({ drag, cardCount }: { drag: DragState; cardCount: number }) {
  if (!drag.active || drag.dropTarget == null) return null;
  return (
    <div class="corkboard-drop-indicator" data-target={drag.dropTarget} data-of={cardCount} />
  );
}
```

- [ ] **Step 2: Update `<Card>` to accept `onPointerDown`**

Append to `CardProps` in `src/view/components/Card.tsx`:

```ts
  onPointerDown?: (index: number, evt: PointerEvent) => void;
```

And on the root `<div>`:

```tsx
  onPointerDown={(e: PointerEvent) => props.onPointerDown?.(props.index, e)}
```

- [ ] **Step 3: Extend `<CardGrid>` with drag wiring**

Add to `CardGridProps`:

```ts
  drag: { active: boolean; fromIndex: number | null; dropTarget: number | null };
  onCardPointerDown: (index: number, evt: PointerEvent) => void;
  onGridPointerMove: (evt: PointerEvent) => void;
  onGridPointerUp: (evt: PointerEvent) => void;
```

In the JSX, pass `onPointerDown` to each `<Card>` and add `onPointerMove` / `onPointerUp` on the grid div. Render `<DragLayer drag={p.drag} cardCount={p.cards.length} />`.

- [ ] **Step 4: Add a test for drag indicator rendering**

Append to `src/view/components/CardGrid.test.tsx`:

```tsx
import { DragLayer } from "./DragLayer";

it("renders drop indicator when drag is active", () => {
  const { container } = render(<DragLayer drag={{ active: true, fromIndex: 0, dropTarget: 1 }} cardCount={3} />);
  expect(container.querySelector(".corkboard-drop-indicator")).toBeTruthy();
});

it("does not render drop indicator when inactive", () => {
  const { container } = render(<DragLayer drag={{ active: false, fromIndex: null, dropTarget: null }} cardCount={3} />);
  expect(container.querySelector(".corkboard-drop-indicator")).toBeFalsy();
});
```

- [ ] **Step 5: Run tests**

```bash
npm run test
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/view/components/DragLayer.tsx src/view/components/CardGrid.tsx src/view/components/CardGrid.test.tsx src/view/components/Card.tsx
git commit -m "feat(view): pointer-event drag wiring + drop indicator"
```

---

## Task 24: `<CorkboardApp>` — wire everything together

**Files:**
- Modify: `src/view/components/CorkboardApp.tsx`

This is the integrating component. It subscribes to the stores, dispatches user events to the controller, builds context menus, computes orphan set, and renders Toolbar + CardGrid.

- [ ] **Step 1: Replace the placeholder with the full implementation**

`src/view/components/CorkboardApp.tsx`:

```tsx
/** @jsxImportSource preact */
import { useEffect, useState, useMemo } from "preact/hooks";
import type { CorkboardController } from "../../state/controller";
import type { SelectionStore } from "../../state/selectionStore";
import type { DragStore } from "../../state/dragStore";
import type { CorkboardSettings } from "../../types";
import { Toolbar } from "./Toolbar";
import { CardGrid } from "./CardGrid";
import { buildCardMenu, buildEmptyAreaMenu } from "./contextMenus";

export interface CorkboardAppProps {
  controller: CorkboardController;
  selectionStore: SelectionStore;
  dragStore: DragStore;
  settings: CorkboardSettings;
  pathExists: (path: string) => boolean;
  openMd: (path: string) => void;
  onRebindCard: (index: number) => void;
}

export function CorkboardApp(p: CorkboardAppProps) {
  const [, setTick] = useState(0);
  const bump = () => setTick(t => t + 1);

  useEffect(() => p.controller.doc, []); // ensure doc reference stable
  useEffect(() => {
    const u1 = p.selectionStore.subscribe(bump);
    const u2 = p.dragStore.subscribe(bump);
    return () => { u1(); u2(); };
  }, [p.selectionStore, p.dragStore]);

  // re-render on doc mutations: controller.onChange already calls render via the view shell;
  // but inside this component we re-read from the doc reference each render.

  const cards = p.controller.doc.data.cards;
  const selected = p.selectionStore.get();
  const orphans = useMemo(() => {
    const s = new Set<number>();
    cards.forEach((c, i) => { if (!p.pathExists(c.path)) s.add(i); });
    return s;
  }, [cards, p.pathExists]);

  return (
    <div class="corkboard-app">
      <Toolbar
        cardWidth={p.controller.doc.data.cardWidth}
        cardHeight={p.controller.doc.data.cardHeight}
        selectedCount={selected.size}
        onWidthChange={(w) => p.controller.setCardSize(w, p.controller.doc.data.cardHeight)}
        onHeightChange={(h) => p.controller.setCardSize(p.controller.doc.data.cardWidth, h)}
      />
      <CardGrid
        cards={cards}
        selected={selected}
        orphans={orphans}
        cardWidth={p.controller.doc.data.cardWidth}
        cardHeight={p.controller.doc.data.cardHeight}
        statusLabels={p.settings.statusLabels}
        drag={p.dragStore.get()}
        onCardClick={(i, mods) => p.selectionStore.click(i, mods)}
        onCardDoubleClick={(i) => p.openMd(cards[i].path)}
        onCardContextMenu={(i, evt) => {
          // ensure the right-clicked card is in the selection (otherwise replace selection with it)
          const sel = p.selectionStore.get();
          const indices = sel.has(i) ? Array.from(sel) : (p.selectionStore.click(i, { meta: false, shift: false }), [i]);
          const m = buildCardMenu({
            controller: p.controller,
            indices,
            settings: p.settings,
            onRebind: p.onRebindCard,
          });
          m.showAtMouseEvent(evt);
        }}
        onSynopsisCommit={(i, text) => p.controller.updateSynopsis(i, text)}
        onEmptyContextMenu={(evt) => {
          const m = buildEmptyAreaMenu({ controller: p.controller });
          m.showAtMouseEvent(evt);
        }}
        onCardPointerDown={(i) => p.dragStore.start(i)}
        onGridPointerMove={(evt) => {
          if (!p.dragStore.get().active) return;
          const target = (evt.target as Element | null)?.closest(".corkboard-card");
          if (!target) return;
          const grid = target.parentElement;
          if (!grid) return;
          const idx = Array.from(grid.children).indexOf(target);
          if (idx >= 0) p.dragStore.setDropTarget(idx);
        }}
        onGridPointerUp={() => {
          const s = p.dragStore.get();
          if (s.active && s.fromIndex != null && s.dropTarget != null) {
            p.controller.reorder(s.fromIndex, s.dropTarget);
          }
          p.dragStore.end();
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Adjust `CorkboardView` to pass new props to `<CorkboardApp>`**

Update `src/view/CorkboardView.ts` to pass `settings`, `pathExists`, `onRebindCard`. The plugin owns these and threads them via `CorkboardViewDeps`.

Add to `CorkboardViewDeps`:

```ts
  getSettings: () => CorkboardSettings;
  pathExists: (path: string) => boolean;
  onRebindCard: (corkboardPath: string, cardIndex: number) => void;
```

And in `renderApp()`:

```tsx
render(
  <CorkboardApp
    controller={this.controller}
    selectionStore={this.selection}
    dragStore={this.drag}
    settings={this.deps.getSettings()}
    pathExists={this.deps.pathExists}
    openMd={(p) => this.openMd(p)}
    onRebindCard={(i) => this.deps.onRebindCard(this.corkboardPathRegistered!, i)}
  />,
  this.contentEl,
);
```

Add `import type { CorkboardSettings } from "../types";` and update the rest of the file accordingly.

- [ ] **Step 3: Verify everything still builds**

```bash
npm run build && npm run test
```

Expected: build succeeds, tests still pass (no new tests in this task).

- [ ] **Step 4: Commit**

```bash
git add src/view/components/CorkboardApp.tsx src/view/CorkboardView.ts
git commit -m "feat(view): wire CorkboardApp to controller, stores, settings"
```

---

## Task 25: Settings types and tab

**Files:**
- Create: `src/settings/settings.ts`
- Create: `src/settings/settingsTab.ts`

- [ ] **Step 1: Implement `settings.ts`**

`src/settings/settings.ts`:

```ts
import type { CorkboardSettings } from "../types";
import { DEFAULT_SETTINGS } from "../constants";

export function mergeSettings(loaded: Partial<CorkboardSettings> | null): CorkboardSettings {
  if (!loaded) return { ...DEFAULT_SETTINGS, statusLabels: { ...DEFAULT_SETTINGS.statusLabels } };
  return {
    statusLabels: {
      ...DEFAULT_SETTINGS.statusLabels,
      ...(loaded.statusLabels ?? {}),
    },
  };
}
```

- [ ] **Step 2: Test `mergeSettings`**

`src/settings/settings.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mergeSettings } from "./settings";

describe("mergeSettings", () => {
  it("returns defaults when nothing is loaded", () => {
    const s = mergeSettings(null);
    expect(s.statusLabels.todo).toBe("Todo");
  });

  it("preserves user overrides for known ids", () => {
    const s = mergeSettings({ statusLabels: { todo: "TODO!", draft: "Draft", revision: "Rev", done: "Done" } });
    expect(s.statusLabels.todo).toBe("TODO!");
  });

  it("fills missing labels with defaults", () => {
    const s = mergeSettings({ statusLabels: { todo: "X" } as any });
    expect(s.statusLabels.draft).toBe("Draft");
  });
});
```

- [ ] **Step 3: Run test**

```bash
npm run test -- src/settings/settings.test.ts
```

Expected: PASS.

- [ ] **Step 4: Implement settings tab**

`src/settings/settingsTab.ts`:

```ts
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
    containerEl.createEl("h2", { text: "Corkboard — Status labels" });

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
```

- [ ] **Step 5: Verify**

```bash
npm run test && npm run build
```

Expected: green / build OK.

- [ ] **Step 6: Commit**

```bash
git add src/settings/settings.ts src/settings/settings.test.ts src/settings/settingsTab.ts
git commit -m "feat(settings): mergeSettings + status-label settings tab"
```

---

## Task 26: Plugin entry — `main.ts`

**Files:**
- Modify: `src/main.ts`

The entry wires everything: registers the view + extension, sets up the vault sync, builds vault gateways for views, and registers the settings tab.

- [ ] **Step 1: Implement**

Replace `src/main.ts`:

```ts
import { Plugin, TFile, TAbstractFile, Notice, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_CORKBOARD, FILE_EXT_CORKBOARD, CORKBOARD_FILE_NAME } from "./constants";
import type { CorkboardSettings } from "./types";
import { mergeSettings } from "./settings/settings";
import { CorkboardSettingTab } from "./settings/settingsTab";
import { CorkboardView } from "./view/CorkboardView";
import { CorkboardSync } from "./sync/vaultSync";
import { CorkboardController, VaultGateway } from "./state/controller";
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
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat(main): wire view, sync, settings, command"
```

---

## Task 27: Stylesheet

**Files:**
- Modify: `styles.css`

- [ ] **Step 1: Replace `styles.css` with corkboard styles**

```css
.corkboard-app {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}

.corkboard-toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 4px 6px 8px;
  border-bottom: 1px solid var(--background-modifier-border);
  font-size: 12px;
}
.corkboard-toolbar label { display: inline-flex; align-items: center; gap: 6px; }

.corkboard-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 0;
  overflow: auto;
  align-content: flex-start;
}

.corkboard-card {
  background: var(--background-secondary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  user-select: none;
  position: relative;
  overflow: hidden;
}
.corkboard-card.is-selected { outline: 2px solid var(--interactive-accent); }
.corkboard-card.is-orphan {
  opacity: 0.55;
  filter: grayscale(0.6);
  border-color: var(--text-error);
}
.corkboard-card__title { font-weight: 600; margin-bottom: 4px; }
.corkboard-card__status { font-size: 11px; opacity: 0.8; margin-bottom: 6px; }
.corkboard-card__orphan-badge {
  position: absolute; bottom: 4px; right: 6px;
  font-size: 10px; color: var(--text-error);
}
.corkboard-synopsis {
  flex: 1;
  resize: none;
  border: none;
  background: transparent;
  font: inherit;
  color: inherit;
  padding: 4px 0;
  outline: none;
}
.corkboard-synopsis:focus { background: var(--background-primary); }

.corkboard-color-red    { background: #fde7e7; }
.corkboard-color-orange { background: #ffeacc; }
.corkboard-color-yellow { background: #fff7c2; }
.corkboard-color-green  { background: #d8f1d6; }
.corkboard-color-blue   { background: #dbeefb; }
.corkboard-color-purple { background: #ecdcf3; }
.corkboard-color-pink   { background: #fbdbe7; }
.corkboard-color-gray   { background: #ececec; }

.corkboard-drop-indicator { display: none; }

.corkboard-error-banner {
  margin: 16px;
  padding: 16px;
  border: 1px solid var(--text-error);
  border-radius: 6px;
  background: var(--background-modifier-error-rgb, rgba(255, 0, 0, 0.05));
}
.corkboard-error-banner__title { font-weight: 600; color: var(--text-error); margin-bottom: 8px; }
.corkboard-error-banner__detail { font-family: var(--font-monospace); font-size: 12px; margin-bottom: 12px; opacity: 0.8; }
.corkboard-error-banner__actions { display: flex; gap: 8px; }
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: success.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "style: corkboard view styles + colour palette"
```

---

## Task 28: Manual integration test plan

**Files:**
- Create: `docs/superpowers/test-plan.md`

- [ ] **Step 1: Write the test plan**

```markdown
# Corkboard Manual Test Plan

Run before tagging a release. Each item is "PASS / FAIL" with notes.

## Setup
- [ ] Build with `npm run build`. `main.js` exists at the plugin root.
- [ ] Open Obsidian → Settings → Community plugins → enable "Corkboard".
- [ ] Open the test vault at `/Users/nighteye1228/Documents/corkboard/`.

## Creating a corkboard
- [ ] In a folder, run command "Create corkboard for current folder".
- [ ] An `index.corkboard` file is created and opens in a new tab as a corkboard view.
- [ ] The view shows a toolbar (size sliders) and an empty grid.

## Cards from existing files
- [ ] Add a few `.md` files to the same folder via the file explorer.
- [ ] Each shows up as a card, in creation order.
- [ ] Card title matches the filename (without `.md`).

## Inline synopsis edit
- [ ] Click a card's synopsis textarea, type, click outside.
- [ ] Reopen the corkboard file → synopsis persists.
- [ ] Type, press Esc → text reverts; no save.

## Selection
- [ ] Click a card → blue border.
- [ ] Cmd/Ctrl-click another → both selected.
- [ ] Shift-click a third → range selected.
- [ ] Click empty grid (without context menu) → selection persists (current behaviour). [If not desired, file follow-up.]

## Reorder
- [ ] Drag a card; release on top of another → order updates.
- [ ] Reopen file → new order persists.

## Empty-area context menu
- [ ] Right-click empty area → "New card".
- [ ] A new `Untitled-N.md` file appears in the folder, and its card is appended.

## Card context menu
- [ ] Right-click a card → menu shows: Write synopsis to file, Status …, Colour …, Rebind …, Remove from corkboard.
- [ ] "Status: Draft" updates the card's status pill.
- [ ] "Colour: blue" updates background.
- [ ] "Write synopsis to file" inserts the synopsis text after frontmatter (or at file head if none).
- [ ] "Remove from corkboard" removes the card; the .md file is **not** deleted.

## Multi-select batch
- [ ] Select two cards → right-click one → "Status: Done" applies to both.

## Sync — external add
- [ ] With the corkboard open, create a `.md` in the folder via file explorer.
- [ ] A new card appears at the end without manual action.

## Sync — external delete
- [ ] Delete a `.md` via file explorer.
- [ ] The card disappears.

## Sync — external rename within folder
- [ ] Rename a `.md` via file explorer.
- [ ] The card title updates; synopsis/status/colour preserved.

## Sync — external move across folders
- [ ] Open two corkboards (folders A and B).
- [ ] Move a `.md` from A to B via file explorer.
- [ ] Card disappears from A's view; appears in B's view.

## Orphan handling
- [ ] Disable the plugin. Delete a `.md` referenced in a corkboard. Re-enable.
- [ ] Open the corkboard → the card is dim with red "⚠ missing" badge.
- [ ] Right-click → "Remove from corkboard" cleans it up.

## Corrupt file
- [ ] Edit `index.corkboard` outside Obsidian to invalid JSON.
- [ ] Open in Obsidian → error banner shown; view is read-only; the file is not overwritten.

## Settings
- [ ] Settings → Corkboard → rename "Todo" to "TODO!".
- [ ] Cards with status `todo` show "TODO!".

## Restart
- [ ] Quit Obsidian and reopen.
- [ ] Card sizes, statuses, colours, synopses, and order are unchanged.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/test-plan.md
git commit -m "docs: manual integration test plan"
```

---

## Task 29: Smoke test — end-to-end build + lint

**Files:** none

- [ ] **Step 1: Run the full validation**

```bash
cd /Users/nighteye1228/Documents/corkboard/.obsidian/plugins/corkboard
npm run lint && npm run test && npm run build
```

Expected: all three pass; `main.js` regenerated.

- [ ] **Step 2: If lint flags real issues, fix them**

Do not silence rules. If lint reports an issue, edit the source. Re-run from Step 1.

- [ ] **Step 3: Commit any lint fixes**

```bash
git add -A
git diff --cached --quiet || git commit -m "chore: lint fixes"
```

(If there is nothing to commit, the diff is empty and the commit is skipped.)

---

## Task 30: Run the manual test plan

**Files:** none — this is the human verification gate.

- [ ] **Step 1: Open Obsidian, enable the plugin**

Follow `docs/superpowers/test-plan.md` from "Setup" through "Restart".

- [ ] **Step 2: Mark each section pass/fail**

Annotate the test plan inline (commit annotations as a separate commit, or paste into the PR description).

- [ ] **Step 3: For any FAIL, file as a follow-up task and decide whether to block release**

Keep the bar honest: if a sync edge case is broken, it almost certainly blocks. If a colour shade looks slightly off, it does not.

- [ ] **Step 4: When all pass, tag v0.1.0**

```bash
cd /Users/nighteye1228/Documents/corkboard/.obsidian/plugins/corkboard
git tag 0.1.0
```

(Push only if the user explicitly asks.)

---

## Self-review notes

Coverage check against the spec:

| Spec section | Implemented in |
|---|---|
| §3 Data model | Tasks 6, 9, 10 |
| §4.1 Plugin entry | Task 26 |
| §4.2 Data layer | Tasks 9, 10 |
| §4.3 View layer | Tasks 17, 18, 19, 20, 22, 23, 24 |
| §4.4 Sync layer | Tasks 13, 16 |
| §4.5 Self-initiated guard | Task 15 |
| §5 Module layout | Tasks 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26 |
| §6 Data flow | Tasks 15, 16, 24 |
| §7 Error handling | Tasks 9 (parse fallback), 10 (corrupt JSON empty doc + error), 16 (no silent overwrite of corrupt corkboard), 24 (orphan rendering) |
| §8 Settings | Task 25 |
| §9 Testing | All TDD tasks plus Task 28 (manual plan) |
| §10 Build / packaging | Tasks 1, 2, 3 |

Two spec items handled lightly in v0.1.0:

1. **"Rebind to another file"** in card context menu (§7) is wired up to a Notice
   stub in Task 26. Listed as a known gap; not blocking v0.1.0 unless the user
   wants it earlier.
2. **`<DragLayer>` visual** (§4.3 UI tree) is a minimal CSS hidden indicator. The
   functional drag-reorder works; visual polish can iterate post-v0.1.0.

If either of these is required for v0.1.0, add a task before Task 30.
