import { useState, useEffect } from 'react';
import type { Member, Guild } from '@entities/member/types';
import type { MemberRaidRecord } from '../types';

export interface MemberMoveItem {
  memberId: string;
  name: string;
  fromGuild: string;
  toGuild: string;
  action: 'move' | 'kick';
}

export interface GuildMoveSummary {
  guildName: string;
  members: MemberMoveItem[];
  action: 'kick' | 'recruit'; // What this guild is doing
}

export function useMemberMoveAnnounce(
  selectedSeasonId: string | null,
  archivedSeasonRecords: Record<string, MemberRaidRecord>,
  nextSeasonRecords: Record<string, MemberRaidRecord>,
  members: Member[],
  guilds: Guild[],
  isSelectedSeasonArchived: boolean
) {
  const [moveSummaries, setMoveSummaries] = useState<GuildMoveSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedSeasonId || !isSelectedSeasonArchived) {
      setMoveSummaries([]);
      return;
    }

    const guildMap = new Map<string, Guild>(guilds.map(g => [g.id!, g]));
    const memberMoves: Map<string, MemberMoveItem> = new Map();

    const isNextSeasonEmpty = Object.keys(nextSeasonRecords).length === 0;
    const useCurrentGuildAsNext = isNextSeasonEmpty;

    const memberCurrentGuildMap = new Map<string, string>();
    members.forEach(m => {
      if (m.id && m.guildId) {
        memberCurrentGuildMap.set(m.id, m.guildId);
      }
    });

    const allMemberIds = new Set([
      ...Object.keys(archivedSeasonRecords),
      ...(useCurrentGuildAsNext ? memberCurrentGuildMap.keys() : Object.keys(nextSeasonRecords))
    ]);

    console.log('Member move announce data:', {
      archivedRecordsCount: Object.keys(archivedSeasonRecords).length,
      nextRecordsCount: Object.keys(nextSeasonRecords).length,
      isNextSeasonEmpty,
      useCurrentGuildAsNext,
      sampleArchivedRecord: Object.values(archivedSeasonRecords)[0],
      sampleNextRecord: Object.values(nextSeasonRecords)[0],
    });

    allMemberIds.forEach(memberId => {
      const archivedRecord = archivedSeasonRecords[memberId];
      const nextRecord = nextSeasonRecords[memberId];
      const member = members.find(m => m.id === memberId);
      const currentGuildId = memberCurrentGuildMap.get(memberId);

      if (useCurrentGuildAsNext) {
        if (!archivedRecord && currentGuildId) {
          const toGuild = guildMap.get(currentGuildId);
          if (!toGuild) return;

          memberMoves.set(memberId, {
            memberId,
            name: member?.name || memberId,
            fromGuild: '',
            toGuild: toGuild.name || '未知公會',
            action: 'move'
          });
        } else if (archivedRecord && !currentGuildId) {
          const fromGuild = guildMap.get(archivedRecord.season_guild!);
          if (!fromGuild) return;

          memberMoves.set(memberId, {
            memberId,
            name: member?.name || archivedRecord.member_id || '未知成員',
            fromGuild: fromGuild.name || '未知公會',
            toGuild: '',
            action: 'kick'
          });
        } else if (archivedRecord && currentGuildId) {
          if (archivedRecord.season_guild !== currentGuildId) {
            const memberName = member?.name || archivedRecord.member_id || '未知成員';
            const fromGuild = guildMap.get(archivedRecord.season_guild!);
            const toGuild = guildMap.get(currentGuildId);

            if (!fromGuild || !toGuild) return;

            memberMoves.set(memberId, {
              memberId,
              name: memberName,
              fromGuild: fromGuild.name || '未知公會',
              toGuild: toGuild.name || '未知公會',
              action: 'move'
            });
          }
        }
      } else {
        if (!archivedRecord && nextRecord) {
          const memberName = member?.name || nextRecord.member_id || '未知成員';
          const toGuild = guildMap.get(nextRecord.season_guild!);
          if (!toGuild) return;

          memberMoves.set(memberId, {
            memberId,
            name: memberName,
            fromGuild: '',
            toGuild: toGuild.name || '未知公會',
            action: 'move'
          });
        } else if (archivedRecord && !nextRecord) {
          const fromGuild = guildMap.get(archivedRecord.season_guild!);
          if (!fromGuild) return;

          memberMoves.set(memberId, {
            memberId,
            name: member?.name || archivedRecord.member_id || '未知成員',
            fromGuild: fromGuild.name || '未知公會',
            toGuild: '',
            action: 'kick'
          });
        } else if (archivedRecord && nextRecord) {
          if (archivedRecord.season_guild !== nextRecord.season_guild) {
            const memberName = member?.name || nextRecord.member_id || archivedRecord.member_id || '未知成員';
            const fromGuild = guildMap.get(archivedRecord.season_guild!);
            const toGuild = guildMap.get(nextRecord.season_guild!);

            if (!fromGuild || !toGuild) return;

            memberMoves.set(memberId, {
              memberId,
              name: memberName,
              fromGuild: fromGuild.name || '未知公會',
              toGuild: toGuild.name || '未知公會',
              action: 'move'
            });
          }
        }
      }
    });

    // Group by guild and action type
    const guildGroups = new Map<string, { toKick: MemberMoveItem[], toRecruit: MemberMoveItem[] }>();

    memberMoves.forEach(move => {
      // Add to source guild's "kick" list
      if (move.fromGuild) {
        if (!guildGroups.has(move.fromGuild)) {
          guildGroups.set(move.fromGuild, { toKick: [], toRecruit: [] });
        }
        guildGroups.get(move.fromGuild)!.toKick.push(move);
      }

      // For move actions, also add to target guild's "recruit" list
      if (move.action === 'move' && move.toGuild) {
        if (!guildGroups.has(move.toGuild)) {
          guildGroups.set(move.toGuild, { toKick: [], toRecruit: [] });
        }
        guildGroups.get(move.toGuild)!.toRecruit.push(move);
      }
    });

    // Build summaries
    const summaries: GuildMoveSummary[] = [];

    guildGroups.forEach((groups, guildName) => {
      // Add kick summary
      if (groups.toKick.length > 0) {
        summaries.push({
          guildName,
          members: groups.toKick,
          action: 'kick'
        });
      }

      // Add recruit summary
      if (groups.toRecruit.length > 0) {
        summaries.push({
          guildName,
          members: groups.toRecruit,
          action: 'recruit'
        });
      }
    });

    setMoveSummaries(summaries.sort((a, b) => {
      if (a.guildName !== b.guildName) {
        return a.guildName.localeCompare(b.guildName);
      }
      // Sort kick before recruit within same guild
      return a.action === 'kick' ? -1 : 1;
    }));
  }, [selectedSeasonId, archivedSeasonRecords, nextSeasonRecords, members, guilds, isSelectedSeasonArchived]);

  return {
    moveSummaries,
    loading,
    hasChanges: moveSummaries.length > 0
  };
}
