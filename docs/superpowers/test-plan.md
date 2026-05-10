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
