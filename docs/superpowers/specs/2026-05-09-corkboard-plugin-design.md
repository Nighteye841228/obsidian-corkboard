# Corkboard Plugin — Design Spec

- **Date**: 2026-05-09
- **Status**: Draft (awaiting user review)
- **Target**: Obsidian community plugin (desktop only)

## 1. Purpose

Bring Scrivener-style corkboard to Obsidian for long-form writing workflows.

A corkboard view shows the markdown files in a folder as index cards arranged
in a flowing grid. Each card displays the file's title, an author-written
synopsis (what the file should contain), a status, and a colour label. Authors
can plan structure, drag to reorder, change status/colour, and optionally push
the synopsis text into the file itself.

## 2. Scope

### In scope

- Custom file type `.corkboard` (one per folder, named `index.corkboard`).
- Custom Obsidian view that renders cards for the markdown files in the same
  folder as the `.corkboard` file.
- Synopsis stored inside the `.corkboard` JSON; user-editable inline on the card.
- Drag-and-drop reorder; multi-select with Cmd/Shift.
- Right-click on a card: change status, change colour, write synopsis into
  the underlying `.md` file, remove from corkboard.
- Right-click on empty grid: create new card (creates new `.md` file).
- Auto sync: when md files in the folder are created / deleted / renamed /
  moved (from the file explorer or another app), the corkboard reflects it.
- Per-corkboard configurable card width/height.
- Plugin settings: customise the four default status labels.
- Eight fixed colours.

### Out of scope (v1)

- Sub-folder display, recursive flattening.
- Free-form (x/y) card placement.
- Per-card width/height.
- Mobile/tablet support (`isDesktopOnly: true`).
- Word-count / thumbnail / icon on cards.
- Undo / redo across the view.
- Schema migration UI (only v1 exists).
- Cross-folder moves initiated from the corkboard UI.

## 3. Data model

Each corkboard is a JSON file at `<folder>/index.corkboard`:

```json
{
  "version": 1,
  "cardWidth": 280,
  "cardHeight": 180,
  "cards": [
    {
      "path": "novel/ch01-opening.md",
      "synopsis": "Protagonist meets the antagonist for the first time.",
      "status": "draft",
      "color": "blue"
    }
  ]
}
```

- `path` is vault-relative. Title shown on the card is derived from `path`
  (filename without `.md`); title is **not** stored separately.
- `synopsis` is a plain string (multi-line allowed).
- `status` is one of the keys defined in plugin settings (default: `todo`,
  `draft`, `revision`, `done`).
- `color` is one of eight fixed palette keys, or `null`.
- Card order is the array order.

During normal runtime, the sync layer (§4.4) keeps `cards[]` in step with the
folder's actual md files. Orphan handling is a fallback for cases where the
sync layer did not see the relevant vault event (e.g. the plugin was disabled
when the file was deleted, or files were moved by an external tool while
Obsidian was closed). When the view opens and a card's `path` does not
resolve, the card is shown as an orphan (dim/grey, red warning icon) and is
not auto-removed; the user decides via the card context menu.

## 4. Architecture

Four layers with single-direction dependencies:

```
Plugin entry (main.ts)
   │
   ├─► Sync layer  ──┐
   │                 │
   ├─► View layer  ──┤── shared ──► Data layer (CorkboardDocument)
   │                 │
   └─► Settings tab ─┘
```

### 4.1 Plugin entry (`main.ts`)

- `onload`: register the `corkboard` view and file extension; register vault
  event listeners; register the settings tab; load settings.
- `onunload`: detach view leaves; remove listeners.

No business logic.

### 4.2 Data layer

- `CorkboardDocument` — the single source of truth for one `.corkboard`
  file. Owns parse, serialize, schema validation. Loaded once per `View`
  instance. All mutations go through it.
- `schema.ts` — TypeScript types and a runtime validator for v1.

### 4.3 View layer

- `CorkboardView` extends Obsidian's `TextFileView`. It implements:
  - `getViewType()` returns `corkboard`.
  - `getViewData()` serializes the document.
  - `setViewData(data, clear)` parses the document.
  - `clear()` resets state.
  - `onOpen()` mounts the Preact root in `contentEl`.
  - `onClose()` unmounts the Preact root.
- The view holds an instance of `CorkboardController` and the `selectionStore`
  / `dragStore` for that view. Two views of different folders are completely
  independent.

UI tree (Preact):

```
<CorkboardApp>
  <Toolbar>                       (card size adjuster, batch ops)
  <CardGrid>                      (flowing grid; empty-area context menu)
    <Card> *                      (selection, drag, double-click open)
      <SynopsisEditor>            (contenteditable; blur to commit)
  <ContextMenu>                   (rendered via Obsidian Menu API)
  <DragLayer>                     (drag preview, drop indicator)
```

Stores are exposed via Preact context. Implementation: a small subscribe /
notify store + `useSyncExternalStore` (no external state library).

### 4.4 Sync layer

