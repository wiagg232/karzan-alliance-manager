import React, { useState } from 'react';
import { Search, Pencil, Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Member } from '@/entities/member/types';

interface MemberRaidRecord {
  id?: string;
  season_id: string;
  member_id: string;
  score: number;
  note: string;
}

interface GuildRaidTableProps {
  guildId: string;
  guildName: string;
  sortedMembers: Member[];
  records: Record<string, MemberRaidRecord>;
  draftRecords: Record<string, MemberRaidRecord>;
  isComparisonMode: boolean;
  loading: boolean;
  saving: boolean;
  onSort: (key: 'default' | 'score') => void;
  onRecordChange: (memberId: string, field: 'score' | 'note', value: string | number) => void;
  onMemberClick: (member: Member) => void;
  onSave: (guildId: string) => Promise<void>;
  onCancel: (guildId: string) => void;
}

export default function GuildRaidTable({
  guildId,
  guildName,
  sortedMembers,
  records,
  draftRecords,
  isComparisonMode,
  loading,
  saving,
  onSort,
  onRecordChange,
  onMemberClick,
  onSave,
  onCancel
}: GuildRaidTableProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    await onSave(guildId);
    setIsEditing(false);
  };

  const handleCancel = () => {
    onCancel(guildId);
    setIsEditing(false);
  };

  return (
    <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 flex flex-col overflow-hidden">
      <div className="bg-stone-50 dark:bg-stone-700 px-4 py-3 border-b border-stone-200 dark:border-stone-600 font-bold text-stone-800 dark:text-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{guildName}</span>
          <span className="text-xs font-normal text-stone-500 dark:text-stone-400">({sortedMembers.length} {t('common.member', '成員')})</span>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button onClick={handleCancel} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-stone-200 dark:bg-stone-600 text-stone-700 dark:text-stone-200 rounded hover:bg-stone-300 dark:hover:bg-stone-500 transition-colors">
                <X className="w-4 h-4" />
                {t('common.cancel', '取消')}
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors disabled:opacity-50">
                <Save className="w-4 h-4" />
                {saving ? t('common.saving', '儲存中...') : t('common.save', '儲存')}
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">
              <Pencil className="w-4 h-4" />
              {t('common.edit', '編輯')}
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-8 text-center text-stone-500">{t('common.loading', '載入中...')}</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-stone-50 dark:bg-stone-700 z-10 shadow-sm">
              <tr>
                <th 
                  className="p-3 text-xs font-semibold text-stone-600 dark:text-stone-300 border-b border-stone-200 dark:border-stone-600 cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-600"
                  onClick={() => onSort('default')}
                >
                  {t('common.member', '成員')}
                </th>
                <th 
                  className="p-3 text-xs font-semibold text-stone-600 dark:text-stone-300 border-b border-stone-200 dark:border-stone-600 cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-600 w-24"
                  onClick={() => onSort('score')}
                >
                  {t('raid.column_score', '分數')}
                </th>
                {!isComparisonMode && (
                  <th className="p-3 text-xs font-semibold text-stone-600 dark:text-stone-300 border-b border-stone-200 dark:border-stone-600">
                    {t('raid.column_note', '備註')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map(member => {
                const record = draftRecords[member.id!] || records[member.id!] || { score: 0, note: '' };
                const isDirty = !!draftRecords[member.id!];

                return (
                  <tr key={member.id} className={`border-b border-stone-100 dark:border-stone-700/50 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors ${isDirty ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                    <td className="py-1 px-2">
                      <button 
                        onClick={() => onMemberClick(member)}
                        className="flex items-center gap-2 text-sm font-medium text-stone-800 dark:text-stone-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-left"
                      >
                        <Search className="w-3.5 h-3.5 text-stone-400" />
                        <span className="truncate max-w-[120px]">{member.name}</span>
                      </button>
                    </td>
                    <td className="py-1 px-2">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="10000"
                          value={record.score || ''}
                          onChange={(e) => onRecordChange(member.id!, 'score', e.target.value)}
                          className={`w-full px-2 py-1 text-sm border rounded bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-indigo-500 outline-none ${isDirty ? 'border-amber-300 dark:border-amber-600' : 'border-stone-300 dark:border-stone-600'}`}
                        />
                      ) : (
                        <div className="px-2 py-1 text-sm text-stone-800 dark:text-stone-200">
                          {record.score || 0}
                        </div>
                      )}
                    </td>
                    {!isComparisonMode && (
                      <td className="py-1 px-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={record.note || ''}
                            onChange={(e) => onRecordChange(member.id!, 'note', e.target.value)}
                            className={`w-full px-2 py-1 text-sm border rounded bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-indigo-500 outline-none ${isDirty ? 'border-amber-300 dark:border-amber-600' : 'border-stone-300 dark:border-stone-600'}`}
                          />
                        ) : (
                          <div className="px-2 py-1 text-sm text-stone-800 dark:text-stone-200 truncate">
                            {record.note || '-'}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
