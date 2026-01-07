'use client';

import React, { useState } from 'react';
import { Chat } from '@/types';
import { cn } from '@/lib/utils';
import { Plus, Trash2, MessageSquare, ChevronLeft, Youtube, LogOut, Sparkles } from 'lucide-react';

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

  // When collapsed, render just a floating button
  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="fixed left-3 2xl:left-6 top-2 2xl:top-5 z-50 p-1.5 2xl:p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-white/40 transition-all"
        title="Show sidebar"
      >
        <ChevronLeft className="w-4 h-4 2xl:w-5 2xl:h-5 rotate-180" />
      </button>
    );
  }

  return (
    <aside
      className="h-screen flex flex-col w-52 2xl:w-72 relative"
      style={{
        backdropFilter: 'blur(40px) saturate(200%)',
        WebkitBackdropFilter: 'blur(40px) saturate(200%)',
        background: 'rgba(255, 255, 255, 0.35)',
        borderRight: '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: `
          16px 0 48px rgba(0, 0, 0, 0.03),
          inset -1px 0 0 rgba(255, 255, 255, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.5)
        `,
      }}
    >
      {/* Header */}
      <div
        className="p-3 2xl:p-4"
        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.4)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 2xl:w-9 2xl:h-9 rounded-lg 2xl:rounded-xl flex items-center justify-center"
              style={{
                background: '#0C115B',
                boxShadow: '0 4px 12px rgba(12, 17, 91, 0.3)',
              }}
            >
              <Sparkles className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
            </div>
            <span className="font-semibold text-sm 2xl:text-base text-gray-800">Lumina AI</span>
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white/40 transition-colors"
            title="Hide sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-2 2xl:p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-1.5 2xl:gap-2 py-2 2xl:py-3 rounded-lg 2xl:rounded-xl text-white text-sm 2xl:text-base font-semibold transition-all hover:-translate-y-0.5 hover:shadow-xl"
          style={{
            background: '#0C115B',
            boxShadow: '0 4px 16px rgba(12, 17, 91, 0.35)',
          }}
        >
          <Plus className="w-4 h-4 2xl:w-5 2xl:h-5" />
          <span>New Analysis</span>
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2 2xl:px-3 py-1.5 2xl:py-2">
        {chats.length > 0 && (
          <p className="text-[10px] 2xl:text-xs font-medium text-gray-500 uppercase tracking-wider px-2 2xl:px-3 mb-2 2xl:mb-3">
            Your Sessions
          </p>
        )}

        <div className="space-y-1">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                'group relative rounded-lg 2xl:rounded-xl transition-all duration-200 cursor-pointer'
              )}
              style={{
                background: activeChat?.id === chat.id ? 'rgba(255, 255, 255, 0.6)' : 'transparent',
                border: activeChat?.id === chat.id ? '1px solid rgba(12, 17, 91, 0.15)' : '1px solid transparent',
                boxShadow: activeChat?.id === chat.id ? '0 4px 12px rgba(0, 0, 0, 0.04)' : 'none',
              }}
              onMouseEnter={() => setHoveredChat(chat.id)}
              onMouseLeave={() => setHoveredChat(null)}
              onClick={() => onSelectChat(chat)}
            >
              <div className="flex items-center gap-2 2xl:gap-3 p-2 2xl:p-3">
                <div
                  className="flex-shrink-0 rounded-md 2xl:rounded-lg p-1.5 2xl:p-2"
                  style={{
                    background: activeChat?.id === chat.id ? 'rgba(12, 17, 91, 0.1)' : 'rgba(255, 255, 255, 0.5)',
                  }}
                >
                  <Youtube
                    className={cn(
                      'w-3 h-3 2xl:w-4 2xl:h-4',
                      activeChat?.id === chat.id ? 'text-[#0C115B]' : 'text-gray-500'
                    )}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-xs 2xl:text-sm font-medium truncate',
                    activeChat?.id === chat.id ? 'text-[#0C115B]' : 'text-gray-700'
                  )}>
                    {chat.session_name.length > 20
                      ? chat.session_name.substring(0, 20) + '...'
                      : chat.session_name}
                  </p>
                </div>
              </div>

              {/* Delete button */}
              {hoveredChat === chat.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {chats.length === 0 && (
          <div className="text-center py-8 2xl:py-12 px-3 2xl:px-4">
            <div
              className="w-12 h-12 2xl:w-16 2xl:h-16 mx-auto mb-3 2xl:mb-4 rounded-xl 2xl:rounded-2xl flex items-center justify-center"
              style={{
                background: 'rgba(255, 255, 255, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.7)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.5)',
              }}
            >
              <MessageSquare className="w-5 h-5 2xl:w-7 2xl:h-7 text-gray-400" />
            </div>
            <p className="text-gray-600 text-xs 2xl:text-sm font-medium">No sessions yet</p>
            <p className="text-gray-400 text-[10px] 2xl:text-xs mt-1">Start by analyzing a video</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="p-2 2xl:p-3"
        style={{ borderTop: '1px solid rgba(255, 255, 255, 0.4)' }}
      >
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-1.5 2xl:gap-2 py-2 2xl:py-2.5 rounded-lg 2xl:rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-50/50 transition-all text-xs 2xl:text-sm font-medium"
        >
          <LogOut className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