- `vaultSync` listens to `vault.on('create' | 'delete' | 'rename')`.
- For each event, `pathResolver` finds the relevant `index.corkboard`.
- If the corresponding view is open, the event is forwarded to that view's
  controller (in-memory mutation + `requestSave`).
- If no view is open, the corkboard JSON is loaded, mutated, and saved
  directly.
- Cross-folder rename = remove from the old folder's corkboard + add to the
  new folder's corkboard.

### 4.5 Self-initiated guard

When the controller itself creates / renames / deletes a file via the vault
API, it adds the path to an `inflight: Set<string>`. The sync layer ignores
events for paths in `inflight`. Entries are removed in `try/finally` to
guarantee cleanup.

> **Implementation note**: vault events are dispatched on a microtask after
> the originating call resolves, so removing the entry immediately after
> `await vault.create(...)` may race with the event handler. Defer the
> `inflight.delete(path)` call by one microtask (`queueMicrotask`) inside
> the `finally` block to ensure the sync handler has already observed the
> guard.

## 5. Module layout

```
src/
├── main.ts
├── constants.ts
├── types.ts
├── data/
│   ├── corkboardDocument.ts
│   └── schema.ts
├── sync/
│   ├── vaultSync.ts
│   ├── pathResolver.ts
│   └── synopsisInjector.ts
├── view/
│   ├── CorkboardView.ts
│   └── components/
│       ├── CorkboardApp.tsx
│       ├── Toolbar.tsx
│       ├── CardGrid.tsx
│       ├── Card.tsx
│       ├── SynopsisEditor.tsx
│       ├── ContextMenu.tsx
│       └── DragLayer.tsx
├── state/
│   ├── controller.ts
│   ├── selectionStore.ts
│   └── dragStore.ts
├── settings/
│   ├── settings.ts
│   └── settingsTab.ts
└── utils/
    ├── filename.ts
    └── debounce.ts
```

### Module responsibilities

| Module | Responsibility |
|---|---|
| `main.ts` | Plugin lifecycle, registrations only |
| `CorkboardDocument` | Parse / serialize / validate `.corkboard` JSON |
| `vaultSync` | Translate vault events into controller mutations |
| `pathResolver` | Map md path → owning `index.corkboard` |
| `synopsisInjector` | Insert synopsis into md (after frontmatter) |
| `CorkboardView` | Obsidian view lifecycle, Preact mount, dirty tracking |
| `CorkboardController` | Public actions: `addCard / removeCardByPath / reorder / updateSynopsis / setStatus / setColor / writeSynopsisToMd / setCardSize` |
| `selectionStore` | UI state: which cards are selected |
| `dragStore` | UI state: active drag source, drop target |
| `settingsTab` | Settings UI: customise status labels |

### Conventions

- Cards reference files by `path` (string) only; resolve via vault on use.
- One controller, one document, one set of stores **per view instance**. No singletons.
- `synopsisInjector` uses `vault.process()` and `MetadataCache` to find the
  frontmatter end. No frontmatter → insert at file head. Inject is a plain
  insert; no anchor or de-duplication. Repeated invocations may insert
  multiple times by design (user's responsibility).

## 6. Data flow

### 6.1 Inline edit synopsis

```
SynopsisEditor (blur)
  → controller.updateSynopsis(index, text)
      → document.cards[index].synopsis = text
      → view.requestSave()
      → store.notify()  (Preact re-render)
```

### 6.2 Drag-and-drop reorder

```
Card pointerdown → dragStore.start(index)
Card pointermove → dragStore.setDropTarget(targetIndex)
Card pointerup   → controller.reorder(from, to)
                    → document.cards.splice(...)
                    → view.requestSave()
                    → store.notify()
                 → dragStore.end()
```

While `dragStore.active` is true, vaultSync queues incoming events and
flushes them on `pointerup` / `pointercancel`.

### 6.3 Empty-area right-click → new card

```
CardGrid contextmenu (empty)
  → ContextMenu opens
  → controller.createCard()
      → utils.filename.nextUntitled() → 'Untitled-N.md'
      → inflight.add(path)
      → vault.create(path, '')
      → document.cards.push({ path, synopsis: '', status: 'todo', color: null })
      → view.requestSave()
      → store.notify()
      → finally inflight.delete(path)
```

### 6.4 External md delete (file explorer)

```
vault.on('delete', file)
  → vaultSync.handleDelete(file)
      → pathResolver.findCorkboard(file)
      → corkboard view open?
          ├─ yes → controller.removeCardByPath(file.path)
          └─ no  → load JSON → remove entry → write JSON
```

`create` / `rename` (same folder) / `move` (cross folder) follow the same
dispatch shape.

### 6.5 Right-click card → write synopsis to md

```
ContextMenu "Write synopsis to file"
  → controller.writeSynopsisToMd(index)
      → synopsisInjector.inject(file, synopsis)
          → metadataCache.getFileCache(file)?.frontmatterPosition
          → vault.process(file, content => {
               insert synopsis as a new paragraph after frontmatter
               (or at file head if no frontmatter)
             })
      → Notice: '已寫入'
```

## 7. Error handling

| Case | Strategy |
|---|---|
| `.corkboard` JSON corrupt | View shows an error banner with [Show raw] and [Reset] buttons. While the corrupt state is shown, the view is read-only and `requestSave` is suppressed (so a corrupt file is never silently overwritten). Reset replaces the file with an empty document. |
| Card path no longer exists (orphan) | Render dim with red warning. Context menu offers "Remove from corkboard" or "Rebind to another file". No auto-clean. |
| Filename collision when creating new card | `nextUntitled` increments; `vault.create` throw is caught and retried once; final failure surfaces a `Notice`. |
| Vault event arrives mid-drag | Queue in `vaultSync`, flush on drag end. |
| `synopsisInjector` write fails | `Notice('寫入失敗：…')`. Corkboard state untouched. |
| Folder containing the corkboard is deleted | `TextFileView` closes the view automatically. No extra handling. |
| User quits with unsaved changes | Rely on `requestSave` + Obsidian's quit-flush. No custom autosave. |
| `inflight` set leak | All controller methods that touch the vault use `try/finally`. |

### Explicitly not handled

- Undo / redo. Most actions are reversible by other actions.
- Migration UI. Only v1 exists.
- File-lock detection. Vault handles it.
- Per-mutation schema validation. Validate once on parse; trust types after that.

## 8. Settings

Stored in plugin `data.json` (vault-level).

```ts
interface CorkboardSettings {
  statusLabels: {
    todo:     string;  // default 'Todo'
    draft:    string;  // default 'Draft'
    revision: string;  // default 'Revision'
    done:     string;  // default 'Done'
  };
}
```

**v1 lock-in**: there are exactly four statuses with stable ids
(`todo`, `draft`, `revision`, `done`). The settings UI lets the user
rename the displayed label for each one. Adding, removing, or reordering
statuses is deferred to a later version; the simpler shape avoids the
edge cases around cards that reference a non-existent status id.

If a card's `status` value somehow falls outside the four ids (e.g. a
hand-edited corkboard file), the card displays as `todo` without
rewriting the JSON.

