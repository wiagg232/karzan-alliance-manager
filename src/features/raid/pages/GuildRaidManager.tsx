import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/store';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Edit2, Save, X, Swords, Search, CheckSquare, Square } from 'lucide-react';
import { getTierColor, getImageUrl } from '@/shared/lib/utils';
import { Member, CostumeRecord } from '@/entities/member/types';

export default function GuildRaidManager() {
  const { t, i18n } = useTranslation();
  const { db, updateMember, showToast } = useAppContext();
  
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [isGuildSelectOpen, setIsGuildSelectOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, { totalScore: number, note: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  const [trainingInfoMemberId, setTrainingInfoMemberId] = useState<string | null>(null);
  const [compareMemberIds, setCompareMemberIds] = useState<string[]>([]);

  const sortedGuilds = useMemo(() => {
    return Object.values(db.guilds)
      .filter(g => g.isDisplay !== false)
      .sort((a, b) => {
        const tierA = a.tier || 99;
        const tierB = b.tier || 99;
        if (tierA !== tierB) return tierA - tierB;
        const orderA = a.orderNum || 99;
        const orderB = b.orderNum || 99;
        return orderA - orderB;
      });
  }, [db.guilds]);

  const tiers = useMemo(() => {
    const uniqueTiers = Array.from(new Set(sortedGuilds.map(g => g.tier || 1))).sort((a, b) => a - b);
    return uniqueTiers;
  }, [sortedGuilds]);

  const guild = selectedGuildId ? db.guilds[selectedGuildId] : null;
  const members = useMemo(() => {
    if (!selectedGuildId) return [];
    return Object.entries(db.members)
      .filter(([_, m]) => m.guildId === selectedGuildId)
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => {
        const roleOrder: Record<string, number> = { 'leader': 1, 'coleader': 2, 'member': 3 };
        const orderA = roleOrder[a.role] || 99;
        const orderB = roleOrder[b.role] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });
  }, [db.members, selectedGuildId]);

  const handleEditStart = () => {
    const initialData: Record<string, { totalScore: number, note: string }> = {};
    members.forEach(m => {
      initialData[m.id] = {
        totalScore: m.totalScore || 0,
        note: m.note || ''
      };
    });
    setEditData(initialData);
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handleEditSave = async () => {
    setIsSaving(true);
    try {
      const promises = Object.entries(editData).map(([id, data]) => {
        const member = db.members[id];
        if (member && (member.totalScore !== data.totalScore || member.note !== data.note)) {
          return updateMember(id, { totalScore: data.totalScore, note: data.note });
        }
        return Promise.resolve();
      });
      await Promise.all(promises);
      showToast(t('common.save_success', '儲存成功'), 'success');
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error saving raid data:", error);
      showToast(`${t('common.save_failed', '儲存失敗')}: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCompare = (id: string) => {
    setCompareMemberIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const renderTrainingInfo = (memberId: string) => {
    const member = db.members[memberId];
    if (!member) return null;

    const characters = Object.values(db.characters).sort((a, b) => a.orderNum - b.orderNum);

    return (
      <div className="flex flex-col gap-4">
        <h3 className="font-bold text-lg text-stone-800 dark:text-stone-200 text-center mb-2">{member.name}</h3>
        {characters.map(character => {
          const characterCostumes = Object.values(db.costumes)
            .filter(c => c.characterId === character.id)
            .sort((a, b) => (a.orderNum ?? 999) - (b.orderNum ?? 999));
            
          if (characterCostumes.length === 0) return null;
          
          const hasExclusiveWeapon = member.exclusiveWeapons?.[character.id] ?? false;

          return (
            <div key={character.id} className="bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
              <div className="bg-stone-50 dark:bg-stone-700 px-3 py-2 border-b border-stone-200 dark:border-stone-600 flex justify-between items-center">
                <h4 className="font-bold text-stone-800 dark:text-stone-200 text-sm">
                  {i18n.language === 'en' ? (character.nameE || character.name) : character.name}
                </h4>
              </div>
              <div className="p-3 flex flex-wrap gap-3">
                {characterCostumes.map(costume => {
                  const record = member.records?.[costume.id];
                  const hasCostume = record && record.level >= 0;
                  
                  let levelColorClass = "bg-orange-400 text-stone-900";
                  if (hasCostume) {
                    const level = Number(record.level);
                    if (level <= 0) levelColorClass = "bg-stone-300 text-stone-900";
                    else if (level === 1) levelColorClass = "bg-blue-300 text-stone-900";
                    else if (level === 2) levelColorClass = "bg-blue-400 text-stone-900";
                    else if (level === 3) levelColorClass = "bg-purple-300 text-stone-900";
                    else if (level === 4) levelColorClass = "bg-purple-400 text-stone-900";
                  }

                  return (
                    <div key={costume.id} className="relative w-[60px] h-[60px] bg-stone-100 dark:bg-stone-700 rounded-lg overflow-hidden border border-stone-200 dark:border-stone-600 shrink-0">
                      {costume.imageName && (
                        <img
                          src={getImageUrl(costume.imageName)}
                          alt={costume.name}
                          className={`w-full h-full object-cover ${!hasCostume ? 'opacity-30 grayscale' : ''}`}
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="absolute top-0.5 right-0.5 flex items-center gap-0.5 bg-black/60 rounded px-1 py-0.5 backdrop-blur-sm">
                        {hasExclusiveWeapon && <Swords className="w-3 h-3 text-amber-400" />}
                        <span className={`text-[10px] font-bold leading-none ${hasCostume ? levelColorClass : 'text-stone-300 bg-transparent'}`}>
                          {hasCostume ? `+${record.level}` : '-'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-900 flex flex-col">
      <main className="max-w-7xl mx-auto p-4 sm:p-6 flex-1 w-full flex flex-col gap-6">
        
        {/* Guild Selection Panel */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
          <div 
            className="px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors"
            onClick={() => setIsGuildSelectOpen(!isGuildSelectOpen)}
          >
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-200">
              {t('guilds.select_guild', '選擇公會')}
            </h2>
            {isGuildSelectOpen ? <ChevronUp className="w-5 h-5 text-stone-500" /> : <ChevronDown className="w-5 h-5 text-stone-500" />}
          </div>
          
          {isGuildSelectOpen && (
            <div className="p-6 border-t border-stone-200 dark:border-stone-700 flex flex-col gap-4">
              {tiers.map(tier => {
                const tierGuilds = sortedGuilds.filter(g => g.tier === tier);
                if (tierGuilds.length === 0) return null;
                
                return (
                  <div key={tier} className="flex items-center gap-4">
                    <div className="w-16 shrink-0 font-bold text-stone-500 dark:text-stone-400">
                      Tier {tier}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tierGuilds.map(g => {
                        const isSelected = selectedGuildId === g.id;
                        const tierColorClass = getTierColor(tier);
                        // Extract background class for selected state
                        const bgClass = tierColorClass.split(' ').find(c => c.startsWith('bg-') && !c.includes('/')) || 'bg-stone-200';
                        const darkBgClass = tierColorClass.split(' ').find(c => c.startsWith('dark:bg-') && !c.includes('/')) || 'dark:bg-stone-600';
                        const textClass = tierColorClass.split(' ').find(c => c.startsWith('text-')) || 'text-stone-800';
                        const darkTextClass = tierColorClass.split(' ').find(c => c.startsWith('dark:text-')) || 'dark:text-stone-200';
                        
                        return (
                          <button
                            key={g.id}
                            onClick={() => {
                              setSelectedGuildId(g.id);
                              setIsEditing(false);
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-all border ${
                              isSelected 
                                ? `${bgClass} ${darkBgClass} text-white border-transparent shadow-md` 
                                : `bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 ${textClass} ${darkTextClass}`
                            }`}
                          >
                            {g.name}
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

        {/* Guild Members Section */}
        {guild && (
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden flex flex-col flex-1">
            <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-700 flex justify-between items-center bg-stone-50 dark:bg-stone-700/50">
              <div className="flex items-baseline gap-3">
                <h2 className="text-xl font-bold text-stone-800 dark:text-stone-200">{guild.name}</h2>
                <span className="text-sm font-medium text-stone-500 dark:text-stone-400">
                  {members.length} / 30 {t('common.members', '成員')}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button 
                      onClick={handleEditCancel}
                      className="px-4 py-2 bg-stone-200 dark:bg-stone-600 text-stone-800 dark:text-stone-200 rounded-lg hover:bg-stone-300 dark:hover:bg-stone-500 transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      {t('common.cancel', '取消')}
                    </button>
                    <button 
                      onClick={handleEditSave}
                      disabled={isSaving}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? t('common.loading', '儲存中...') : t('common.save', '儲存')}
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleEditStart}
                    className="px-4 py-2 bg-stone-800 dark:bg-stone-600 text-white rounded-lg hover:bg-stone-700 dark:hover:bg-stone-500 transition-colors flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    {t('common.edit', '編輯')}
                  </button>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-b border-stone-200 dark:border-stone-700">
                    <th className="py-2 px-4 font-semibold w-48">{t('common.name', '名稱')}</th>
                    <th className="py-2 px-4 font-semibold w-32">{t('common.score', '分數')}</th>
                    <th className="py-2 px-4 font-semibold">{t('common.note', '備註')}</th>
                    <th className="py-2 px-4 font-semibold w-48 text-right">{t('common.actions', '操作')}</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <tr key={member.id} className="border-b border-stone-100 dark:border-stone-700/50 hover:bg-stone-50 dark:hover:bg-stone-700/30 transition-colors">
                      <td className="py-1.5 px-4 font-medium text-stone-800 dark:text-stone-200">
                        <div className="flex items-center gap-2">
                          {member.name}
                          {(member.role === 'leader' || member.role === 'coleader') && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${member.role === 'leader' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                              {member.role === 'leader' ? t('roles.leader') : t('roles.coleader')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-4">
                        {isEditing ? (
                          <input 
                            type="number"
                            value={editData[member.id]?.totalScore ?? ''}
                            onChange={e => setEditData(prev => ({
                              ...prev,
                              [member.id]: { ...prev[member.id], totalScore: Number(e.target.value) }
                            }))}
                            className="w-full px-2 py-1 border border-stone-300 dark:border-stone-600 rounded bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 text-sm focus:ring-1 focus:ring-amber-500 outline-none"
                          />
                        ) : (
                          <span className="text-stone-700 dark:text-stone-300 font-mono">
                            {member.totalScore?.toLocaleString() || '-'}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-4">
                        {isEditing ? (
                          <input 
                            type="text"
                            value={editData[member.id]?.note ?? ''}
                            onChange={e => setEditData(prev => ({
                              ...prev,
                              [member.id]: { ...prev[member.id], note: e.target.value }
                            }))}
                            className="w-full px-2 py-1 border border-stone-300 dark:border-stone-600 rounded bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 text-sm focus:ring-1 focus:ring-amber-500 outline-none"
                          />
                        ) : (
                          <span className="text-stone-500 dark:text-stone-400 text-sm">
                            {member.note || '-'}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleCompare(member.id)}
                            className={`p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-medium ${
                              compareMemberIds.includes(member.id) 
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' 
                                : 'text-stone-500 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-600'
                            }`}
                          >
                            {compareMemberIds.includes(member.id) ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                            {t('common.compare', '比較')}
                          </button>
                          <button
                            onClick={() => setTrainingInfoMemberId(member.id)}
                            className="px-2 py-1.5 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium rounded hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"
                          >
                            {t('common.training_info', '練度資訊')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-stone-500 dark:text-stone-400">
                        {t('common.noData', '無資料')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Training Info Modal (Single or Compare) */}
      {(trainingInfoMemberId || compareMemberIds.length > 0) && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setTrainingInfoMemberId(null);
            setCompareMemberIds([]);
          }}
        >
          <div 
            className={`bg-stone-100 dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col overflow-hidden ${
              compareMemberIds.length > 0 ? 'max-w-6xl' : 'max-w-3xl'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-700 flex justify-between items-center bg-white dark:bg-stone-800">
              <h2 className="text-xl font-bold text-stone-800 dark:text-stone-200">
                {compareMemberIds.length > 0 ? t('common.compare_mode', '並列比較模式') : t('common.training_info', '練度資訊')}
              </h2>
              <button 
                onClick={() => {
                  setTrainingInfoMemberId(null);
                  setCompareMemberIds([]);
                }} 
                className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-stone-500 dark:text-stone-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {compareMemberIds.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {compareMemberIds.map(id => (
                    <div key={id} className="flex flex-col">
                      {renderTrainingInfo(id)}
                    </div>
                  ))}
                </div>
              ) : trainingInfoMemberId ? (
                renderTrainingInfo(trainingInfoMemberId)
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
