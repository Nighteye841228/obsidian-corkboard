# Corkboard Manual Test Plan

Run before tagging a release. Each item is "PASS / FAIL" with notes.

## Setup
- [x] Build with `npm run build`. `main.js` exists at the plugin root.
- [x] Open Obsidian → Settings → Community plugins → enable "Corkboard".
- [x] Open the test vault at `/Users/nighteye1228/Documents/corkboard/`.

## Creating a corkboard
- [x] In a folder, run command "Create corkboard for current folder".

- [x] An `index.corkboard` file is created and opens in a new tab as a corkboard view.

- [x] The view shows a toolbar (size sliders) and an empty grid.

  !! 先新增筆記再增加corkboard會沒抓到之前的卡片

## Cards from existing files
- [x] Add a few `.md` files to the same folder via the file explorer.
- [x] Each shows up as a card, in creation order.
- [x] Card title matches the filename (without `.md`).

## Inline synopsis edit
- [x] Click a card's synopsis textarea, type, click outside.
- [x] Reopen the corkboard file → synopsis persists.
- [x] Type, press Esc → text reverts; no save.

## Selection
- [x] Click a card → blue border.
- [x] Cmd/Ctrl-click another → both selected.
- [x] Shift-click a third → range selected.
- [ ] Click empty grid (without context menu) → selection persists (current behaviour). [If not desired, file follow-up.] : !! 如果點空白處應該要取消選取

## Reorder
- [x] Drag a card; release on top of another → order updates.
- [x] Reopen file → new order persists.

## Empty-area context menu
- [ ] Right-click empty area → "New card".  !! 在其他大空白區域點擊沒有出現new card，但在卡片周圍有
- [x] A new `Untitled-N.md` file appears in the folder, and its card is appended.

## Card context menu
- [x] Right-click a card → menu shows: Write synopsis to file, Status …, Colour …, Rebind …, Remove from corkboard.
- [x] "Status: Draft" updates the card's status pill.
- [x] "Colour: blue" updates background.
- [x] "Write synopsis to file" inserts the synopsis text after frontmatter (or at file head if none).
- [x] "Remove from corkboard" removes the card; the .md file is **not** deleted. !! 那要怎麼加回來？

## Multi-select batch
- [x] Select two cards → right-click one → "Status: Done" applies to both.

## Sync — external add
- [x] With the corkboard open, create a `.md` in the folder via file explorer.
- [x] A new card appears at the end without manual action.

## Sync — external delete
- [x] Delete a `.md` via file explorer.
- [x] The card disappears.

## Sync — external rename within folder
- [x] Rename a `.md` via file explorer.
- [x] The card title updates; synopsis/status/colour preserved.

## Sync — external move across folders
- [x] Open two corkboards (folders A and B).
- [x] Move a `.md` from A to B via file explorer.
- [x] Card disappears from A's view; appears in B's view.

## Orphan handling
- [x] Disable the plugin. Delete a `.md` referenced in a corkboard. Re-enable.
- [x] Open the corkboard → the card is dim with red "⚠ missing" badge.
- [x] Right-click → "Remove from corkboard" cleans it up.

## Corrupt file
- [x] Edit `index.corkboard` outside Obsidian to invalid JSON.
- [x] Open in Obsidian → error banner shown; view is read-only; the file is not overwritten. !! 他要我overwritten但overwritten之後corkboard裡面是空的沒有同步該資料夾裡面的md

## Settings
- [x] Settings → Corkboard → rename "Todo" to "TODO!".
- [x] Cards with status `todo` show "TODO!".

## Restart
- [x] Quit Obsidian and reopen.
- [x] Card sizes, statuses, colours, synopses, and order are unchanged.



feature:

1. synopsis輸入框內的padding, line height調整，希望輸入框與字之間大概2px的縫隙，行距可以再開一點（或你告訴我要改哪裡）

2. 希望可以在corkboard改檔案名稱（最佳希望雙擊標題改，不行就右鍵選單->重新命名）
