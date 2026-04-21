# Download Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-click PNG download button with a modal that lets users configure season range, score visibility, and guild selection before downloading.

**Architecture:** The modal manages its own local state (initialized from parent props on open). On confirm, it calls `onDownload(config)` with a `DownloadConfig` object. The parent sets `exportConfig`, which drives `AllianceRaidExportView` (re-enabled) to render the correct data off-screen, then `toPng` captures it.

**Tech Stack:** React 19, TypeScript, TailwindCSS 4.1, html-to-image (`toPng`)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Rewrite | `src/features/raid/components/AllianceRaidDownloadModal.tsx` | New modal UI with all config controls |
| Modify | `src/features/raid/pages/AllianceRaidRecord.tsx` | Add modal state, exportRef, re-import ExportView |
| No change | `src/features/raid/components/AllianceRaidExportView.tsx` | Already accepts `selectedSeasonsForExport`, `sortedGuilds`, `getRecord`, `includeScore` — parent passes filtered data |

---

### Task 1: Rewrite `AllianceRaidDownloadModal`

**Files:**
- Modify: `src/features/raid/components/AllianceRaidDownloadModal.tsx`

- [ ] **Step 1: Replace entire file with new implementation**

```tsx
import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, BarChart3 } from 'lucide-react';

interface RaidSeason {
  id: string;
  season_number: number;
  period_text: string;
}

interface Guild {
  id?: string;
  name: string;
  tier?: number;
}

export interface DownloadConfig {
  seasonFrom: string;
  seasonTo: string;
  includeScore: boolean;
  selectedGuildIds: Set<string>;
}

interface AllianceRaidDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  seasons: RaidSeason[];
  guilds: Guild[];
  showScoreInTable: boolean;
  hideLatestSeason: boolean;
  onDownload: (config: DownloadConfig) => void;
}

const TIER_COLORS: Record<number, string> = {
  1: 'text-orange-400',
  2: 'text-blue-400',
  3: 'text-stone-400',
  4: 'text-green-400',
};

export default function AllianceRaidDownloadModal({
  isOpen,
  onClose,
  seasons,
  guilds,
  showScoreInTable,
  hideLatestSeason,
  onDownload,
}: AllianceRaidDownloadModalProps) {
  const defaultSeasonId = useMemo(() => {
    if (seasons.length === 0) return '';
    if (hideLatestSeason && seasons.length > 1) return seasons[1].id;
    return seasons[0].id;
  }, [seasons, hideLatestSeason]);

  const allGuildIds = useMemo(
    () => new Set(guilds.map(g => g.id).filter(Boolean) as string[]),
    [guilds]
  );

  const tierNumbers = useMemo(() => {
    return Array.from(new Set(guilds.map(g => g.tier ?? 0))).sort((a, b) => a - b);
  }, [guilds]);

  const guildsByTier = useMemo(() => {
    const map: Record<number, Guild[]> = {};
    guilds.forEach(g => {
      const tier = g.tier ?? 0;
      if (!map[tier]) map[tier] = [];
      map[tier].push(g);
    });
    return map;
  }, [guilds]);

  const [seasonFrom, setSeasonFrom] = useState('');
  const [seasonTo, setSeasonTo] = useState('');
  const [includeScore, setIncludeScore] = useState(showScoreInTable);
  const [tierEnabled, setTierEnabled] = useState<Record<number, boolean>>({});
  const [selectedGuildIds, setSelectedGuildIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    setSeasonFrom(defaultSeasonId);
    setSeasonTo(defaultSeasonId);
    setIncludeScore(showScoreInTable);
    const enabled: Record<number, boolean> = {};
    tierNumbers.forEach(t => { enabled[t] = true; });
    setTierEnabled(enabled);
    setSelectedGuildIds(new Set(allGuildIds));
  }, [isOpen, defaultSeasonId, showScoreInTable, tierNumbers, allGuildIds]);

  const effectiveSelectedIds = useMemo(() => {
    return new Set(
      Array.from(selectedGuildIds).filter(id => {
        const guild = guilds.find(g => g.id === id);
        return tierEnabled[guild?.tier ?? 0] !== false;
      })
    );
  }, [selectedGuildIds, guilds, tierEnabled]);

  const totalCount = guilds.length;
  const selectedCount = effectiveSelectedIds.size;

  const toggleTier = (tier: number) => {
    setTierEnabled(prev => ({ ...prev, [tier]: !prev[tier] }));
  };

  const toggleGuild = (id: string) => {
    setSelectedGuildIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (effectiveSelectedIds.size === totalCount) {
      const disabled: Record<number, boolean> = {};
      tierNumbers.forEach(t => { disabled[t] = false; });
      setTierEnabled(disabled);
      setSelectedGuildIds(new Set());
    } else {
      const enabled: Record<number, boolean> = {};
      tierNumbers.forEach(t => { enabled[t] = true; });
      setTierEnabled(enabled);
      setSelectedGuildIds(new Set(allGuildIds));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-8 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-800 border border-stone-700 rounded-2xl w-[780px] max-w-full shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-stone-700">
          <div className="flex items-center gap-2 text-lg font-bold text-stone-100">
            <Download className="w-[18px] h-[18px] text-amber-500" />
            下載成績記錄
          </div>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-300 p-1 rounded-md flex items-center justify-center"
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Season Range */}
          <div>
            <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-widest mb-2">
              賽季範圍
            </div>
            <div className="flex items-center gap-3">
              <select
                value={seasonFrom}
                onChange={e => setSeasonFrom(e.target.value)}
                className="flex-1 bg-stone-900 border border-stone-600 rounded-lg text-stone-200 px-3 py-2 text-sm cursor-pointer"
              >
                {seasons.map(s => (
                  <option key={s.id} value={s.id}>
                    S{s.season_number}（{s.period_text}）
                  </option>
                ))}
              </select>
              <span className="text-stone-500 text-lg">→</span>
              <select
                value={seasonTo}
                onChange={e => setSeasonTo(e.target.value)}
                className="flex-1 bg-stone-900 border border-stone-600 rounded-lg text-stone-200 px-3 py-2 text-sm cursor-pointer"
              >
                {seasons.map(s => (
                  <option key={s.id} value={s.id}>
                    S{s.season_number}（{s.period_text}）
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Score Toggle */}
          <div className="flex items-center justify-between px-3.5 py-3 bg-stone-900 border border-stone-600 rounded-xl">
            <div className="flex items-center gap-2 text-sm text-stone-300">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              顯示分數
            </div>
            <button
              onClick={() => setIncludeScore(v => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                includeScore ? 'bg-amber-600' : 'bg-stone-600'
              }`}
            >
              <span
                className={`absolute top-[3px] w-3.5 h-3.5 bg-white rounded-full transition-all ${
                  includeScore ? 'right-[3px]' : 'left-[3px]'
                }`}
              />
            </button>
          </div>

          {/* Guild Selection */}
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-widest">
                選擇公會
              </div>
              <button
                onClick={toggleAll}
                className="text-xs text-amber-500 hover:text-amber-400 px-1.5 py-0.5 rounded"
              >
                全選 / 全不選
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {tierNumbers.map(tier => {
                const tierGuilds = guildsByTier[tier] ?? [];
                const isOn = tierEnabled[tier] !== false;
                const tierColor = TIER_COLORS[tier] ?? 'text-stone-400';
                return (
                  <div key={tier} className="bg-stone-900 border border-stone-600 rounded-xl overflow-hidden">
                    <div
                      className="flex items-center justify-between px-2.5 py-2 border-b border-stone-800 cursor-pointer hover:bg-stone-800 transition-colors"
                      onClick={() => toggleTier(tier)}
                    >
                      <span className={`text-xs font-bold uppercase tracking-wide ${tierColor}`}>
                        Tier {tier}
                      </span>
                      <div
                        className={`relative w-7 h-4 rounded-full flex-shrink-0 transition-colors ${
                          isOn ? 'bg-amber-600' : 'bg-stone-600'
                        }`}
                      >
                        <span
                          className={`absolute top-[3px] w-2.5 h-2.5 bg-white rounded-full transition-all ${
                            isOn ? 'right-[3px]' : 'left-[3px]'
                          }`}
                        />
                      </div>
                    </div>
                    <div className="py-1.5">
                      {tierGuilds.map(g => {
                        const id = g.id ?? '';
                        const checked = isOn && selectedGuildIds.has(id);
                        return (
                          <div
                            key={id}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 transition-colors ${
                              isOn ? 'cursor-pointer hover:bg-stone-800' : 'opacity-35 cursor-default'
                            }`}
                            onClick={() => isOn && toggleGuild(id)}
                          >
                            <div
                              className={`w-3.5 h-3.5 border rounded flex-shrink-0 flex items-center justify-center transition-colors ${
                                checked
                                  ? 'bg-amber-600 border-amber-600'
                                  : 'bg-stone-700 border-stone-500'
                              }`}
                            >
                              {checked && (
                                <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                  <path
                                    d="M1 3L3 5L7 1"
                                    stroke="white"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </div>
                            <span className="text-xs text-stone-300 truncate">{g.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-t border-stone-700">
          <span className="text-xs text-stone-500 mr-auto">
            已選 {selectedCount} / {totalCount} 個公會
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 border border-stone-600 rounded-xl text-stone-400 text-sm font-semibold hover:border-stone-500 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onDownload({ seasonFrom, seasonTo, includeScore, selectedGuildIds: effectiveSelectedIds })}
            disabled={selectedCount === 0}
            className="flex items-center gap-2 px-5 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            下載 PNG
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run lint
```

Expected: no errors in `AllianceRaidDownloadModal.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/features/raid/components/AllianceRaidDownloadModal.tsx
git commit -m "feat(raid): rewrite download modal with season range and guild selection"
```

---

### Task 2: Wire modal and export view into `AllianceRaidRecord`

**Files:**
- Modify: `src/features/raid/pages/AllianceRaidRecord.tsx`

- [ ] **Step 1: Add imports at top of file**

Add after the existing `import AllianceRaidSeasonModal` line:

```typescript
import AllianceRaidDownloadModal, { DownloadConfig } from '../components/AllianceRaidDownloadModal';
import AllianceRaidExportView from '../components/AllianceRaidExportView';
```

- [ ] **Step 2: Add state and ref inside the component, after the existing `tableRef` line**

```typescript
const exportRef = useRef<HTMLDivElement>(null);
const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
const [exportConfig, setExportConfig] = useState<DownloadConfig | null>(null);
```

- [ ] **Step 3: Add useMemo for export view data, after the `visibleSeasons` line**

```typescript
const exportSeasonsForView = useMemo(() => {
  if (!exportConfig) return [];
  const fromSeason = seasons.find(s => s.id === exportConfig.seasonFrom);
  const toSeason = seasons.find(s => s.id === exportConfig.seasonTo);
  if (!fromSeason || !toSeason) return [];
  const minNum = Math.min(fromSeason.season_number, toSeason.season_number);
  const maxNum = Math.max(fromSeason.season_number, toSeason.season_number);
  return seasons
    .filter(s => s.season_number >= minNum && s.season_number <= maxNum)
    .sort((a, b) => a.season_number - b.season_number);
}, [exportConfig, seasons]);

const exportGuildsForView = useMemo(() => {
  if (!exportConfig) return [];
  return sortedGuilds.filter(g => g.id && exportConfig.selectedGuildIds.has(g.id));
}, [exportConfig, sortedGuilds]);
```

- [ ] **Step 4: Replace `handleDownloadImage` with `handleDownloadFromModal`**

Replace the existing `handleDownloadImage` function (lines 235–254) with:

```typescript
const handleDownloadFromModal = async (config: DownloadConfig) => {
  setExportConfig(config);
  setIsDownloadModalOpen(false);
  setIsGeneratingImage(true);
  await new Promise(resolve => setTimeout(resolve, 200));
  if (!exportRef.current) {
    setIsGeneratingImage(false);
    return;
  }
  try {
    const dataUrl = await toPng(exportRef.current, { pixelRatio: 2, skipFonts: true });
    const link = document.createElement('a');
    link.download = `raid-record-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error('Error generating image:', err);
    setError(t('alliance_raid.export_failed'));
  } finally {
    setIsGeneratingImage(false);
    setExportConfig(null);
  }
};
```

- [ ] **Step 5: Change the download button's `onClick` to open the modal**

Replace:
```tsx
onClick={handleDownloadImage}
```
With:
```tsx
onClick={() => setIsDownloadModalOpen(true)}
```

- [ ] **Step 6: Add `AllianceRaidExportView` and `AllianceRaidDownloadModal` to JSX**

Just before the closing `</div>` of the component's return (after the existing `<AllianceRaidSeasonModal ... />`), add:

```tsx
<AllianceRaidExportView
  ref={exportRef}
  selectedSeasonsForExport={exportSeasonsForView}
  sortedGuilds={exportGuildsForView}
  getRecord={getRecord}
  includeScore={exportConfig?.includeScore ?? false}
/>

<AllianceRaidDownloadModal
  isOpen={isDownloadModalOpen}
  onClose={() => setIsDownloadModalOpen(false)}
  seasons={seasons}
  guilds={sortedGuilds}
  showScoreInTable={showScoreInTable}
  hideLatestSeason={hideLatestSeason}
  onDownload={handleDownloadFromModal}
/>
```

- [ ] **Step 7: Type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 8: Manual smoke test**

1. `npm run dev` — open http://localhost:3000 and navigate to the Alliance Raid Record page
2. Click the download button — modal should open with dark stone-800 theme
3. Verify season dropdowns show `SN（period_text）` format, defaulting to latest (or second-latest if hide-latest-season is on)
4. Verify score toggle reflects main page's current setting
5. Verify 4 tier columns render with correct tier colors (orange/blue/violet/green)
6. Toggle a tier off — guilds should grey out and count should drop
7. Deselect an individual guild — count should drop by 1
8. Click 「全選 / 全不選」 — all should toggle
9. Click 「下載 PNG」 — modal closes, spinner shows, PNG file downloads
10. Open PNG — verify it contains the correct guilds and seasons from export view layout

- [ ] **Step 9: Commit**

```bash
git add src/features/raid/pages/AllianceRaidRecord.tsx
git commit -m "feat(raid): add download config modal with season range and guild selection"
```
