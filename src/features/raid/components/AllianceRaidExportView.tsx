import React, { forwardRef } from 'react';
import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RaidSeason {
  id: string;
  season_number: number;
  period_text: string;
  description: string;
}

interface GuildRaidRecord {
  id: string;
  season_id: string;
  guild_id: string;
  score: number;
  rank: string;
}

interface Guild {
  id?: string;
  name: string;
  serial?: number | string;
  tier?: number;
}

interface AllianceRaidExportViewProps {
  selectedSeasonsForExport: RaidSeason[];
  sortedGuilds: Guild[];
  getRecord: (guild_id: string | undefined, season_id: string) => GuildRaidRecord | undefined;
  includeScore: boolean;
}

const TIER_ROW_BG: Record<number, string> = {
  1: 'bg-orange-950/50',
  2: 'bg-blue-950/50',
  3: 'bg-stone-800',
  4: 'bg-green-950/50',
};

const TIER_TEXT: Record<number, string> = {
  1: 'text-orange-400',
  2: 'text-blue-400',
  3: 'text-stone-300',
  4: 'text-green-400',
};

const AllianceRaidExportView = forwardRef<HTMLDivElement, AllianceRaidExportViewProps>(
  ({ selectedSeasonsForExport, sortedGuilds, getRecord, includeScore }, ref) => {
    const { t } = useTranslation(['raid', 'translation']);

    return (
      <div className="absolute -left-[9999px] top-0">
        <div
          ref={ref}
          className="bg-stone-900 p-8 text-stone-100"
          style={{ width: 'fit-content', minWidth: '400px' }}
        >
          <div className="flex justify-between items-center mb-6 border-b border-stone-800 pb-6">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-500" />
              <div>
                <h1 className="text-2xl font-black tracking-tight uppercase italic">
                  {t('alliance_raid.history_title')}
                </h1>
                <p className="text-stone-500 font-mono text-xs tracking-widest uppercase">
                  {selectedSeasonsForExport.length === 1
                    ? `${t('alliance_raid.season_label')} ${selectedSeasonsForExport[0].season_number}`
                    : `${t('alliance_raid.seasons_label')} ${selectedSeasonsForExport[0]?.season_number} - ${selectedSeasonsForExport[selectedSeasonsForExport.length - 1]?.season_number}`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-stone-400">KAZRAN</div>
              <div className="text-xs text-stone-600 uppercase tracking-widest">
                {t('alliance_raid.generated_at')} {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-stone-700">
            <table className="w-auto border-collapse text-sm">
              <thead>
                <tr className="bg-stone-800 border-b border-stone-700">
                  <th className="py-2 px-3 text-left w-6 border-r border-stone-700" />
                  <th className="py-2 px-3 text-left whitespace-nowrap border-r border-stone-700" />
                  {selectedSeasonsForExport.map(season => (
                    <th
                      key={season.id}
                      className="py-2 px-2 text-left w-[110px] min-w-[110px] max-w-[110px] border-r border-stone-700 last:border-r-0"
                    >
                      <div className="text-xs font-bold text-stone-200">S{season.season_number}</div>
                      <div className="text-[10px] text-stone-500 font-medium leading-tight">
                        {season.period_text}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedGuilds.map(guild => {
                  const tier = guild.tier ?? 0;
                  const rowBg = TIER_ROW_BG[tier] ?? 'bg-stone-800/50';
                  const nameColor = TIER_TEXT[tier] ?? 'text-stone-400';
                  return (
                    <tr
                      key={guild.id ?? guild.name}
                      className={`border-b border-stone-700/50 last:border-b-0 ${rowBg}`}
                    >
                      <td className={`py-1.5 px-3 text-xs border-r border-stone-700/50 font-mono opacity-70 whitespace-nowrap ${nameColor}`}>
                        {guild.serial ? t('common.guild_serial', { serial: guild.serial }) : '-'}
                      </td>
                      <td className={`py-1.5 px-3 text-sm font-semibold border-r border-stone-700/50 whitespace-nowrap ${nameColor}`}>
                        {guild.name}
                      </td>
                      {selectedSeasonsForExport.map(season => {
                        const record = getRecord(guild.id, season.id);
                        return (
                          <td
                            key={season.id}
                            className="py-1.5 px-3 border-r border-stone-700/50 last:border-r-0 w-[110px] min-w-[110px] max-w-[110px]"
                          >
                            <div className="flex items-center gap-1.5">
                              {record && record.rank ? (
                                <>
                                  <span className={`text-sm font-bold leading-tight ${
                                    !record.rank.includes('%')
                                      ? 'bg-gradient-to-r from-amber-400 to-orange-600 bg-clip-text text-transparent'
                                      : 'text-amber-400'
                                  }`}>
                                    {record.rank}
                                  </span>
                                  {includeScore && record.score > 0 && (
                                    <span className="text-[10px] text-stone-400 font-mono">
                                      ({record.score.toLocaleString()})
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-stone-600 text-sm italic">-</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 pt-6 border-t border-stone-800 text-center text-stone-600 text-xs uppercase tracking-[0.5em]">
            Kazran Alliance System • Raid Record
          </div>
        </div>
      </div>
    );
  }
);

AllianceRaidExportView.displayName = 'AllianceRaidExportView';

export default AllianceRaidExportView;
