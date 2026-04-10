import React, { useState } from 'react';
import { useAppContext } from '@/store';
import { Trash2 } from 'lucide-react';
import ConfirmModal from '@shared/ui/ConfirmModal';
import { useTranslation } from 'react-i18next';

export default function RemoveDuplicatesTool({
  isProcessing,
  setIsProcessing,
}: {
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
}) {
  const { t } = useTranslation(['admin', 'translation']);
  const { db, deleteMember } = useAppContext();

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    isDanger: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDanger: false,
  });

  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  const handleRemoveDuplicates = () => {
    setConfirmModal({
      isOpen: true,
      title: t('tools.remove_duplicates'),
      message: t('tools.confirm_remove_duplicates'),
      isDanger: true,
      onConfirm: async () => {
        setIsProcessing(true);
        closeConfirmModal();
        const membersByGuild: Record<string, any[]> = {};
        for (const memberId in db.members) {
          const member = db.members[memberId];
          if (!membersByGuild[member.guildId]) {
            membersByGuild[member.guildId] = [];
          }
          membersByGuild[member.guildId].push({ id: memberId, ...member });
        }

        for (const guildId in membersByGuild) {
          const members = membersByGuild[guildId];
          const membersByName: Record<string, any[]> = {};
          for (const member of members) {
            if (!membersByName[member.name]) {
              membersByName[member.name] = [];
            }
            membersByName[member.name].push(member);
          }

          for (const name in membersByName) {
            const duplicateMembers = membersByName[name];
            if (duplicateMembers.length > 1) {
              const membersWithCostumes = duplicateMembers.filter(m => Object.keys(m.records || {}).length > 0);
              if (membersWithCostumes.length <= 1) {
                const membersToDelete = duplicateMembers.filter(m => Object.keys(m.records || {}).length === 0);
                if (membersWithCostumes.length === 1) {
                  for (const member of membersToDelete) {
                    await deleteMember(member.id);
                  }
                } else {
                  for (let i = 1; i < membersToDelete.length; i++) {
                    await deleteMember(membersToDelete[i].id);
                  }
                }
              } else {
                const membersByCostume: Record<string, any[]> = {};
                for (const member of membersWithCostumes) {
                  const costumeKey = JSON.stringify(member.records);
                  if (!membersByCostume[costumeKey]) {
                    membersByCostume[costumeKey] = [];
                  }
                  membersByCostume[costumeKey].push(member);
                }

                for (const costumeKey in membersByCostume) {
                  const sameCostumeMembers = membersByCostume[costumeKey];
                  for (let i = 1; i < sameCostumeMembers.length; i++) {
                    await deleteMember(sameCostumeMembers[i].id);
                  }
                }
              }
            }
          }
        }
        setIsProcessing(false);
      },
    });
  };

  return (
    <>
      <div className="bg-stone-50 dark:bg-stone-700 p-8 rounded-2xl border border-stone-200 dark:border-stone-600 flex flex-col items-center justify-center text-center">
        <div className="p-4 bg-red-100 dark:bg-red-900/50 rounded-full text-red-600 mb-4">
          <Trash2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-stone-800 dark:text-stone-200 mb-2">{t('tools.remove_duplicates')}</h3>
        <p className="text-stone-500 dark:text-stone-400 mb-6 max-w-md">
          {t('tools.remove_duplicates_desc')}
        </p>
        <button
          onClick={handleRemoveDuplicates}
          disabled={isProcessing}
          className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? t('common.processing') : t('tools.start_remove')}
        </button>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
        isDanger={confirmModal.isDanger}
      />
    </>
  );
}
