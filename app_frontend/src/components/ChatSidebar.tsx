'use client';

import React, { useState } from 'react';
import { Chat, Space } from '@/types';
import { cn } from '@/lib/utils';
import {
  Plus,
  Trash2,
  ChevronLeft,
  Edit2,
  X,
  Check,
  ChevronRight,
  Search,
  LogOut,
  Library as LibraryIcon,
} from 'lucide-react';
import { Aperture } from './Logo';

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
  username?: string;
  onShowLibrary?: () => void;
  isLibraryActive?: boolean;
}

// Deterministic color per space — keeps the sidebar visually rich without a backend column
const SPACE_PALETTE: { color: string; tint: string }[] = [
  { color: 'var(--space-blue)', tint: 'var(--space-blue-tint)' },
  { color: 'var(--space-green)', tint: 'var(--space-green-tint)' },
  { color: 'var(--space-amber)', tint: 'var(--space-amber-tint)' },
  { color: 'var(--space-violet)', tint: 'var(--space-violet-tint)' },
];

export function spaceColor(spaceId: number) {
  // Stable index even for negative (optimistic) ids
  const idx = Math.abs(spaceId) % SPACE_PALETTE.length;
  return SPACE_PALETTE[idx];
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
  onLogout,
  isCollapsed,
  onToggleCollapse,
  username,
  onShowLibrary,
  isLibraryActive,
}: ChatSidebarProps) {
  const [hoveredChat, setHoveredChat] = useState<number | null>(null);
  const [hoveredSpace, setHoveredSpace] = useState<number | null>(null);
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const [isSubmittingSpace, setIsSubmittingSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [editingSpaceId, setEditingSpaceId] = useState<number | null>(null);
  const [editingSpaceName, setEditingSpaceName] = useState('');
  const [deletingSpaceId, setDeletingSpaceId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // The space currently in context — used only to highlight the active row in
  // the Spaces list. The Recents section below shows ALL chats globally.
  const contextSpaceId: number | null = activeChat?.space_id ?? activeSpaceId ?? null;

  const recentChats = [...chats].sort((a, b) => b.id - a.id);

  // Recents always shows the user's full library, optionally filtered by the
  // sidebar search input.
  const sectionSources = (() => {
    if (!searchTerm.trim()) return recentChats;
    const q = searchTerm.toLowerCase();
    return recentChats.filter((c) => c.session_name.toLowerCase().includes(q));
  })();

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim() || isSubmittingSpace) return;
    setIsSubmittingSpace(true);
    const name = newSpaceName.trim();
    setNewSpaceName('');
    setIsCreatingSpace(false);
    try {
      await onCreateSpace(name);
    } catch (error) {
      console.error('Failed to create space:', error);
      setIsCreatingSpace(true);
      setNewSpaceName(name);
    } finally {
      setIsSubmittingSpace(false);
    }
  };

  const handleRenameSpace = async (spaceId: number) => {
    if (!editingSpaceName.trim()) return;
    const newName = editingSpaceName.trim();
    setEditingSpaceId(null);
    setEditingSpaceName('');
    try {
      await onRenameSpace(spaceId, newName);
    } catch (error) {
      console.error('Failed to rename space:', error);
    }
  };

  const handleDeleteSpace = async (spaceId: number, spaceName: string) => {
    if (deletingSpaceId) return;
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

  // Collapsed: floating chevron in the top-left.
  // - Desktop (lg+): always visible — the only way to reopen the sidebar.
  // - Mobile/tablet: visible in Library / SpaceDetail / EmptyState
  //   (which lack their own header toggle); hidden inside ChatView
  //   because ChatView has its own in-header hamburger.
  if (isCollapsed) {
    const hideFloatingOnMobile = activeChat !== null;
    return (
      <button
        onClick={onToggleCollapse}
        className={cn(
          'fixed left-3 top-3 z-50 items-center justify-center transition-all hover:scale-105',
          hideFloatingOnMobile ? 'hidden lg:flex' : 'flex',
        )}
        title="Show sidebar"
        aria-label="Show sidebar"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'var(--lumina-surface)',
          color: 'var(--lumina-text-dim)',
          boxShadow: 'var(--lumina-shadow-sm)',
          border: 'none',
        }}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    );
  }

  const renderChatItem = (chat: Chat) => {
    const isActive = activeChat?.id === chat.id;
    // Two-line item: title on top, source-type meta below — matches the
    // "In space" pattern from the Apple-clean design.
    const meta =
      chat.source_type === 'youtube'
        ? 'YouTube'
        : chat.source_type === 'pdf'
        ? 'PDF'
        : chat.source_type === 'docx'
        ? 'Document'
        : chat.source_type === 'txt'
        ? 'Text'
        : chat.source_type === 'audio'
        ? 'Audio'
        : chat.source_type === 'website' || chat.source_type === 'web'
        ? 'Webpage'
        : 'Source';
    return (
      <div
        key={chat.id}
        onMouseEnter={() => setHoveredChat(chat.id)}
        onMouseLeave={() => setHoveredChat(null)}
        onClick={() => onSelectChat(chat)}
        className="group relative cursor-pointer transition-colors"
        style={{
          padding: '8px 10px',
          borderRadius: 8,
          marginBottom: 1,
          background: isActive ? 'var(--lumina-surface-alt)' : 'transparent',
        }}
      >
        <div className="flex-1 min-w-0">
          <div
            className="truncate"
            style={{
              fontSize: 13.5,
              color: isActive ? 'var(--lumina-text)' : 'var(--lumina-text-dim)',
              fontWeight: isActive ? 500 : 400,
              marginBottom: 2,
            }}
          >
            {chat.session_name}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--lumina-text-faint)' }}>{meta}</div>
        </div>
        {!isActive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteChat(chat.id);
            }}
            aria-label="Delete chat"
            className={cn(
              'absolute flex items-center justify-center w-8 h-8 transition-opacity',
              // Mobile: always visible (no hover state on touch).
              // Desktop: hidden unless row is hovered.
              'md:opacity-0 md:group-hover:opacity-100',
            )}
            style={{
              top: '50%',
              right: 4,
              transform: 'translateY(-50%)',
              borderRadius: 8,
              background: 'var(--lumina-surface)',
              color: 'var(--lumina-text-faint)',
              border: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--lumina-error-soft)';
              e.currentTarget.style.color = 'var(--lumina-error-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--lumina-surface)';
              e.currentTarget.style.color = 'var(--lumina-text-faint)';
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile-only backdrop scrim — tap anywhere outside the sidebar to
          close it. Hidden on md+ where the sidebar lives in normal flex
          flow. */}
      <div
        onClick={onToggleCollapse}
        aria-hidden="true"
        className="md:hidden fixed inset-0 z-40"
        style={{ background: 'rgba(15,15,20,0.4)' }}
      />
      <aside
        className="flex flex-col flex-shrink-0 fixed md:relative inset-y-0 left-0 z-50 md:z-auto"
        style={{
          width: 264,
          maxWidth: '85vw', // never wider than 85% of viewport on tiny screens
          background: 'var(--lumina-surface)',
          borderRadius: 16,
          boxShadow: 'var(--lumina-shadow-sm)',
          padding: '16px 12px',
          // Consistent rhythm between top-level sidebar children — gives the
          // "spacious" feeling from the Apple-clean handoff.
          gap: 6,
        }}
      >
      {/* Brand */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '4px 6px 4px' }}
      >
        <div className="flex items-center gap-2.5">
          <Aperture size={28} />
          <span className="font-semibold" style={{ fontSize: 16, letterSpacing: '-0.3px' }}>
            Lumina
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          aria-label="Hide sidebar"
          title="Hide sidebar"
          className="flex items-center justify-center"
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--lumina-text-faint)',
            border: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--lumina-surface-alt)';
            e.currentTarget.style.color = 'var(--lumina-text-dim)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--lumina-text-faint)';
          }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2"
        style={{
          padding: '9px 11px',
          borderRadius: 10,
          background: 'var(--lumina-surface-alt)',
        }}
      >
        <Search className="w-3.5 h-3.5" style={{ color: 'var(--lumina-text-faint)' }} />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search sources"
          className="flex-1 outline-none bg-transparent"
          style={{
            fontSize: 13,
            color: 'var(--lumina-text)',
            border: 'none',
            minWidth: 0,
          }}
        />
      </div>

      {/* New source button */}
      <button
        onClick={onNewChat}
        className="flex items-center justify-between transition-all hover:brightness-110"
        style={{
          padding: '12px 14px',
          borderRadius: 12,
          background: 'var(--lumina-accent)',
          color: '#fff',
          border: 'none',
          fontSize: 13.5,
          fontWeight: 600,
          boxShadow: 'var(--lumina-shadow-accent)',
        }}
      >
        <span className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New source
        </span>
        <span className="lumina-mono opacity-70" style={{ fontSize: 11 }}>
          ⌘N
        </span>
      </button>

      {/* Library nav — uses the same surface-alt active style as Spaces and
          Recents items so the sidebar reads as one consistent list. */}
      <div>
        <div
          onClick={() => onShowLibrary?.()}
          className="flex items-center justify-between cursor-pointer transition-colors"
          style={{
            padding: '10px 10px',
            borderRadius: 8,
            background: isLibraryActive ? 'var(--lumina-surface-alt)' : 'transparent',
            fontSize: 14,
            color: isLibraryActive ? 'var(--lumina-text)' : 'var(--lumina-text-dim)',
            fontWeight: isLibraryActive ? 500 : 400,
          }}
        >
          <span className="flex items-center gap-2.5">
            <LibraryIcon
              className="w-3.5 h-3.5"
              style={{
                color: isLibraryActive ? 'var(--lumina-text)' : 'var(--lumina-text-faint)',
              }}
            />
            Library
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--lumina-text-faint)' }}>{chats.length}</span>
        </div>
      </div>

      {/* Spaces section */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '10px 10px 4px',
          fontSize: 11.5,
          color: 'var(--lumina-text-faint)',
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        <span>Spaces</span>
        <button
          onClick={() => setIsCreatingSpace(true)}
          aria-label="Create new space"
          className="flex items-center justify-center"
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            background: 'transparent',
            color: 'var(--lumina-text-faint)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {isCreatingSpace && (
        <div className="flex items-center gap-1" style={{ padding: '0 6px 6px' }}>
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
            placeholder="Space name…"
            autoFocus
            disabled={isSubmittingSpace}
            className="flex-1 outline-none disabled:opacity-50"
            style={{
              fontSize: 12.5,
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid var(--lumina-divider)',
              background: 'var(--lumina-surface)',
            }}
          />
          <button
            onClick={handleCreateSpace}
            disabled={isSubmittingSpace}
            aria-label="Confirm create space"
            className="flex items-center justify-center disabled:opacity-50"
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: 'none',
              background: 'var(--lumina-success-soft)',
              color: 'var(--lumina-success-text)',
              cursor: 'pointer',
            }}
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              setIsCreatingSpace(false);
              setNewSpaceName('');
            }}
            aria-label="Cancel create space"
            className="flex items-center justify-center"
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: 'none',
              background: 'var(--lumina-surface-alt)',
              color: 'var(--lumina-text-faint)',
              cursor: 'pointer',
            }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto" style={{ marginRight: -4, paddingRight: 4 }}>
        {/* Spaces — flat colored-dot list. Click switches the active space,
            which filters the source list below. */}
        <div style={{ marginBottom: 4 }}>
          {spaces.map((space) => {
            const isEditing = editingSpaceId === space.id;
            const isActive = contextSpaceId === space.id;
            const { color } = spaceColor(space.id);
            return (
              <div
                key={space.id}
                onMouseEnter={() => setHoveredSpace(space.id)}
                onMouseLeave={() => setHoveredSpace(null)}
                onClick={() => onSelectSpace(space.id)}
                className={cn('group flex items-center justify-between cursor-pointer transition-colors')}
                style={{
                  padding: '9px 10px',
                  borderRadius: 8,
                  background: isActive ? 'var(--lumina-surface-alt)' : 'transparent',
                  fontSize: 14,
                  color: isActive ? 'var(--lumina-text)' : 'var(--lumina-text-dim)',
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                <span className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: color,
                      flexShrink: 0,
                    }}
                  />
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
                      autoFocus
                      className="flex-1 min-w-0 outline-none"
                      style={{
                        fontSize: 13,
                        padding: '2px 6px',
                        borderRadius: 4,
                        border: '1px solid var(--lumina-divider)',
                        background: 'var(--lumina-surface)',
                      }}
                    />
                  ) : (
                    <span className="truncate">{space.name}</span>
                  )}
                </span>
                <span
                  className="flex items-center gap-1 flex-shrink-0"
                  style={{ marginLeft: 6 }}
                >
                  {hoveredSpace === space.id && !isEditing && deletingSpaceId !== space.id ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSpaceId(space.id);
                          setEditingSpaceName(space.name);
                        }}
                        aria-label="Rename space"
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          background: 'transparent',
                          color: 'var(--lumina-text-faint)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSpace(space.id, space.name);
                        }}
                        aria-label="Delete space"
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          background: 'transparent',
                          color: 'var(--lumina-text-faint)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--lumina-error-text)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--lumina-text-faint)';
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <span style={{ fontSize: 11.5, color: 'var(--lumina-text-faint)' }}>
                      {chats.filter((c) => c.space_id === space.id).length}
                    </span>
                  )}
                </span>
              </div>
            );
          })}

          {spaces.length === 0 && !isCreatingSpace && (
            <p
              style={{
                fontSize: 11.5,
                color: 'var(--lumina-text-faint)',
                padding: '4px 10px',
                margin: 0,
              }}
            >
              No spaces yet — create one to organize.
            </p>
          )}
        </div>

        {/* Recents — global list of all sources, not filtered by the active
            space. The sidebar always reflects the full library so navigating
            to a space detail page doesn't hide anything. */}
        {sectionSources.length > 0 && (
          <>
            <div
              className="flex items-center justify-between"
              style={{
                padding: '14px 10px 4px',
                fontSize: 11.5,
                color: 'var(--lumina-text-faint)',
                fontWeight: 600,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
              }}
            >
              <span className="truncate">Recents</span>
              <span style={{ marginLeft: 6, flexShrink: 0 }}>· {sectionSources.length}</span>
            </div>
            <div>{sectionSources.map(renderChatItem)}</div>
          </>
        )}

        {chats.length === 0 && spaces.length === 0 && (
          <div className="text-center" style={{ padding: '24px 16px' }}>
            <p
              style={{
                fontSize: 12.5,
                color: 'var(--lumina-text-dim)',
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              No sessions yet
            </p>
            <p style={{ fontSize: 11, color: 'var(--lumina-text-faint)', margin: 0 }}>
              Start by adding a video, PDF, or document.
            </p>
          </div>
        )}
      </div>

      {/* User pill */}
      <div
        className="flex items-center gap-2.5"
        style={{
          padding: '10px 12px',
          borderRadius: 12,
          background: 'var(--lumina-surface-alt)',
        }}
      >
        <div
          className="flex items-center justify-center font-semibold"
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--lumina-accent), #8B5CF6)',
            color: '#fff',
            fontSize: 11.5,
            flexShrink: 0,
          }}
        >
          {(username || 'U').slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="truncate"
            style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--lumina-text)' }}
          >
            {username || 'You'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--lumina-text-faint)' }}>Pro plan</div>
        </div>
        <button
          onClick={onLogout}
          aria-label="Sign out"
          title="Sign out"
          className="flex items-center justify-center"
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--lumina-text-faint)',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--lumina-error-text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--lumina-text-faint)';
          }}
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
    </>
  );
}
