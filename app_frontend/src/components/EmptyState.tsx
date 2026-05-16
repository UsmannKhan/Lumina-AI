'use client';

import React from 'react';
import { Aperture } from './Logo';
import type { SourceKind } from './NewChatModal';

interface EmptyStateProps {
  /** Optional `kind` lets the parent pre-select the source type in the modal.
   *  Optional `url` pre-fills the URL input — used by the sample tiles so a
   *  first-run user can load a sample with one tap and one Create click. */
  onNewChat: (kind?: SourceKind, url?: string) => void;
}

const SOURCE_TYPES: { id: SourceKind; label: string; sub: string; icon: React.ReactNode }[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    sub: 'Paste URL',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 9.5L15 12L10 14.5V9.5Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'pdf',
    label: 'PDF / Doc',
    sub: 'PDF, DOCX, TXT, PPTX',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 2.5h10l4 4v14a.5.5 0 0 1-.5.5h-13.5a.5.5 0 0 1-.5-.5v-17.5a.5.5 0 0 1 .5-.5z"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path d="M15 2.5v4h4" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    id: 'audio',
    label: 'Audio',
    sub: 'MP3, WAV, M4A',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 9v6M9 6v12M13 7v10M17 9v6M21 11v2"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'web',
    label: 'Webpage',
    sub: 'Articles, ArXiv',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"
          stroke="currentColor"
          strokeWidth="1.3"
        />
      </svg>
    ),
  },
];

const SAMPLES: {
  id: string;
  label: string;
  meta: string;
  kind: SourceKind;
  /** Real URL loaded when the user clicks the sample. The modal opens with
   *  the URL pre-filled so they just confirm with Create. */
  url: string;
  gradient: string;
  isVideo?: boolean;
  isPdf?: boolean;
}[] = [
  {
    id: 'karpathy',
    label: 'Neural Networks: Zero to Hero',
    meta: 'Andrej Karpathy · 2:25:52',
    kind: 'youtube',
    url: 'https://www.youtube.com/watch?v=VMj-3S1tku0',
    gradient: 'linear-gradient(135deg, #1A1A2E 0%, #2A1A4E 60%, #4A2A6E 100%)',
    isVideo: true,
  },
  {
    id: 'attention',
    label: 'Attention Is All You Need',
    meta: 'arXiv · 1706.03762',
    kind: 'web',
    url: 'https://arxiv.org/abs/1706.03762',
    gradient: 'linear-gradient(160deg, #FAFAF8 0%, #ECECEA 100%)',
    isPdf: true,
  },
  {
    id: 'lecun',
    label: 'Yann LeCun on AGI',
    meta: 'Lex Fridman · 2:48:00',
    kind: 'youtube',
    url: 'https://www.youtube.com/watch?v=5t1vTLU7s40',
    gradient: 'linear-gradient(135deg, #1F3A2E 0%, #2E5A45 100%)',
    isVideo: true,
  },
  {
    id: 'bitter-lesson',
    label: 'The Bitter Lesson',
    meta: 'Rich Sutton · Article',
    kind: 'web',
    url: 'http://www.incompleteideas.net/IncIdeas/BitterLesson.html',
    gradient: 'linear-gradient(160deg, #FAFAF8 0%, #EDE9FE 100%)',
    isPdf: true,
  },
];

export default function EmptyState({ onNewChat }: EmptyStateProps) {
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
            style={{ maxWidth: 880, padding: 'clamp(40px, 8vh, 72px) 32px 48px' }}
          >
            <div className="text-center" style={{ marginBottom: 56 }}>
              <div
                className="inline-flex"
                style={{
                  marginBottom: 24,
                  padding: 14,
                  borderRadius: 22,
                  background: 'var(--lumina-accent-soft)',
                }}
              >
                <Aperture size={32} />
              </div>
              <h1
                className="font-semibold"
                style={{
                  fontSize: 'clamp(28px, 4vw, 36px)',
                  letterSpacing: '-1.2px',
                  margin: '0 0 12px',
                  lineHeight: 1.1,
                  color: 'var(--lumina-text)',
                }}
              >
                Start your first session
              </h1>
              <p
                style={{
                  fontSize: 15.5,
                  color: 'var(--lumina-text-dim)',
                  lineHeight: 1.5,
                  margin: '0 auto',
                  maxWidth: 480,
                }}
              >
                Pick a source. Lumina turns it into notes, flashcards, and a chat you can study with.
              </p>
            </div>

            <h2
              className="font-semibold"
              style={{
                fontSize: 14,
                letterSpacing: '-0.2px',
                margin: '0 0 14px',
                padding: '0 4px',
              }}
            >
              Add a source
            </h2>
            <div
              className="grid gap-2.5"
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                marginBottom: 48,
              }}
            >
              {SOURCE_TYPES.map((z) => (
                <button
                  key={z.id}
                  onClick={() => onNewChat(z.id)}
                  className="flex items-center gap-3 text-left transition-colors"
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: '1px solid var(--lumina-divider)',
                    background: 'var(--lumina-surface)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--lumina-accent)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.10)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--lumina-divider)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'var(--lumina-surface-alt)',
                      color: 'var(--lumina-text-dim)',
                    }}
                  >
                    {z.icon}
                  </span>
                  <span className="min-w-0">
                    <span
                      className="block font-semibold"
                      style={{ fontSize: 13.5, letterSpacing: '-0.2px', marginBottom: 1 }}
                    >
                      {z.label}
                    </span>
                    <span
                      className="block"
                      style={{ fontSize: 11, color: 'var(--lumina-text-faint)' }}
                    >
                      {z.sub}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <h2
              className="font-semibold"
              style={{
                fontSize: 14,
                letterSpacing: '-0.2px',
                margin: '0 0 14px',
                padding: '0 4px',
              }}
            >
              Or explore a sample
            </h2>
            <div className="tile-grid-4">
              {SAMPLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onNewChat(s.kind, s.url)}
                  className="text-left"
                  style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <div
                    style={{
                      aspectRatio: '1 / 1',
                      borderRadius: 16,
                      overflow: 'hidden',
                      background: s.gradient,
                      position: 'relative',
                      border: '1px solid var(--lumina-divider)',
                      marginBottom: 10,
                    }}
                  >
                    {s.isVideo && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.95)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#0A0A0B',
                          fontSize: 12,
                          paddingLeft: 3,
                          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                        }}
                      >
                        ▶
                      </div>
                    )}
                    {s.isPdf && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '14%',
                          left: '18%',
                          right: '18%',
                          bottom: '14%',
                          background: 'rgba(255,255,255,0.85)',
                          borderRadius: 4,
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 5,
                        }}
                      >
                        {[1, 0.85, 0.95, 0.6, 0.8, 0.9, 0.7].map((w, i) => (
                          <div
                            key={i}
                            style={{
                              height: 3,
                              width: `${w * 100}%`,
                              background: 'rgba(0,0,0,0.18)',
                              borderRadius: 1.5,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '0 4px' }}>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 500,
                        letterSpacing: '-0.2px',
                        lineHeight: 1.35,
                        color: 'var(--lumina-text)',
                        marginBottom: 3,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minHeight: 36,
                      }}
                    >
                      {s.label}
                    </div>
                    <div
                      className="lumina-mono"
                      style={{ fontSize: 11.5, color: 'var(--lumina-text-faint)' }}
                    >
                      {s.meta}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
