import { useState } from 'react';
import { Wand2, FileSpreadsheet, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AutoTransferTool from './tools/AutoTransferTool';
import RemoveDuplicatesTool from './tools/RemoveDuplicatesTool';
import CsvTool from './tools/CsvTool';
import BackupRestoreTool from './tools/BackupRestoreTool';

export default function ToolsManager() {
  const { t } = useTranslation(['admin', 'translation']);
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-2xl font-bold mb-6 text-stone-800 dark:text-stone-200 flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-amber-600" />
          {t('nav.tools')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <AutoTransferTool isProcessing={isProcessing} setIsProcessing={setIsProcessing} />
          <RemoveDuplicatesTool isProcessing={isProcessing} setIsProcessing={setIsProcessing} />
        </div>
      </section>

      <div className="border-t border-stone-100 dark:border-stone-700 pt-12 mt-12">
        <section>
          <h2 className="text-2xl font-bold mb-6 text-stone-800 dark:text-stone-200 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            {t('tools.csv_batch_processing')}
          </h2>
          <CsvTool isProcessing={isProcessing} setIsProcessing={setIsProcessing} />
        </section>
      </div>

      <div className="border-t border-stone-100 dark:border-stone-700 pt-12">
        <section>
          <h2 className="text-2xl font-bold mb-6 text-stone-800 dark:text-stone-200 flex items-center gap-2">
            <Save className="w-6 h-6 text-amber-600" />
            {t('nav.backup_restore')}
          </h2>
          <BackupRestoreTool isProcessing={isProcessing} setIsProcessing={setIsProcessing} />
        </section>
      </div>
    </div>
  );
}
