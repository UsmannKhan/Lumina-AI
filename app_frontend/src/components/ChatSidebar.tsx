'use client';

import React, { useState } from 'react';
import { Chat } from '@/types';
import { PlusIcon, TrashIcon, MessageIcon, ChevronLeftIcon, YoutubeIcon } from './Icons';
import Logo from './Logo';
import Button from './Button';
import clsx from 'clsx';

interface ChatSidebarProps {
  chats: Chat[];
  activeChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: number) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function ChatSidebar({
  chats,
  activeChat,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onLogout,
  isCollapsed,
  onToggleCollapse,
}: ChatSidebarProps) {
  const [hoveredChat, setHoveredChat] = useState<number | null>(null);

  return (
    <aside
      className={clsx(
        'h-screen flex flex-col border-r border-white/[0.06] transition-all duration-300 ease-out glass-darker',
        isCollapsed ? 'w-20' : 'w-80'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className={clsx('flex items-center', isCollapsed ? 'justify-center' : 'justify-between')}>
          {!isCollapsed && <Logo size="sm" />}
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg hover:bg-white/[0.05] text-void-400 hover:text-void-200 transition-colors"
          >
            <ChevronLeftIcon 
              size={18} 
              className={clsx('transition-transform duration-300', isCollapsed && 'rotate-180')} 
            />
          </button>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={onNewChat}
          variant="primary"
          size="md"
          className={clsx('w-full', isCollapsed && 'px-3')}
        >
          <PlusIcon size={18} />
          {!isCollapsed && <span>New Analysis</span>}
        </Button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {!isCollapsed && chats.length > 0 && (
          <p className="text-xs font-medium text-void-500 uppercase tracking-wider px-3 mb-3">
            Your Sessions
          </p>
        )}
        
        <div className="space-y-1 stagger-children">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={clsx(
                'group relative rounded-xl transition-all duration-200 cursor-pointer',
                activeChat?.id === chat.id
                  ? 'bg-ember-500/10 border border-ember-500/20'
                  : 'hover:bg-white/[0.04] border border-transparent'
              )}
              onMouseEnter={() => setHoveredChat(chat.id)}
              onMouseLeave={() => setHoveredChat(null)}
              onClick={() => onSelectChat(chat)}
            >
              <div className={clsx('flex items-center gap-3 p-3', isCollapsed && 'justify-center')}>
                <div className={clsx(
                  'flex-shrink-0 rounded-lg p-2',
                  activeChat?.id === chat.id ? 'bg-ember-500/20' : 'bg-white/[0.05]'
                )}>
                  <YoutubeIcon 
                    size={16} 
                    className={activeChat?.id === chat.id ? 'text-ember-400' : 'text-void-400'} 
                  />
                </div>
                
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className={clsx(
                      'text-sm font-medium truncate',
                      activeChat?.id === chat.id ? 'text-ember-300' : 'text-void-200'
                    )}>
                      {chat.session_name.length > 30 
                        ? chat.session_name.substring(0, 30) + '...' 
                        : chat.session_name}
                    </p>
                  </div>
                )}
              </div>

              {/* Delete button */}
              {!isCollapsed && hoveredChat === chat.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                >
                  <TrashIcon size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {chats.length === 0 && !isCollapsed && (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.03] flex items-center justify-center">
              <MessageIcon size={28} className="text-void-500" />
            </div>
            <p className="text-void-400 text-sm">No sessions yet</p>
            <p className="text-void-500 text-xs mt-1">Start by analyzing a video</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.06]">
        <Button
          onClick={onLogout}
          variant="ghost"
          size="sm"
          className={clsx('w-full text-void-400 hover:text-red-400', isCollapsed && 'px-3')}
        >
          {!isCollapsed && <span>Sign Out</span>}
          {isCollapsed && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          )}
        </Button>
      </div>
    </aside>
  );
}
