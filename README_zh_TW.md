# Obsidian Corkboard

仿 Scrivener 軟木板的 Obsidian plugin。每個資料夾會有一個
`index.corkboard` 檔，把資料夾裡的 markdown 筆記以紙條（index card）
形式排列在格狀畫面中。

English：[README.md](./README.md)

## 主要功能

- 一張紙條對應資料夾裡一個 `.md` 檔。
- 紙條顯示檔名、作者寫的 **synopsis**（與檔案內文分開儲存）、
  **status** 標籤、可選的**顏色**。
- 拖曳重新排序、Cmd/Shift 多選。
- 紙條右鍵選單（寫 synopsis 到 md 檔、改 status / 顏色、從 corkboard
  移除、加回紙條…）；空白處右鍵選單（新增紙條、加回既有檔）。
- 與檔案系統自動同步：在檔案總管新增 / 改名 / 刪除 / 搬移 `.md`
  檔，corkboard 立刻反映；即使 corkboard 視圖沒開，下次開啟時也會
  反映。
- 紙條寬高可調整，存在每個 corkboard 自己的檔裡。
- 可自訂 status 標籤（預設：`Todo` / `Draft` / `Revision` / `Done`）。
- corkboard JSON 損毀時顯示 **Show raw / Reset** 唯讀 banner，永遠不
  會悄悄覆蓋壞掉的檔。

僅支援桌面版 Obsidian。

## 安裝

目前還沒上 community plugin 商店，請手動安裝：

1. 自行 build（見下方〈開發〉），或下載 release 的 `main.js`、
   `manifest.json`、`styles.css` 三個檔。
2. 把這三個檔放到 `<你的 vault>/.obsidian/plugins/corkboard/`。
3. Obsidian → Settings → Community plugins → 啟用 **Corkboard**。

## 快速開始

最快的入口：

1. **在檔案總管的資料夾上按右鍵** → **Create corkboard**
2. 或用 command palette：**Corkboard: Create for current folder**
   （會在當前筆記所在的資料夾建立 corkboard）

兩種方式都會在該資料夾建立 `index.corkboard` 檔，並**自動把資料夾內
所有既有的 `.md` 檔變成紙條**。corkboard 會在新分頁開啟。

## 使用方式

### 新增紙條

| 動作 | 結果 |
|---|---|
| 空白處右鍵 → **New card** | 在資料夾建立新的 `Untitled-N.md` 並加上紙條 |
| 空白處右鍵 → **Add existing file…** | fuzzy 搜尋還沒在板上的檔案，加為紙條 |
| 直接在檔案總管建 `.md` | 自動同步成新紙條（加在最後） |

### 編輯紙條

- **單擊** synopsis 輸入框 → 輸入 → 點別處（或聚焦其他紙條）即儲存。
  **Esc** 取消。
- **雙擊標題** → 進入改名模式。**Enter / 失焦** 確定改名；
  **Esc** 取消。底層走 Obsidian 的 `fileManager.renameFile`，所以
  backlinks 也會更新。
- **紙條右鍵** → status、顏色、「Write synopsis to file」、
  「Remove from corkboard」、「Rebind…」。

### 選取與導航

| 操作 | 結果 |
|---|---|
| 點紙條 | 選取（藍邊） |
| Cmd/Ctrl + 點 | 加進選取或從選取移除 |
| Shift + 點 | 從上一個錨點到當前的範圍選取 |
| 點空白處 | 取消所有選取 |
| 雙擊紙條本體（不是標題） | 開啟對應 `.md` 在新分頁 |

### 重新排序

拖曳任一紙條，放到另一張紙條上即可重新排序。新順序會存到
`index.corkboard`。

### 多選 + 紙條右鍵

選了多張紙條時對其中任一張右鍵，選單動作會**套用到全部已選取的紙
條**。可以批次改 status / 顏色，或一次移除多張紙條。

### 檔案系統同步

如果在檔案總管（或 Obsidian 開著時被別的工具）新增 / 改名 / 刪除 /
搬移 `.md` 檔，corkboard 會即時跟上：

- 新增 → 在最後加一張新紙條。
- 改名 → 紙條標題更新；synopsis / status / 顏色保留。
- 刪除 → 對應紙條移除。
- 跨資料夾搬移 → 從原資料夾的 corkboard 移除，加到新資料夾的
  corkboard。

如果 plugin 在停用期間檔案被刪了，孤兒紙條會以灰色 + 紅色 ⚠ 標記
顯示。右鍵 → **Remove from corkboard** 清掉就好。

## 設定

Settings → Community plugins → Corkboard → 齒輪。可以改 4 個 status
的顯示文字，但 status id 是固定的（`todo` / `draft` / `revision` /
`done`），所以改完顯示文字之後既有紙條還能正確顯示。

## 資料格式

每個 corkboard 是一個 JSON 檔，路徑 `<folder>/index.corkboard`：

```json
{
  "version": 1,
  "cardWidth": 280,
  "cardHeight": 180,
  "cards": [
    {
      "path": "novel/ch01-opening.md",
      "synopsis": "主角第一次見到反派。",
      "status": "draft",
      "color": "blue"
    }
  ]
}
```

`title` 直接從 `path` 的檔名衍生，不另外存。Synopsis 存在這個 JSON
裡；可以透過紙條右鍵 → **Write synopsis to file** 寫進 md 檔（會插
在 frontmatter 之後當第一段）。

## v0.1.0 已知限制

- **Rebind to another file…** 還是 stub（按下去只跳 Notice）。
- 拖曳的 drop indicator 視覺很簡單。
- 不顯示子資料夾；corkboard 只看跟 `index.corkboard` 同一層的 md。
- 視圖內沒有 undo/redo。
- 不支援手機版（`isDesktopOnly: true`）。

## 開發

技術棧：TypeScript、esbuild、Preact（automatic JSX runtime）、
Vitest + jsdom + @testing-library/preact。

```bash
npm install
npm run dev      # esbuild watch 模式
npm run build    # 型別檢查 + production bundle
npm run test     # 跑單元/元件測試
npm run lint     # eslint（含 obsidianmd plugin 規則）
```

原始碼結構：

```
src/
  main.ts                       # plugin lifecycle、所有 register
  constants.ts, types.ts
  data/
    corkboardDocument.ts        # parse / serialize / mutations
    schema.ts                   # runtime validator（v1）
    initialData.ts              # 從資料夾既有 md 產生新 corkboard
  state/
    controller.ts               # CorkboardController + VaultGateway 介面
    selectionStore.ts, dragStore.ts
  sync/
    vaultSync.ts                # vault 事件 ↔ controller registry
    pathResolver.ts, synopsisInjector.ts
  view/
    CorkboardView.tsx           # TextFileView + Preact mount + 損毀 JSON banner
    components/
      CorkboardApp.tsx、CardGrid.tsx、Card.tsx、SynopsisEditor.tsx、
      Toolbar.tsx、ContextMenus.ts、AddCardModal.ts、DragLayer.tsx
  settings/
    settings.ts, settingsTab.ts
  utils/
    debounce.ts, filename.ts
```

設計 spec 與實作計畫放在 `docs/superpowers/`。手動整合測試計畫在
`docs/superpowers/test-plan.md`。

## License

0BSD（沿用 Obsidian sample plugin 樣板）。
