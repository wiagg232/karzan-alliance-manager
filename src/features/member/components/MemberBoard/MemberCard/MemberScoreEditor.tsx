// src/components/MemberBoard/MemberCard/MemberScoreEditor.tsx
import { useRef, useEffect, useState } from 'react';
import type { Member } from '@entities/member/types';
import { useMemberBoardStore } from '../store/useMemberBoardStore';

type Props = {
    member: Member;
    disabled?: boolean;     // 新增：用來從 MemberCard 傳入是否禁用
};

export default function MemberScoreEditor({ member, disabled = false }: Props) {
    const { updateMember } = useMemberBoardStore();
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(member.totalScore?.toString() || '0');
    const inputRef = useRef<HTMLInputElement>(null);

    // 當成員資訊變更（如移動公會）時，關閉編輯狀態
    useEffect(() => {
        setEditing(false);
    }, [member.guildId, member.name]);

    // 多選模式強制關閉編輯狀態
    useEffect(() => {
        if (disabled && editing) {
            setEditing(false);
            // 可選擇是否要還原 value，這裡選擇保持目前輸入的值
            // 如果想強制還原成原始值，可以加上：setValue(member.totalScore?.toString() || '0');
        }
    }, [disabled]);

    // 進入編輯模式時自動 focus + select
    useEffect(() => {
        if (editing && inputRef.current && !disabled) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editing, disabled]);

    const handleSave = () => {
        if (!editing || disabled) return;

        setEditing(false);

        const num = value.trim() === '' ? 0 : parseFloat(value);

        if (!isNaN(num) && num !== member.totalScore) {
            updateMember(member.id!, { totalScore: num });
        } else if (isNaN(num)) {
            setValue(member.totalScore?.toString() || '0');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            setValue(member.totalScore?.toString() || '0');
            setEditing(false);
        }
    };

    // 點擊數字區域時的處理
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!disabled) {
            setEditing(true);
        }
    };

    return (
        <div className="min-w-[40px] text-right relative z-10">
            {editing && !disabled ? (
                <input
                    ref={inputRef}
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="
                        w-16 text-[16px] bg-gray-800 border border-gray-600 rounded px-1 py-0.5 
                        outline-none focus:border-emerald-500 text-emerald-300 text-right
                    "
                    step="0.1"
                    min="0"
                    disabled={disabled}           // 額外保險
                />
            ) : (
                <div
                    className={`
                        text-[16px] font-medium transition-colors
                        ${disabled
                            ? 'hover:text-emerald-300 text-emerald-400'
                            : 'cursor-pointer hover:text-emerald-300 text-emerald-400'
                        }
                    `}
                    onClick={handleClick}
                >
                    {member.totalScore ?? 0}
                </div>
            )}
        </div>
    );
}