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
            label: 'Ask',
            onClick: () => { onChat(selectedText); onClose(); },
        },
        {
            icon: FileText,
            label: 'Add to notes',
            onClick: () => { onAddToNotes(selectedText); onClose(); },
        },
        {
            icon: Lightbulb,
            label: 'Explain',
            onClick: () => { onExplain(selectedText); onClose(); },
        },
        {
            icon: BookOpen,
            label: 'Define',
            onClick: () => { onDefine(selectedText); onClose(); },
        },
    ];

    return (
        <div
            ref={menuRef}
            style={{
                ...menuStyle,
                background: 'var(--lumina-surface)',
                borderRadius: 12,
                boxShadow:
                    '0 12px 32px rgba(15,15,20,0.14), 0 0 0 1px rgba(15,15,20,0.06)',
                overflow: 'hidden',
                minWidth: 200,
            }}
            className={cn('animate-in fade-in zoom-in-95 duration-150')}
        >
            <div
                className="flex items-center justify-between"
                style={{
                    padding: '8px 10px',
                    background: 'var(--lumina-surface-alt)',
                    borderBottom: '1px solid var(--lumina-divider)',
                }}
            >
                <span
                    className="italic truncate"
                    style={{
                        fontSize: 11.5,
                        color: 'var(--lumina-text-faint)',
                        maxWidth: 150,
                    }}
                >
                    “{selectedText.length > 30 ? selectedText.slice(0, 30) + '…' : selectedText}”
                </span>
                <button
                    onClick={onClose}
                    className="flex items-center justify-center"
                    style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: 'transparent',
                        color: 'var(--lumina-text-faint)',
                        border: 'none',
                    }}
                >
                    <X size={12} />
                </button>
            </div>
            <div style={{ padding: 4 }}>
                {actions.map((action) => (
                    <button
                        key={action.label}
                        onClick={action.onClick}
                        className="w-full flex items-center gap-2 transition-colors"
                        style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--lumina-text-dim)',
                            fontSize: 13,
                            fontWeight: 500,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--lumina-surface-alt)';
                            e.currentTarget.style.color = 'var(--lumina-text)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--lumina-text-dim)';
                        }}
                    >
                        <action.icon size={14} />
                        <span>{action.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
