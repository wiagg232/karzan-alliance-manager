# GuildRaidManager 重構建議計畫 (Refactoring Plan)

目前 `GuildRaidManager.tsx` 是一個典型的 "God Component"（上帝元件），高達 900 多行，承載了過多的邏輯（包含資料獲取、即時同步、複雜的業務邏輯以及 UI 狀態管理）。

為了提升未來的可維護性與可讀性，建議將不同職責的邏輯拆分成多個 Custom Hooks。以下是具體的重構建議方向：

## 1. 抽離資料獲取與訂閱邏輯 (Data Fetching & Real-time Subscriptions)
目前元件內有大量的 `useEffect` 用來處理資料的獲取（`fetchSeasons`, `fetchRecords`）以及 Supabase 的 Real-time 訂閱（`memberRaidRecordsChannel`, `guildRaidRecordsChannel`, `memberNotesChannel`）。
*   **建議**：建立一個 `useRaidData` 或 `useRaidSubscriptions` 的 Custom Hook。
*   **目標**：將 `records`, `guildRaidRecords`, `seasons` 等狀態，以及對應的 fetch 和 subscribe 邏輯封裝進去。大幅減少主元件內的 `useEffect` 數量。

## 2. 抽離賽季管理邏輯 (Season Management)
處理新增賽季、封存賽季、刪除紀錄等邏輯（`handleSaveSeason`, `handleArchiveSeason`, `handleDeleteRecords`）佔據了相當大的篇幅。
*   **建議**：建立一個 `useSeasonManager` Hook。
*   **目標**：專門處理這些與賽季生命週期相關的複雜非同步操作與狀態（如 `saving`, `archiving`, `isDeleting`）。

## 3. 抽離資料儲存與草稿邏輯 (Draft & Auto-save)
目前處理分數修改的草稿（`draftRecords`）、自動儲存（`handleAutoSave`）、以及更新公會中位數（`updateGuildMedian`）的邏輯都寫在主元件中。
*   **建議**：建立一個 `useRaidRecordEditor` Hook。
*   **目標**：負責管理 `draftRecords` 的狀態變更、觸發自動儲存，並在儲存成功後更新主狀態與計算中位數。

## 4. 抽離 UI 狀態與表格佈局邏輯 (UI State & Layout)
像是 `rowHeights`, `headerHeight`, `theadHeight` 以及對應的 `handle...Change` 函式，主要是為了解決比較模式下的表格對齊問題。
*   **建議**：建立一個 `useTableLayout` Hook。
*   **目標**：專門管理這些純粹為了 UI 顯示而存在的狀態，讓它們不要干擾到核心業務邏輯。

## 5. 整理 `useMemo` 計算 (Guild Stats)
目前有幾個 `useMemo` 用來計算 `availableGuilds`, `guildsByTier`, `guildMemberCounts`。
*   **建議**：建立一個 `useGuildStats` Hook 或移至共用的 utility 函式。
*   **目標**：將這些與公會相關的衍生資料邏輯抽離，讓主元件的渲染邏輯更乾淨。

---
**總結**：
透過上述的拆分，`GuildRaidManager` 將能回歸到一個「單純負責組合 Hooks 與渲染 UI」的容器元件，這會讓未來的維護、除錯和測試變得容易許多。
