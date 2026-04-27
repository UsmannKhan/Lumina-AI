'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chat, Space } from '@/types';
import { ApertureMini } from './Logo';
import { Plus, ChevronRight, Check, X } from 'lucide-react';
import { spaceColor } from './ChatSidebar';
import { SessionTile, AddTile } from './library-tiles';

interface LibraryViewProps {
  chats: Chat[];
  spaces: Space[];
  username?: string;
  onNewChat: () => void;
  onSelectChat: (chat: Chat) => void;
  onSelectSpace: (spaceId: number | null) => void;
  /** Quick-create a space without leaving the library. */
  onCreateSpace?: (name: string) => Promise<unknown>;
}

const VISIBLE_SPACES = 8;
const VISIBLE_RECENTS = 7;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function SpaceTile({ space, onClick }: { space: Space; onClick: () => void }) {
  const { color, tint } = spaceColor(space.id);
  return (
    <button
      onClick={onClick}
      style={{
        aspectRatio: '1 / 1',
        borderRadius: 16,
        overflow: 'hidden',
        background: tint,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        position: 'relative',
        border: '1px solid var(--lumina-divider)',
        textAlign: 'left',
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'var(--lumina-surface)',
          boxShadow: 'var(--lumina-shadow-sm)',
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
      </div>
      <div>
        <div
          className="font-semibold"
          style={{
            fontSize: 16,
            letterSpacing: '-0.3px',
            color: 'var(--lumina-text)',
            marginBottom: 4,
            lineHeight: 1.2,
          }}
        >
          {space.name}
        </div>
        <div className="lumina-mono" style={{ fontSize: 11.5, color: 'var(--lumina-text-dim)' }}>
          {space.chat_count ?? 0} sources
        </div>
      </div>
    </button>
  );
}

export default function LibraryView({
  chats,
  spaces,
  username,
  onNewChat,
  onSelectChat,
  onSelectSpace,
  onCreateSpace,
}: LibraryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllRecents, setShowAllRecents] = useState(false);
  const [showAllSpaces, setShowAllSpaces] = useState(false);
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [isSubmittingSpace, setIsSubmittingSpace] = useState(false);
  const newSpaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreatingSpace) newSpaceInputRef.current?.focus();
  }, [isCreatingSpace]);
  const recentChats = useMemo(() => {
    const list = [...chats].sort((a, b) => b.id - a.id);
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter((c) => c.session_name.toLowerCase().includes(q));
  }, [chats, searchTerm]);

  const firstName = username ? username.split(/[\s_.@]/)[0] : 'there';
  const totalSources = chats.length;
  const visibleSpaces = showAllSpaces ? spaces : spaces.slice(0, VISIBLE_SPACES);
  const visibleRecents = showAllRecents
    ? recentChats
    : recentChats.slice(0, VISIBLE_RECENTS);

  const startCreatingSpace = () => {
    if (!onCreateSpace) return;
    setNewSpaceName('');
    setIsCreatingSpace(true);
  };

  const cancelCreatingSpace = () => {
    setIsCreatingSpace(false);
    setNewSpaceName('');
  };

  const submitCreateSpace = async () => {
    const trimmed = newSpaceName.trim();
    if (!trimmed || !onCreateSpace || isSubmittingSpace) return;
    setIsSubmittingSpace(true);
    // Close optimistically — the parent's handleCreateSpace already inserts
    // the space optimistically into the grid.
    setIsCreatingSpace(false);
    setNewSpaceName('');
    try {
      await onCreateSpace(trimmed);
    } catch (err) {
      console.error('Failed to create space:', err);
      // Reopen the input on failure so the user can retry without losing context.
      setIsCreatingSpace(true);
      setNewSpaceName(trimmed);
    } finally {
      setIsSubmittingSpace(false);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden min-w-0"
      style={{
        background: 'var(--lumina-surface)',
        borderRadius: 16,
        boxShadow: 'var(--lumina-shadow-md)',
      }}
    >
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div
            className="mx-auto"
            style={{ maxWidth: 1120, padding: 'clamp(40px, 6vh, 64px) 32px 48px' }}
          >
            <div className="text-center" style={{ marginBottom: 56 }}>
              <div style={{ fontSize: 13, color: 'var(--lumina-text-faint)', marginBottom: 10 }}>
                {greeting()}, {firstName.charAt(0).toUpperCase() + firstName.slice(1)}
              </div>
              <h1
                className="font-semibold"
                style={{
                  fontSize: 'clamp(28px, 4vw, 36px)',
                  letterSpacing: '-1.2px',
                  margin: '0 0 28px',
                  lineHeight: 1.1,
                  color: 'var(--lumina-text)',
                }}
              >
                What do you want to learn today?
              </h1>

              <div
                className="flex items-center gap-2.5 mx-auto"
                style={{
                  background: 'var(--lumina-surface)',
                  border: '1px solid var(--lumina-divider)',
                  borderRadius: 16,
                  padding: '14px 16px',
                  maxWidth: 680,
                  boxShadow: '0 1px 2px rgba(15,15,20,0.03), 0 8px 32px rgba(15,15,20,0.04)',
                }}
              >
                <ApertureMini size={16} />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search your library…"
                  className="flex-1 bg-transparent outline-none"
                  style={{
                    fontSize: 15,
                    color: 'var(--lumina-text)',
                    border: 'none',
                    fontFamily: 'var(--font-sans)',
                    minWidth: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 11.5,
                    padding: '5px 10px',
                    background: 'var(--lumina-surface-alt)',
                    borderRadius: 999,
                    color: 'var(--lumina-text-dim)',
                    fontWeight: 500,
                  }}
                >
                  All sources
                </span>
              </div>
            </div>

            {(spaces.length > 0 || isCreatingSpace) && (
              <>
                <SectionHeader
                  title="Spaces"
                  count={spaces.length}
                  action={
                    onCreateSpace
                      ? { label: 'New space', onClick: startCreatingSpace }
                      : undefined
                  }
                  showSeeAll={spaces.length > VISIBLE_SPACES}
                  isShowingAll={showAllSpaces}
                  onToggleSeeAll={() => setShowAllSpaces((v) => !v)}
                />
                {isCreatingSpace && (
                  <div
                    className="flex items-center gap-2"
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      background: 'var(--lumina-surface-alt)',
                      border: '1px solid var(--lumina-divider)',
                      marginBottom: 14,
                    }}
                  >
                    <input
                      ref={newSpaceInputRef}
                      value={newSpaceName}
                      onChange={(e) => setNewSpaceName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitCreateSpace();
                        if (e.key === 'Escape') cancelCreatingSpace();
                      }}
                      placeholder="Name your new space…"
                      disabled={isSubmittingSpace}
                      className="flex-1 outline-none bg-transparent disabled:opacity-50"
                      style={{
                        fontSize: 14,
                        color: 'var(--lumina-text)',
                        border: 'none',
                        fontFamily: 'var(--font-sans)',
                        minWidth: 0,
                      }}
                    />
                    <button
                      type="button"
                      onClick={submitCreateSpace}
                      disabled={isSubmittingSpace || !newSpaceName.trim()}
                      aria-label="Create space"
                      className="flex items-center justify-center disabled:opacity-50"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: 'var(--lumina-accent)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={cancelCreatingSpace}
                      disabled={isSubmittingSpace}
                      aria-label="Cancel"
                      className="flex items-center justify-center"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: 'var(--lumina-surface)',
                        color: 'var(--lumina-text-faint)',
                        border: '1px solid var(--lumina-divider)',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                {spaces.length > 0 && (
                  <div className="tile-grid-4" style={{ marginBottom: 48 }}>
                    {visibleSpaces.map((s) => (
                      <SpaceTile key={s.id} space={s} onClick={() => onSelectSpace(s.id)} />
                    ))}
                  </div>
                )}
              </>
            )}

            <SectionHeader
              title={searchTerm ? `Search results` : 'Recent sources'}
              count={searchTerm ? recentChats.length : totalSources}
              showSeeAll={!searchTerm && recentChats.length > VISIBLE_RECENTS}
              isShowingAll={showAllRecents}
              onToggleSeeAll={() => setShowAllRecents((v) => !v)}
            />
            {recentChats.length > 0 ? (
              <div className="tile-grid-4">
                {visibleRecents.map((c) => (
                  <SessionTile
                    key={c.id}
                    chat={c}
                    spaces={spaces}
                    onClick={() => onSelectChat(c)}
                  />
                ))}
                {!searchTerm && !showAllRecents && <AddTile onClick={onNewChat} />}
              </div>
            ) : (
              <div
                className="text-center"
                style={{
                  padding: '40px 24px',
                  borderRadius: 14,
                  background: 'var(--lumina-surface-alt)',
                }}
              >
                <p style={{ fontSize: 14, color: 'var(--lumina-text-dim)', margin: 0 }}>
                  {searchTerm
                    ? 'No matches. Try a different search.'
                    : 'No sources yet. Add a video or document to begin.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionHeader({
  title,
  count,
  action,
  showSeeAll,
  isShowingAll,
  onToggleSeeAll,
}: {
  title: string;
  count: number;
  action?: { label: string; onClick: () => void };
  /** Render the "See all" toggle. Hidden when the count fits in the default grid. */
  showSeeAll?: boolean;
  isShowingAll?: boolean;
  onToggleSeeAll?: () => void;
}) {
  return (
    <div className="flex items-baseline justify-between" style={{ padding: '0 4px 16px' }}>
      <h2
        className="font-semibold flex items-baseline gap-2"
        style={{ fontSize: 18, letterSpacing: '-0.4px', margin: 0, color: 'var(--lumina-text)' }}
      >
        {title}
        <span style={{ fontSize: 13, color: 'var(--lumina-text-faint)', fontWeight: 400 }}>
          {count}
        </span>
      </h2>
      <div className="flex items-center gap-3">
        {action && (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-1 font-medium"
            style={{
              fontSize: 12.5,
              color: 'var(--lumina-accent)',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            <Plus size={13} /> {action.label}
          </button>
        )}
        {showSeeAll && onToggleSeeAll && (
          <button
            onClick={onToggleSeeAll}
            className="inline-flex items-center"
            style={{
              fontSize: 12.5,
              color: 'var(--lumina-text-dim)',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            {isShowingAll ? 'Show less' : 'See all'}
            <ChevronRight
              size={12}
              style={{
                transform: isShowingAll ? 'rotate(90deg)' : undefined,
                transition: 'transform 0.15s ease',
              }}
            />
          </button>
        )}
      </div>
    </div>
  );
}
