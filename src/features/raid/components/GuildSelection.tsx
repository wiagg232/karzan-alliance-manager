import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface GuildSelectionProps {
  guildsByTier: Record<number, any[]>;
  selectedGuildIds: string[];
  handleGuildToggle: (guildId: string) => void;
  isComparisonMode: boolean;
  getTierColorActive: (tier: number) => string;
  guildMemberCounts?: Record<string, number>;
}

const MAX_MEMBERS = 30;

const GuildSelection: React.FC<GuildSelectionProps> = ({
  guildsByTier,
  selectedGuildIds,
  handleGuildToggle,
  isComparisonMode,
  getTierColorActive,
  guildMemberCounts = {},
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const lines: string[] = [];
    Object.entries(guildsByTier)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([tierStr, guilds]) => {
        const tier = Number(tierStr);
        const missingGuilds = guilds
          .map(guild => {
            const count = guildMemberCounts[guild.id!] || 0;
            const missing = MAX_MEMBERS - count;
            return missing > 0 ? `${guild.name}(${missing})` : null;
          })
          .filter(Boolean);
        
        if (missingGuilds.length > 0) {
          lines.push(`T${tier}: ${missingGuilds.join('、')}`);
        }
      });
    
    const text = lines.join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-4">
      <div className="space-y-1">
        {Object.entries(guildsByTier)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([tierStr, guilds]) => {
            const tier = Number(tierStr);
            return (
              <div key={tier} className="flex items-center gap-2">
                <div className="w-6 flex-shrink-0 text-[10px] font-bold text-stone-400 dark:text-stone-500">
                  T{tier}
                </div>
                <div className="flex flex-wrap gap-1 flex-1">
                  {guilds.map(guild => {
                    const isSelected = selectedGuildIds.includes(guild.id!);
                    const memberCount = guildMemberCounts[guild.id!] || 0;
                    const missing = MAX_MEMBERS - memberCount;
                    return (
                      <button
                        key={guild.id}
                        onClick={() => handleGuildToggle(guild.id!)}
                        className={`px-2.5 py-1 rounded text-[12px] font-medium transition-all border ${
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
                            className="mr-1.5 w-3.5 h-3.5"
                          />
                        )}
                        {guild.name}
                        {missing > 0 && <span className="ml-1 text-[10px] opacity-80">({missing})</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        
        <div className="mt-2 flex justify-start">
          <button
            onClick={handleCopy}
            className="p-1.5 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition-colors"
            title="複製缺少人數"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuildSelection;
