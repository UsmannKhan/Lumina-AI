'use client';

import React, { useEffect, useRef } from 'react';
import { MessageSquare, FileText, Lightbulb, BookOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectionBubbleMenuProps {
    selectedText: string;
    position: { x: number; y: number };
    onChat: (text: string) => void;
    onAddToNotes: (text: string) => void;
    onExplain: (text: string) => void;
    onDefine: (text: string) => void;
    onClose: () => void;
}

export default function SelectionBubbleMenu({
    selectedText,
    position,
    onChat,
    onAddToNotes,
    onExplain,
    onDefine,
    onClose
}: SelectionBubbleMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        // Close on escape
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        // Delay adding listener to prevent immediate close
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }, 100);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // Calculate menu position (adjust to stay within viewport)
    const menuStyle: React.CSSProperties = {
        position: 'fixed',
        left: Math.max(10, Math.min(position.x - 100, window.innerWidth - 220)),
        top: Math.max(10, position.y - 50),
        zIndex: 9999
    };

    const actions = [
        {
            icon: MessageSquare,
            label: 'Chat',
            onClick: () => { onChat(selectedText); onClose(); },
            color: 'text-blue-600 hover:bg-blue-50'
        },
        {
            icon: FileText,
            label: 'Add to Notes',
            onClick: () => { onAddToNotes(selectedText); onClose(); },
            color: 'text-green-600 hover:bg-green-50'
        },
        {
            icon: Lightbulb,
            label: 'Explain',
            onClick: () => { onExplain(selectedText); onClose(); },
            color: 'text-amber-600 hover:bg-amber-50'
        },
        {
            icon: BookOpen,
            label: 'Define',
            onClick: () => { onDefine(selectedText); onClose(); },
            color: 'text-purple-600 hover:bg-purple-50'
        }
    ];

    return (
        <div
            ref={menuRef}
            style={menuStyle}
            className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
            {/* Header with selected text preview */}
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500 truncate max-w-[150px]">
                    "{selectedText.length > 30 ? selectedText.slice(0, 30) + '...' : selectedText}"
                </span>
                <button
                    onClick={onClose}
                    className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Action buttons */}
            <div className="p-1">
                {actions.map((action) => (
                    <button
                        key={action.label}
                        onClick={action.onClick}
                        className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                            action.color
                        )}
                    >
                        <action.icon size={16} />
                        <span>{action.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
