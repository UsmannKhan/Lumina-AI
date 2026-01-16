'use client';

import React, { useState } from 'react';
import { Chat, Space } from '@/types';
import { cn } from '@/lib/utils';
import { Plus, Trash2, MessageSquare, ChevronLeft, Play, LogOut, Sparkles, Folder, FolderOpen, Edit2, X, Check, FileText } from 'lucide-react';

interface ChatSidebarProps {
  chats: Chat[];
  spaces: Space[];
  activeChat: Chat | null;
  activeSpaceId: number | null;
  onSelectChat: (chat: Chat) => void;
  onSelectSpace: (spaceId: number | null) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: number) => void;
  onCreateSpace: (name: string) => Promise<Space>;
  onDeleteSpace: (spaceId: number) => void;
  onRenameSpace: (spaceId: number, newName: string) => void;
  onMoveChat: (chatId: number, spaceId: number | null) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function ChatSidebar({
  chats,
  spaces,
  activeChat,
  activeSpaceId,
  onSelectChat,
  onSelectSpace,
  onNewChat,
  onDeleteChat,
  onCreateSpace,
  onDeleteSpace,
  onRenameSpace,
  onMoveChat,
  onLogout,
  isCollapsed,
  onToggleCollapse,
}: ChatSidebarProps) {
  const [hoveredChat, setHoveredChat] = useState<number | null>(null);
  const [hoveredSpace, setHoveredSpace] = useState<number | null>(null);
  const [expandedSpaces, setExpandedSpaces] = useState<Set<number>>(new Set());
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const [isSubmittingSpace, setIsSubmittingSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [editingSpaceId, setEditingSpaceId] = useState<number | null>(null);
  const [editingSpaceName, setEditingSpaceName] = useState('');
  const [deletingSpaceId, setDeletingSpaceId] = useState<number | null>(null);

  // Get all chats sorted by newest first (highest ID = newest)
  const recentChats = [...chats].sort((a, b) => b.id - a.id);

  // Get chats for a specific space
  const getSpaceChats = (spaceId: number) => chats.filter(chat => chat.space_id === spaceId);

  const toggleSpaceExpanded = (spaceId: number) => {
    setExpandedSpaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(spaceId)) {
        newSet.delete(spaceId);
      } else {
        newSet.add(spaceId);
      }
      return newSet;
    });
  };

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim() || isSubmittingSpace) return;

    setIsSubmittingSpace(true);
    const name = newSpaceName.trim();

    // Optimistic: close input immediately
    setNewSpaceName('');
    setIsCreatingSpace(false);

    try {
      await onCreateSpace(name);
    } catch (error) {
      console.error('Failed to create space:', error);
      // Reopen on error
      setIsCreatingSpace(true);
      setNewSpaceName(name);
    } finally {
      setIsSubmittingSpace(false);
    }
  };

  const handleRenameSpace = async (spaceId: number) => {
    if (!editingSpaceName.trim()) return;

    const newName = editingSpaceName.trim();

    // Optimistic: close input immediately
    setEditingSpaceId(null);
    setEditingSpaceName('');

    try {
      await onRenameSpace(spaceId, newName);
    } catch (error) {
      console.error('Failed to rename space:', error);
    }
  };

  const handleDeleteSpace = async (spaceId: number, spaceName: string) => {
    if (deletingSpaceId) return; // Prevent double-click

    if (!confirm(`Delete "${spaceName}"? Chats will be unassigned.`)) return;

    setDeletingSpaceId(spaceId);

    try {
      await onDeleteSpace(spaceId);
    } catch (error) {
      console.error('Failed to delete space:', error);
    } finally {
      setDeletingSpaceId(null);
    }
  };

  // When collapsed, render just a floating button
  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="fixed left-3 2xl:left-6 top-2 2xl:top-5 z-50 p-1.5 2xl:p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-white/40 transition-all"
        title="Show sidebar"
        aria-label="Show sidebar"
      >
        <ChevronLeft className="w-4 h-4 2xl:w-5 2xl:h-5 rotate-180" />
      </button>
    );
  }

  const renderChatItem = (chat: Chat) => (
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
          {chat.source_type === 'pdf' ? (
            <FileText
              className={cn(
                'w-3.5 h-3.5 2xl:w-5 2xl:h-5',
                activeChat?.id === chat.id ? 'text-[#0C115B]' : 'text-gray-500'
              )}
            />
          ) : (
            <Play
              className={cn(
                'w-3.5 h-3.5 2xl:w-5 2xl:h-5',
                activeChat?.id === chat.id ? 'text-[#0C115B]' : 'text-gray-500'
              )}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-xs 2xl:text-base font-medium truncate',
            activeChat?.id === chat.id ? 'text-[#0C115B]' : 'text-gray-700'
          )}>
            {chat.session_name.length > 18
              ? chat.session_name.substring(0, 18) + '...'
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
          aria-label="Delete chat"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <aside
      className="h-screen flex flex-col w-60 2xl:w-[340px] relative"
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
              className="w-8 h-8 2xl:w-10 2xl:h-10 rounded-lg 2xl:rounded-xl flex items-center justify-center"
              style={{
                background: '#0C115B',
                boxShadow: '0 4px 12px rgba(12, 17, 91, 0.3)',
              }}
            >
              <Sparkles className="w-4 h-4 2xl:w-6 2xl:h-6 text-white" />
            </div>
            <span className="font-semibold text-sm 2xl:text-lg text-gray-800">Lumina AI</span>
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white/40 transition-colors"
            title="Hide sidebar"
            aria-label="Hide sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-2 2xl:p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-1.5 2xl:gap-2 py-2.5 2xl:py-3 rounded-lg 2xl:rounded-xl text-white text-sm 2xl:text-base font-semibold transition-all hover:-translate-y-0.5 hover:shadow-xl"
          style={{
            background: '#0C115B',
            boxShadow: '0 4px 16px rgba(12, 17, 91, 0.35)',
          }}
        >
          <Plus className="w-4 h-4 2xl:w-5 2xl:h-5" />
          <span>New Analysis</span>
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-2 2xl:px-3 py-1.5 2xl:py-2">
        {/* Spaces Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-2 2xl:px-3 mb-2">
            <p className="text-[10px] 2xl:text-sm font-medium text-gray-500 uppercase tracking-wider">
              Spaces
            </p>
            <button
              onClick={() => setIsCreatingSpace(true)}
              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-white/50 transition-colors"
              title="New Space"
              aria-label="Create new space"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Create new space input */}
          {isCreatingSpace && (
            <div className="flex items-center gap-1 px-2 mb-2">
              <input
                type="text"
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSubmittingSpace) handleCreateSpace();
                  if (e.key === 'Escape') {
                    setIsCreatingSpace(false);
                    setNewSpaceName('');
                  }
                }}
                placeholder="Space name..."
                className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:border-[#0C115B]/30 disabled:opacity-50"
                autoFocus
                disabled={isSubmittingSpace}
              />
              <button
                onClick={handleCreateSpace}
                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-50"
                disabled={isSubmittingSpace}
                aria-label="Confirm create space"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setIsCreatingSpace(false);
                  setNewSpaceName('');
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
                aria-label="Cancel create space"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Spaces list */}
          <div className="space-y-1">
            {spaces.map((space) => {
              const spaceChats = getSpaceChats(space.id);
              const isExpanded = expandedSpaces.has(space.id);
              const isEditing = editingSpaceId === space.id;

              return (
                <div key={space.id}>
                  {/* Space header */}
                  <div
                    className={cn(
                      'group relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all',
                      activeSpaceId === space.id ? 'bg-white/60' : 'hover:bg-white/40'
                    )}
                    onMouseEnter={() => setHoveredSpace(space.id)}
                    onMouseLeave={() => setHoveredSpace(null)}
                    onClick={() => {
                      toggleSpaceExpanded(space.id);
                      onSelectSpace(space.id);
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSpaceExpanded(space.id);
                      }}
                      className="p-0.5"
                      aria-label={isExpanded ? "Collapse space" : "Expand space"}
                    >
                      {isExpanded ? (
                        <FolderOpen className="w-4 h-4 text-[#0C115B]" />
                      ) : (
                        <Folder className="w-4 h-4 text-gray-500" />
                      )}
                    </button>

                    {isEditing ? (
                      <input
                        type="text"
                        value={editingSpaceName}
                        onChange={(e) => setEditingSpaceName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSpace(space.id);
                          if (e.key === 'Escape') {
                            setEditingSpaceId(null);
                            setEditingSpaceName('');
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 text-xs px-1 py-0.5 rounded border border-gray-200 focus:outline-none focus:border-[#0C115B]/30"
                        autoFocus
                      />
                    ) : (
                      <span className="flex-1 text-xs 2xl:text-sm font-medium text-gray-700 truncate">
                        {space.name}
                      </span>
                    )}

                    <span className="text-[10px] text-gray-400">
                      {spaceChats.length}
                    </span>

                    {/* Space actions */}
                    {hoveredSpace === space.id && !isEditing && deletingSpaceId !== space.id && (
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSpaceId(space.id);
                            setEditingSpaceName(space.name);
                          }}
                          className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-white/50"
                          aria-label="Rename space"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSpace(space.id, space.name);
                          }}
                          className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                          aria-label="Delete space"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Space chats */}
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l border-gray-200 pl-2">
                      {spaceChats.length === 0 ? (
                        <p className="text-[10px] text-gray-400 py-2 px-2">No chats yet</p>
                      ) : (
                        spaceChats.map(renderChatItem)
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {spaces.length === 0 && !isCreatingSpace && (
              <p className="text-[10px] text-gray-400 px-2 py-1">
                No spaces yet. Create one to organize.
              </p>
            )}
          </div>
        </div>

        {/* Recents Section - All chats sorted by newest */}
        {recentChats.length > 0 && (
          <div>
            <p className="text-[10px] 2xl:text-sm font-medium text-gray-500 uppercase tracking-wider px-2 2xl:px-3 mb-2 2xl:mb-3">
              Recents
            </p>
            <div className="space-y-1">
              {recentChats.map(renderChatItem)}
            </div>
          </div>
        )}

        {chats.length === 0 && spaces.length === 0 && (
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
          className="w-full flex items-center justify-center gap-2 2xl:gap-2.5 py-2.5 2xl:py-3 rounded-lg 2xl:rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-50/50 transition-all text-xs 2xl:text-base font-medium"
        >
          <LogOut className="w-4 h-4 2xl:w-5 2xl:h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
