import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/shared/api/supabase';
import { useAppContext } from '@/store';
import { Trophy, Save, AlertCircle, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { logEvent } from '@/analytics';
import GuildRaidTable from '../components/GuildRaidTable';
import MemberStatsModal from '../components/MemberStatsModal';

interface RaidSeason {
  id: string;
  season_number: number;
  period_text: string;
  description: string;
}

interface MemberRaidRecord {
  id?: string;
  season_id: string;
  member_id: string;
  score: number;
  note: string;
}

export default function GuildRaidManager() {
  const { t } = useTranslation();
  const { db, currentUser } = useAppContext();

  const [seasons, setSeasons] = useState<RaidSeason[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [records, setRecords] = useState<Record<string, MemberRaidRecord>>({}); // key: member_id
  const [draftRecords, setDraftRecords] = useState<Record<string, MemberRaidRecord>>({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [selectedGuildIds, setSelectedGuildIds] = useState<string[]>([]);
  const [isGuildSelectionOpen, setIsGuildSelectionOpen] = useState(true);
  
  const [sortConfig, setSortConfig] = useState<{ key: 'default' | 'score', order: 'asc' | 'desc' }>({ key: 'default', order: 'asc' });
  const [selectedMemberStats, setSelectedMemberStats] = useState<any>(null);

  const userRole = currentUser ? db.users[currentUser]?.role : null;
  const canManage = userRole === 'manager' || userRole === 'admin' || userRole === 'creator';
  const userGuildId = !canManage && currentUser ? Object.entries(db.guilds).find(([_, g]) => g.username === currentUser)?.[0] : null;

  // Get guilds in the same tier
  const adminGuild = userGuildId ? db.guilds[userGuildId] : null;
  const targetTier = adminGuild?.tier || 1; // Default to tier 1 if admin has no guild

  const availableGuilds = useMemo(() => {
    return Object.values(db.guilds)
      .filter(g => canManage || g.tier === targetTier)
      .sort((a, b) => {
        if ((a.tier || 1) !== (b.tier || 1)) return (a.tier || 1) - (b.tier || 1);
        return (a.orderNum || 99) - (b.orderNum || 99);
      });
  }, [db.guilds, canManage, targetTier]);

  const guildsByTier = useMemo(() => {
    const grouped: Record<number, typeof availableGuilds> = {};
    availableGuilds.forEach(g => {
      const tier = g.tier || 1;
      if (!grouped[tier]) grouped[tier] = [];
      grouped[tier].push(g);
    });
    return grouped;
  }, [availableGuilds]);

  const getTierColorActive = (tier: number) => {
    switch (tier) {
      case 1: return 'bg-orange-500 text-white border-orange-600 shadow-md';
      case 2: return 'bg-blue-500 text-white border-blue-600 shadow-md';
      case 3: return 'bg-stone-500 text-white border-stone-600 shadow-md';
      case 4: return 'bg-green-500 text-white border-green-600 shadow-md';
      default: return 'bg-stone-500 text-white border-stone-600 shadow-md';
    }
  };

  useEffect(() => {
    if (availableGuilds.length > 0 && selectedGuildIds.length === 0) {
      setSelectedGuildIds([availableGuilds[0].id!]);
    }
  }, [availableGuilds]);

  const fetchSeasons = async () => {
    try {
      const { data, error } = await supabase.from('raid_seasons').select('*').order('season_number', { ascending: false });
      if (error) throw error;
      setSeasons(data || []);
      if (data && data.length > 0) {
        setSelectedSeasonId(data[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching seasons:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchRecords = async () => {
    if (!selectedSeasonId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('member_raid_records')
        .select('*')
        .eq('season_id', selectedSeasonId);

      if (error) {
        // If table doesn't exist, we just use empty data
        if (error.code !== '42P01') throw error;
      }

      const recordsMap: Record<string, MemberRaidRecord> = {};
      (data || []).forEach(r => {
        recordsMap[r.member_id] = r;
      });
      setRecords(recordsMap);
      setDraftRecords({});
    } catch (err: any) {
      console.error('Error fetching records:', err);
      // Don't show error if table doesn't exist yet
      if (err.code !== '42P01') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [selectedSeasonId]);

  const handleGuildToggle = (guildId: string) => {
    if (isComparisonMode) {
      setSelectedGuildIds(prev => {
        if (prev.includes(guildId)) {
          if (prev.length === 1) return prev; // Keep at least one
          return prev.filter(id => id !== guildId);
        }
        if (prev.length >= 4) return prev; // Max 4
        return [...prev, guildId];
      });
    } else {
      setSelectedGuildIds([guildId]);
    }
  };

  useEffect(() => {
    if (!isComparisonMode && selectedGuildIds.length > 1) {
      setSelectedGuildIds([selectedGuildIds[0]]);
    }
  }, [isComparisonMode]);

  const handleRecordChange = (memberId: string, field: 'score' | 'note', value: string | number) => {
    setDraftRecords(prev => {
      const existingRecord = prev[memberId] || records[memberId] || { season_id: selectedSeasonId, member_id: memberId, score: 0, note: '' };
      
      let finalValue = value;
      if (field === 'score') {
        finalValue = Math.min(Math.max(Number(value) || 0, 0), 10000);
      }

      return {
        ...prev,
        [memberId]: {
          ...existingRecord,
          [field]: finalValue
        }
      };
    });
  };

  const handleSaveGuild = async (guildId: string) => {
    const guildMembers = Object.values(db.members).filter(m => m.guildId === guildId);
    const memberIds = new Set(guildMembers.map(m => m.id));
    const draftsToSave = Object.values(draftRecords).filter(d => memberIds.has(d.member_id));
    
    if (draftsToSave.length === 0) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('member_raid_records')
        .upsert(draftsToSave, { onConflict: 'season_id, member_id' });

      if (error) throw error;

      setRecords(prev => {
        const next = { ...prev };
        draftsToSave.forEach(d => {
          next[d.member_id] = d;
        });
        return next;
      });
      
      setDraftRecords(prev => {
        const next = { ...prev };
        draftsToSave.forEach(d => {
          delete next[d.member_id];
        });
        return next;
      });
      logEvent('GuildRaidManager', 'Save Guild Records', `Guild: ${guildId}, Count: ${draftsToSave.length}`);
    } catch (err: any) {
      console.error('Error saving records:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelGuild = (guildId: string) => {
    setDraftRecords(prev => {
      const next = { ...prev };
      const guildMembers = Object.values(db.members).filter(m => m.guildId === guildId);
      guildMembers.forEach(m => {
        delete next[m.id!];
      });
      return next;
    });
  };

  const getSortedMembers = (guildId: string) => {
    const guildMembers = Object.values(db.members).filter(m => m.guildId === guildId);
    
    return guildMembers.sort((a, b) => {
      if (sortConfig.key === 'score') {
        const scoreA = draftRecords[a.id!]?.score ?? records[a.id!]?.score ?? 0;
        const scoreB = draftRecords[b.id!]?.score ?? records[b.id!]?.score ?? 0;
        if (scoreA !== scoreB) {
          return sortConfig.order === 'desc' ? scoreB - scoreA : scoreA - scoreB;
        }
      }

      // Default sort: role then name
      const roleOrder: Record<string, number> = { 'leader': 1, 'coleader': 2, 'member': 3 };
      const orderA = roleOrder[a.role] || 99;
      const orderB = roleOrder[b.role] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  };

  const handleSort = (key: 'default' | 'score') => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, order: prev.order === 'asc' ? 'desc' : 'asc' };
      }
      return { key, order: key === 'score' ? 'desc' : 'asc' };
    });
  };

  if (!canManage) {
    return (
      <div className="h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-stone-100 dark:bg-stone-900">
          <div className="text-center p-8 bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 max-w-md">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-stone-800 dark:text-stone-200 mb-2">{t('errors.permission')}</h2>
            <p className="text-stone-500 dark:text-stone-400 mb-6">{t('dashboard.no_permission')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-900 flex flex-col">
      <main className="max-w-7xl mx-auto p-4 sm:p-6 flex-1 w-full flex flex-col">
        
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
              <Trophy className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">
                {t('raid.title_guild_manager', '公會分數管理')}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedSeasonId}
              onChange={e => setSelectedSeasonId(e.target.value)}
              className="px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {seasons.map(s => (
                <option key={s.id} value={s.id}>S{s.season_number} ({s.period_text})</option>
              ))}
            </select>

            <button
              onClick={() => {
                // To be implemented or linked to AllianceRaidRecord's modal
                alert('請至「聯盟成績記錄」頁面新增賽季');
              }}
              className="flex items-center gap-2 px-3 py-2 bg-stone-800 dark:bg-stone-700 text-white rounded-lg hover:bg-stone-700 dark:hover:bg-stone-600 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t('alliance_raid.add_season', '新增賽季')}</span>
            </button>

            <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-stone-800 px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 shadow-sm">
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300">⚖️ {t('raid.comparison_mode', '並列模式')}</span>
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={isComparisonMode}
                  onChange={(e) => setIsComparisonMode(e.target.checked)}
                />
                <div className="w-10 h-6 bg-stone-200 dark:bg-stone-600 rounded-full peer peer-checked:bg-indigo-500 transition-colors shadow-inner"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-md"></div>
              </div>
            </label>


          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Guild Selection */}
        <div className="mb-6 bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
          <button 
            onClick={() => setIsGuildSelectionOpen(!isGuildSelectionOpen)}
            className="w-full px-4 py-3 flex items-center justify-between bg-stone-50 dark:bg-stone-700/50 hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors"
          >
            <span className="font-bold text-stone-800 dark:text-stone-200">
              {t('common.select_guild', '選擇公會')}
            </span>
            {isGuildSelectionOpen ? <ChevronDown className="w-5 h-5 text-stone-500" /> : <ChevronRight className="w-5 h-5 text-stone-500" />}
          </button>
          
          {isGuildSelectionOpen && (
            <div className="p-4 space-y-4">
              {Object.entries(guildsByTier).sort(([a], [b]) => Number(a) - Number(b)).map(([tierStr, guilds]) => {
                const tier = Number(tierStr);
                return (
                  <div key={tier} className="flex items-start gap-4">
                    <div className="w-16 flex-shrink-0 pt-2 text-sm font-bold text-stone-500 dark:text-stone-400">
                      T{tier}
                    </div>
                    <div className="flex flex-wrap gap-2 flex-1">
                      {guilds.map(guild => {
                        const isSelected = selectedGuildIds.includes(guild.id!);
                        return (
                          <button
                            key={guild.id}
                            onClick={() => handleGuildToggle(guild.id!)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                              isSelected
                                ? getTierColorActive(tier)
                                : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700'
                            }`}
                          >
                            {isComparisonMode && (
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                readOnly 
                                className="mr-2"
                              />
                            )}
                            {guild.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tables Area */}
        <div className={`flex-1 grid gap-4 ${isComparisonMode ? `grid-cols-1 md:grid-cols-${Math.min(selectedGuildIds.length, 4)}` : 'grid-cols-1'}`}>
          {selectedGuildIds.map(guildId => {
            const guild = db.guilds[guildId];
            const sortedMembers = getSortedMembers(guildId);

            return (
              <GuildRaidTable
                key={guildId}
                guildId={guildId}
                guildName={guild?.name || ''}
                sortedMembers={sortedMembers}
                records={records}
                draftRecords={draftRecords}
                isComparisonMode={isComparisonMode}
                loading={loading}
                saving={saving}
                onSort={handleSort}
                onRecordChange={handleRecordChange}
                onMemberClick={setSelectedMemberStats}
                onSave={handleSaveGuild}
                onCancel={handleCancelGuild}
              />
            );
          })}
        </div>

      </main>

      {/* Member Stats Modal */}
      <MemberStatsModal 
        member={selectedMemberStats} 
        onClose={() => setSelectedMemberStats(null)} 
      />

    </div>
  );
}