The eight-colour palette is hard-coded in `constants.ts` for v1.

## 9. Testing strategy

### Unit (Vitest, jsdom)

Target ~80% coverage on the data and state layers.

| Module | Cases |
|---|---|
| `corkboardDocument` | parse, serialize, corrupt JSON, missing fields |
| `utils/filename` | `nextUntitled` for various existing-name sets |
| `synopsisInjector` | with frontmatter / without / empty file |
| `selectionStore` | single, Cmd-click, Shift-range, clear |
| `dragStore` | event sequence, cancel, queue flush |
| `controller` | mock minimal vault; verify dispatch correctness |

### Component (@testing-library/preact)

| Component | Cases |
|---|---|
| `<Card>` | click → select; double-click → open; context menu opens; synopsis editor commits on blur |
| `<CardGrid>` | empty-area context menu; render order matches props |
| `<SynopsisEditor>` | typing → blur → onCommit; Esc cancels |

Pure presentational components are not tested.

### Manual integration checklist

Documented in `docs/superpowers/test-plan.md` (created during implementation).
Run before each release. Covers:

- create / rename / delete / cross-folder move of md → corkboard reflects
- two corkboard views open at once → independent
- one corkboard opened in two leaves → edits sync
- corrupt `.corkboard` → banner shown, app stable
- restart Obsidian → card size, status, colour persist
- write synopsis to md: with frontmatter / without / empty file

### Tooling

- Vitest + @testing-library/preact + jsdom.
- `__mocks__/obsidian.ts` provides minimal stubs for `Plugin`,
  `TextFileView`, `Notice`, `Menu`, `Vault`.
- Test files colocated as `src/**/*.test.ts(x)`.
- CI: out of scope for v1; rely on `npm run lint && npm run test &&
  npm run build` locally.

## 10. Build / packaging

- Reuse the existing `obsidian-sample-plugin` scaffold (esbuild + npm) as
  the starting point.
- **Rename the plugin folder** from `obsidian-sample-plugin` to `corkboard`.
  Obsidian requires the on-disk plugin folder name to match `manifest.json`'s
  `id`, so this must be done before the renamed `id` takes effect.
- Update `manifest.json`: `id` → `corkboard`, `name` → `Corkboard`,
  `description` → corkboard description, `isDesktopOnly: true`,
  `minAppVersion` bumped to whatever ships `vault.process` (1.4+).
- Update `package.json` `name` accordingly.
- Add to esbuild config:
  - JSX configured for Preact via automatic runtime
    (`jsx: 'automatic'`, `jsxImportSource: 'preact'`).
  - Entry stays `src/main.ts`; output `main.js` at plugin root.
- New runtime dependency: `preact`.
- New devDependencies: `vitest`, `@testing-library/preact`, `jsdom`.

## 11. Open questions

None at this point. Items deferred to later versions are listed in §2 (Out
of scope).
