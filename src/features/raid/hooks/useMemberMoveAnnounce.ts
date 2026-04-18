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
  records: Record<string, MemberRaidRecord>,
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

    // Create maps for faster lookup
    const guildMap = new Map<string, Guild>(guilds.map(g => [g.id!, g]));
    const memberMap = new Map<string, Member>(members.map(m => [m.id!, m]));

    // Track member movements and removals
    const memberMoves: Map<string, MemberMoveItem> = new Map();

    // Step 1: For each current member, check if their guild changed from season_guild
    members.forEach(member => {
      if (!member.id) return;

      const record = records[member.id];
      if (!record) return; // Skip members without raid records

      const archivedGuildId = record.season_guild;
      const currentGuildId = member.guildId;

      // Skip if archived guild is same as current
      if (archivedGuildId === currentGuildId) return;

      const fromGuild = guildMap.get(archivedGuildId);
      const toGuild = guildMap.get(currentGuildId);

      if (!fromGuild || !toGuild) return;

      memberMoves.set(member.id, {
        memberId: member.id,
        name: member.name,
        fromGuild: fromGuild.name || '未知公會',
        toGuild: toGuild.name || '未知公會',
        action: 'move'
      });
    });

    // Step 2: Check for members in archived records who are no longer active (kicked)
    Object.entries(records).forEach(([memberId, record]) => {
      // Skip if we already tracked this as a move
      if (memberMoves.has(memberId)) return;

      const currentMember = memberMap.get(memberId);
      const fromGuildId = record.season_guild;

      // Only mark as kicked if:
      // 1. Member no longer exists in current members, OR
      // 2. Member's current guild is different AND we haven't already marked them
      if (!currentMember) {
        // This member was in the archived season but is no longer a member
        const fromGuild = guildMap.get(fromGuildId);
        if (fromGuild) {
          memberMoves.set(memberId, {
            memberId,
            name: record.member_id || '未知成員',
            fromGuild: fromGuild.name || '未知公會',
            toGuild: '',
            action: 'kick'
          });
        }
      }
    });

    // Step 3: Group by guild and action type
    const guildGroups = new Map<string, { toKick: MemberMoveItem[], toRecruit: MemberMoveItem[] }>();

    memberMoves.forEach(move => {
      // Add to source guild's "kick" list
      if (!guildGroups.has(move.fromGuild)) {
        guildGroups.set(move.fromGuild, { toKick: [], toRecruit: [] });
      }
      guildGroups.get(move.fromGuild)!.toKick.push(move);

      // For move actions, also add to target guild's "recruit" list
      if (move.action === 'move') {
        if (!guildGroups.has(move.toGuild)) {
          guildGroups.set(move.toGuild, { toKick: [], toRecruit: [] });
        }
        guildGroups.get(move.toGuild)!.toRecruit.push(move);
      }
    });

    // Step 4: Build summaries
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
  }, [selectedSeasonId, records, members, guilds, isSelectedSeasonArchived]);

  return {
    moveSummaries,
    loading,
    hasChanges: moveSummaries.length > 0
  };
}
