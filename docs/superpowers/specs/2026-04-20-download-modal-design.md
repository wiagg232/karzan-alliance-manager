# Download Modal Design Spec

**Date:** 2026-04-20  
**Feature:** AllianceRaidRecord 下載 PNG 的彈窗設定介面

## Overview

替換現有「直接下載主表格 PNG」的行為，改為先開啟設定彈窗，讓使用者選擇下載範圍後再觸發下載。下載結果仍為 PNG，但捕捉的是根據選項動態渲染的 export view（而非固定的主表格）。

## UI 設計

彈窗採用 780px 寬、深色（stone-800/900）風格，與現有 app 一致。分四個區塊：

### 1. 賽季範圍（Season Range）
兩個 `<select>` 下拉，以箭頭（→）相隔，選項格式為 `SN（period_text）`（例如 `S9（休業期）`）。
- 預設：兩者均選最新賽季
- 若主頁面 `hideLatestSeason` 為 on，則預設改為第二新賽季

### 2. 顯示分數 Toggle
跟隨主頁面 `showScoreInTable` 的當前值作為初始狀態，使用者可在彈窗內獨立調整。不顯示副文字。

### 3. 公會選擇（Guild Selection）
4 欄並列，每欄為一個 Tier（1=橙 `text-orange-400`、2=藍 `text-blue-400`、3=石灰 `text-stone-400`、4=綠 `text-green-400`，參照 `getTierTextColorDark`）：
- **Tier 級 toggle**：開啟/關閉整個 Tier（關閉時該 Tier 下所有公會變 disabled + 0.35 opacity）
- **個別公會 checkbox**：在 Tier 開啟時可單獨勾選/取消
- 僅顯示 `isDisplay !== false` 的公會，按 `orderNum` 排序

Footer 左側顯示「已選 X / Y 個公會」計數。

### 4. Footer 操作區
- 「取消」— 關閉彈窗，不下載
- 「下載 PNG」— 觸發下載流程

## 下載流程

1. 使用者點擊「下載 PNG」
2. 根據彈窗設定（賽季範圍、分數、選中公會）產生 export config
3. 將 config 傳入 `AllianceRaidExportView`（隱藏 ref 元件），等待渲染（~100ms delay）
4. 用 `toPng(exportRef.current, { pixelRatio: 2, skipFonts: true })` 捕捉
5. 下載 `raid-record-{timestamp}.png`，關閉彈窗

## 資料模型

```typescript
interface DownloadConfig {
  seasonFrom: string;   // season id
  seasonTo: string;     // season id
  includeScore: boolean;
  selectedGuildIds: Set<string>;
}
```

## 元件結構

- **`AllianceRaidDownloadModal`** — 彈窗本體，接收 props：seasons、guilds（按 tier 分組）、showScoreInTable（主頁面當前值）、hideLatestSeason、onDownload(config)、onClose
- **`AllianceRaidRecord`** — 管理 `isDownloadModalOpen` state，傳入所需 props，處理 `onDownload` → 觸發 `toPng`
- **`AllianceRaidExportView`** — 重新啟用，接受 export config 渲染對應的公會/賽季資料

## AllianceRaidExportView 修改範圍

需要接受新的 props 以支援彈窗選項：
- `seasonIds: string[]` — 要顯示的賽季（由 from/to 計算出中間所有賽季）
- `includeScore: boolean`
- `guildIds: string[]` — 要顯示的公會

## 狀態初始化

在 `AllianceRaidRecord` 用 `useMemo` 計算預設 config：
- `seasonFrom` / `seasonTo`：若 `hideLatestSeason`，取 `displaySeasons[1].id`，否則取 `displaySeasons[0].id`
- `selectedGuildIds`：所有 `isDisplay !== false` 的公會（全選）
- `includeScore`：同 `showScoreInTable`

## 不在範圍內

- 下載格式選擇（固定 PNG）
- 多個獨立下載任務排隊
- 預覽功能
