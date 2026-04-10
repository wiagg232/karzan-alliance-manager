import React, { useState } from 'react';
import { useAppContext } from '@/store';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type MigrationModal = {
  isOpen: boolean;
  added: { name: string; toGuild: string; role: string; toGuildId: string }[];
  migrated: { id: string; name: string; fromGuild: string; toGuild: string; role: string; toGuildId: string }[];
  archived: { id: string; name: string; fromGuild: string; fromGuildId: string }[];
};

export default function AutoTransferTool({
  isProcessing,
  setIsProcessing,
}: {
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
}) {
  const { t } = useTranslation(['admin', 'translation']);
  const { db, addMember, updateMember, archiveMember, fetchAllMembers, showToast } = useAppContext();

  const [migrationModal, setMigrationModal] = useState<MigrationModal>({
    isOpen: false,
    added: [],
    migrated: [],
    archived: [],
  });

  const closeMigrationModal = () => setMigrationModal(prev => ({ ...prev, isOpen: false }));

  const handleAutoTransfer = async () => {
    setIsProcessing(true);
    try {
      await fetchAllMembers();

      const macroId = `AKfycbyvqpgrZ_BMU94i6llQF9HjP89y8yAS0EyRsPUT1fncmsdZg-8GeyVyUHp0DunJUwezqQ`;
      const response = await fetch(`https://script.google.com/macros/s/${macroId}/exec`, {
        method: "GET",
        mode: "cors",
      });
      const { guildList, guildLeaderList } = (await response.json()).data;

      const guildNameList = Object.keys(guildList);
      const activeMemberList: string[] = [];
      const memberList = Object.values(db.members);
      const guildListInDB = Object.values(db.guilds);

      const added: MigrationModal['added'] = [];
      const migrated: MigrationModal['migrated'] = [];
      const archived: MigrationModal['archived'] = [];

      for (const guildName of guildNameList) {
        const memberNames = guildList[guildName];
        const guildId = guildListInDB.find((guild) => guild.name === guildName)?.id;

        if (!guildId) continue;

        for (let memberName of memberNames) {
          memberName = memberName.replace(/@/, "");
          const member = memberList.find((m) => m.name === memberName);
          const role = guildLeaderList[`@${memberName}`]?.replaceAll(/<|>/g, "") ?? "member";

          if (!member && !memberName.match(/Vacancy/) && memberName) {
            added.push({ name: memberName, toGuild: guildName, role, toGuildId: guildId });
          } else if (member && guildId !== member.guildId) {
            const fromGuildName = guildListInDB.find(g => g.id === member.guildId)?.name || t('common.unknown');
            migrated.push({ id: member.id, name: memberName, fromGuild: fromGuildName, toGuild: guildName, role, toGuildId: guildId });
          }

          if (memberName && !memberName.match(/Vacancy/)) {
            activeMemberList.push(memberName);
          }
        }
      }

      const membersToArchive = memberList.filter((member) => !activeMemberList.includes(member.name) && member.status !== 'archived');

      for (const member of membersToArchive) {
        const fromGuildName = guildListInDB.find(g => g.id === member.guildId)?.name || t('common.unknown');
        archived.push({ id: member.id, name: member.name, fromGuild: fromGuildName, fromGuildId: member.guildId });
      }

      setMigrationModal({ isOpen: true, added, migrated, archived });
    } catch (error) {
      console.error("Auto transfer failed:", error);
      showToast(t('tools.auto_transfer_failed'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeMigration = async () => {
    setIsProcessing(true);
    try {
      await Promise.all([
        ...migrationModal.added.map(item => addMember(item.toGuildId, item.name, item.role as any, '')),
        ...migrationModal.migrated.map(item => updateMember(item.id, { guildId: item.toGuildId, role: item.role as any })),
        ...migrationModal.archived.map(item => archiveMember(item.id, item.fromGuildId, t('tools.not_in_list_reason'))),
      ]);
      showToast(t('tools.auto_transfer_success'), 'success');
      closeMigrationModal();
    } catch (error) {
      console.error("Migration execution failed:", error);
      showToast(t('tools.auto_transfer_failed'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="bg-stone-50 dark:bg-stone-700 p-8 rounded-2xl border border-stone-200 dark:border-stone-600 flex flex-col items-center justify-center text-center">
        <div className="p-4 bg-amber-100 dark:bg-amber-900/50 rounded-full text-amber-600 mb-4">
          <RefreshCw className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-stone-800 dark:text-stone-200 mb-2">{t('tools.auto_transfer')}</h3>
        <p className="text-stone-500 dark:text-stone-400 mb-6 max-w-md">
          {t('tools.auto_transfer_desc')}
        </p>
        <button
          onClick={handleAutoTransfer}
          disabled={isProcessing}
          className="px-8 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? t('common.processing') : t('tools.start_auto_transfer')}
        </button>
      </div>

      {migrationModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-stone-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
            <div className="p-6 border-b border-stone-200 dark:border-stone-700">
              <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
                {t('tools.migration_preview')}
              </h2>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {migrationModal.added.length === 0 && migrationModal.migrated.length === 0 && migrationModal.archived.length === 0 ? (
                <div className="text-center py-8 text-stone-500 dark:text-stone-400">
                  {t('tools.migration_no_changes')}
                </div>
              ) : (
                <>
                  {migrationModal.added.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-3">
                        {t('tools.migration_added', { count: migrationModal.added.length })}
                      </h3>
                      <div className="bg-stone-50 dark:bg-stone-900/50 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                            <tr>
                              <th className="px-4 py-2 font-medium">{t('members.member_name')}</th>
                              <th className="px-4 py-2 font-medium">{t('tools.migration_to')}</th>
                              <th className="px-4 py-2 font-medium">{t('members.role')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                            {migrationModal.added.map((item, i) => (
                              <tr key={i} className="text-stone-800 dark:text-stone-300">
                                <td className="px-4 py-2 font-medium">{item.name}</td>
                                <td className="px-4 py-2">{item.toGuild}</td>
                                <td className="px-4 py-2">{t(`roles.${item.role}`)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {migrationModal.migrated.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400 mb-3">
                        {t('tools.migration_migrated', { count: migrationModal.migrated.length })}
                      </h3>
                      <div className="bg-stone-50 dark:bg-stone-900/50 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                            <tr>
                              <th className="px-4 py-2 font-medium">{t('members.member_name')}</th>
                              <th className="px-4 py-2 font-medium">{t('tools.migration_from')}</th>
                              <th className="px-4 py-2 font-medium">{t('tools.migration_to')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                            {migrationModal.migrated.map((item, i) => (
                              <tr key={i} className="text-stone-800 dark:text-stone-300">
                                <td className="px-4 py-2 font-medium">{item.name}</td>
                                <td className="px-4 py-2">{item.fromGuild}</td>
                                <td className="px-4 py-2">{item.toGuild}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {migrationModal.archived.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-3">
                        {t('tools.migration_archived', { count: migrationModal.archived.length })}
                      </h3>
                      <div className="bg-stone-50 dark:bg-stone-900/50 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                            <tr>
                              <th className="px-4 py-2 font-medium">{t('members.member_name')}</th>
                              <th className="px-4 py-2 font-medium">{t('tools.migration_from')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                            {migrationModal.archived.map((item, i) => (
                              <tr key={i} className="text-stone-800 dark:text-stone-300">
                                <td className="px-4 py-2 font-medium">{item.name}</td>
                                <td className="px-4 py-2">{item.fromGuild}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-6 border-t border-stone-200 dark:border-stone-700 flex justify-end gap-3">
              <button
                onClick={closeMigrationModal}
                disabled={isProcessing}
                className="px-6 py-2 rounded-xl font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
              >
                {t('tools.migration_cancel')}
              </button>
              <button
                onClick={executeMigration}
                disabled={isProcessing || (migrationModal.added.length === 0 && migrationModal.migrated.length === 0 && migrationModal.archived.length === 0)}
                className="px-6 py-2 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('common.processing')}
                  </>
                ) : (
                  t('tools.migration_confirm')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
