import React, { useState } from 'react';
import { X, Search, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MemberSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MemberSearchModal({ isOpen, onClose }: MemberSearchModalProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Mock data for UI demonstration
  const mockResults = [
    { id: '1', name: 'PlayerOne', guildName: 'Alpha Guild', guildId: 'g1' },
    { id: '2', name: 'PlayerTwo', guildName: 'Beta Team', guildId: 'g2' },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 bg-stone-900/60 backdrop-blur-sm pt-[80px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-stone-50">
          <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            <Search className="w-5 h-5 text-stone-500" />
            {t('dashboard.global_search_member', '全域搜尋成員')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-6">
          {/* Search Input Area */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-stone-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('dashboard.enter_member_name', '請輸入成員名稱...')}
                className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-stone-50 focus:bg-white"
              />
            </div>
            <button className="px-6 py-2 bg-stone-800 text-white font-medium rounded-xl hover:bg-stone-700 transition-colors shadow-sm active:scale-95">
              {t('common.search', '搜尋')}
            </button>
          </div>

          {/* Results Area */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-1">
              {t('dashboard.search_results', '搜尋結果')}
            </h3>
            
            <div className="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100">
              {mockResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-medium text-stone-800">{result.name}</span>
                    <span className="text-xs text-stone-500 mt-0.5">{result.guildName}</span>
                  </div>
                  <button 
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                    title={t('dashboard.go_to_guild', '前往公會')}
                  >
                    {t('dashboard.view_guild', '查看公會')}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {/* Empty state (hidden for now since we have mock data) */}
              {/* <div className="p-8 text-center text-stone-500 flex flex-col items-center gap-2">
                <Search className="w-8 h-8 text-stone-300" />
                <p>{t('dashboard.no_results', '找不到符合的成員')}</p>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
