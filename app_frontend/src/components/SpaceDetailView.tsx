'use client';

import React from 'react';
import { Chat, Space } from '@/types';
import { ChevronLeft, Plus } from 'lucide-react';
import { spaceColor } from './ChatSidebar';
import { SessionTile, AddTile } from './library-tiles';

interface SpaceDetailViewProps {
  space: Space;
  chats: Chat[];
  spaces: Space[];
  onBack: () => void;
  onSelectChat: (chat: Chat) => void;
  onNewChat: () => void;
}

export default function SpaceDetailView({
  space,
  chats,
  spaces,
  onBack,
  onSelectChat,
  onNewChat,
}: SpaceDetailViewProps) {
  const { color, tint } = spaceColor(space.id);
  const spaceChats = chats
    .filter((c) => c.space_id === space.id)
    .sort((a, b) => b.id - a.id);

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden min-w-0"
      style={{
        background: 'var(--lumina-surface)',
        borderRadius: 16,
        boxShadow: 'var(--lumina-shadow-md)',
      }}
    >
      <div className="flex-1 overflow-auto">
        {/* Hero — uses the space's color tint, fading into the white surface
            below. Mirrors the design's ap-space.jsx hero gradient. */}
        <div
          style={{
            padding: '32px 48px 28px',
            borderBottom: '1px solid var(--lumina-divider)',
            background: `linear-gradient(180deg, ${tint} 0%, var(--lumina-surface) 100%)`,
          }}
        >
          <div
            className="flex items-center gap-2"
            style={{ fontSize: 12.5, color: 'var(--lumina-text-dim)', marginBottom: 14 }}
          >
            <button
              onClick={onBack}
              className="flex items-center gap-1 transition-colors"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--lumina-text-dim)',
                cursor: 'pointer',
                padding: 0,
                fontSize: 12.5,
              }}
            >
              <ChevronLeft size={14} />
              Library
            </button>
            <span style={{ color: 'var(--lumina-text-faint)' }}>›</span>
            <span style={{ color: 'var(--lumina-text)', fontWeight: 500 }}>{space.name}</span>
          </div>

          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'var(--lumina-surface)',
                  boxShadow: '0 1px 3px rgba(15,15,20,0.06)',
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    background: color,
                    display: 'block',
                  }}
                />
              </div>
              <div>
                <h1
                  className="font-semibold"
                  style={{
                    fontSize: 32,
                    letterSpacing: '-1px',
                    margin: '0 0 6px',
                    lineHeight: 1.1,
                    color: 'var(--lumina-text)',
                  }}
                >
                  {space.name}
                </h1>
                <div
                  className="flex items-center gap-3"
                  style={{ fontSize: 13, color: 'var(--lumina-text-dim)' }}
                >
                  <span>
                    <strong style={{ color: 'var(--lumina-text)' }}>{spaceChats.length}</strong>{' '}
                    {spaceChats.length === 1 ? 'source' : 'sources'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onNewChat}
              className="flex items-center gap-1.5 transition-all hover:brightness-110"
              style={{
                padding: '9px 16px',
                borderRadius: 10,
                background: 'var(--lumina-accent)',
                color: '#fff',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                boxShadow: 'var(--lumina-shadow-accent)',
              }}
            >
              <Plus size={14} /> Add source
            </button>
          </div>
        </div>

        {/* Sources */}
        <div style={{ padding: '24px 48px 32px' }}>
          <div
            className="flex items-baseline justify-between"
            style={{ padding: '0 4px 16px' }}
          >
            <h2
              className="font-semibold flex items-baseline gap-2"
              style={{
                fontSize: 17,
                letterSpacing: '-0.4px',
                margin: 0,
                color: 'var(--lumina-text)',
              }}
            >
              Sources
              <span
                style={{ fontSize: 13, color: 'var(--lumina-text-faint)', fontWeight: 400 }}
              >
                {spaceChats.length}
              </span>
            </h2>
          </div>

          {spaceChats.length === 0 ? (
            <div
              className="text-center"
              style={{
                padding: '40px 24px',
                borderRadius: 14,
                background: 'var(--lumina-surface-alt)',
              }}
            >
              <p style={{ fontSize: 14, color: 'var(--lumina-text-dim)', margin: 0 }}>
                Nothing in this space yet. Use <strong>Add source</strong> at the top to start studying.
              </p>
            </div>
          ) : (
            <div className="tile-grid-4">
              {spaceChats.map((c) => (
                <SessionTile
                  key={c.id}
                  chat={c}
                  spaces={spaces}
                  onClick={() => onSelectChat(c)}
                  showSpaceMeta={false}
                />
              ))}
              <AddTile onClick={onNewChat} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
