# Obsidian Corkboard

Scrivener-style corkboard for Obsidian. Each folder gets a single
`index.corkboard` file that renders the folder's markdown notes as index
cards arranged in a flowing grid.

繁體中文：[README_zh_TW.md](./README_zh_TW.md)

## What it gives you

- Each card represents one `.md` file in the folder.
- Cards show the file's title, an author-written **synopsis** (separate
  from the file body), a **status** label, and an optional **colour**.
- Drag to reorder, multi-select with Cmd/Shift, drag-and-drop reorder.
- Right-click context menus on cards (write synopsis to file, change
  status / colour, remove from corkboard, add file back, …) and on the
  empty area (new card, add existing file).
- Auto-sync with the file system: creating, renaming, deleting, or
  moving `.md` files in the folder is reflected in the corkboard
  immediately, even when the corkboard view is closed.
- Per-corkboard card width / height, persisted with the document.
- Customisable status labels (default: `Todo` / `Draft` / `Revision` /
  `Done`).
- Read-only banner with **Show raw / Reset** when the corkboard JSON is
  corrupt — the plugin never silently overwrites a damaged file.

Desktop only.

## Install

While the plugin isn't on the community plugin list yet, install
manually:

1. Build it locally (see *Development* below) or download the release
   artifacts (`main.js`, `manifest.json`, `styles.css`).
2. Copy the three files to `<your vault>/.obsidian/plugins/corkboard/`.
3. In Obsidian → Settings → Community plugins → enable **Corkboard**.

## Quick start

The fastest path to a working corkboard:

1. **Right-click a folder** in the file explorer → **Create corkboard**.
2. Or use the command palette: **Corkboard: Create for current folder**
   (creates one for the folder containing the active note).

Either entry point creates an `index.corkboard` file in that folder
pre-populated with one card per existing `.md` file. The corkboard
opens in a new tab.

## How to use it

### Creating cards

| Action | Result |
|---|---|
| Right-click empty area → **New card** | Creates a new `Untitled-N.md` file in the folder and adds a card |
| Right-click empty area → **Add existing file…** | Fuzzy-search a folder file that isn't on the board yet, add it as a card |
| Create an `.md` directly in the file explorer | Auto-syncs as a new card at the end |

### Editing a card

- **Click** synopsis area → type → click out (or focus another card) to
  commit. **Esc** to cancel.
- **Double-click the title** → inline rename. **Enter / blur** commits;
  **Esc** cancels. The underlying file is renamed via Obsidian's
  `fileManager.renameFile`, so backlinks update.
- **Right-click a card** for status, colour, "Write synopsis to file",
  "Remove from corkboard", "Rebind…".

### Selection & navigation

| Gesture | Result |
|---|---|
| Click a card | Select (blue outline) |
| Cmd/Ctrl-click | Add or remove from selection |
| Shift-click | Range-select from the previous anchor |
| Click empty area | Clear selection |
| Double-click a card body | Open the underlying `.md` in a new tab |

### Reorder

Drag any card and release on top of another to reorder. The new order
is persisted in `index.corkboard`.

### Card menu, with multi-select

If you right-click a card while multiple cards are selected, the menu
applies to **all** selected cards — so you can change status / colour
in batch, or remove several cards at once.

### File system sync

If you create / rename / delete / move a `.md` file via the file
explorer (or another tool, while Obsidian is open), the corkboard
catches up:

- Created → new card appended.
- Renamed → card title updates; synopsis / status / colour preserved.
- Deleted → card is removed.
- Moved across folders → removed from the old folder's corkboard,
  added to the new folder's corkboard.

If the plugin was disabled when a file was deleted, the orphaned card
is shown dimmed with a red ⚠ badge. Right-click → **Remove from
corkboard** to clean up.

## Settings

Settings → Community plugins → Corkboard → cog icon. The settings tab
lets you rename the four status labels (the underlying status ids stay
stable, so existing cards still display).

## Data model

Each corkboard is a JSON file at `<folder>/index.corkboard`:

```json
{
  "version": 1,
  "cardWidth": 280,
  "cardHeight": 180,
  "cards": [
    {
      "path": "novel/ch01-opening.md",
      "synopsis": "Protagonist meets the antagonist.",
      "status": "draft",
      "color": "blue"
    }
  ]
}
```

`title` is derived from `path` (no separate field). Synopsis lives in
the JSON; you can also push it into the file via right-click → **Write
synopsis to file** (insert as the first paragraph, after frontmatter).

## Known limits in v0.1.0

- **Rebind to another file…** is a stub (shows a Notice).
- The drag drop indicator is functional but visually minimal.
- Sub-folders are ignored; the corkboard only shows md files in the
  same folder as the `index.corkboard`.
- No undo/redo within the view.
- Mobile is not supported (`isDesktopOnly: true`).

## Development

Stack: TypeScript, esbuild, Preact (automatic JSX runtime), Vitest +
jsdom + @testing-library/preact for tests.

```bash
npm install
npm run dev      # esbuild watch mode
npm run build    # type-check + production bundle
npm run test     # run unit + component tests
npm run lint     # eslint with obsidianmd plugin rules
```

Source layout:

```
src/
  main.ts                       # plugin lifecycle, registrations
  constants.ts, types.ts
  data/
    corkboardDocument.ts        # parse / serialize / mutations
    schema.ts                   # runtime validator (v1)
    initialData.ts              # build a fresh document from a folder's md files
  state/
    controller.ts               # CorkboardController + VaultGateway interface
    selectionStore.ts, dragStore.ts
  sync/
    vaultSync.ts                # vault events ↔ controller registry
    pathResolver.ts, synopsisInjector.ts
  view/
    CorkboardView.tsx           # TextFileView + Preact mount + corrupt-JSON banner
    components/
      CorkboardApp.tsx, CardGrid.tsx, Card.tsx, SynopsisEditor.tsx,
      Toolbar.tsx, ContextMenus.ts, AddCardModal.ts, DragLayer.tsx
  settings/
    settings.ts, settingsTab.ts
  utils/
    debounce.ts, filename.ts
```

The design spec and implementation plan live in `docs/superpowers/`.
The manual integration test plan is `docs/superpowers/test-plan.md`.

## License

0BSD (matches the original Obsidian sample plugin scaffold this is
built from).
