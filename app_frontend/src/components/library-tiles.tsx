'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Chat, Space } from '@/types';
import { FileText, Play, Music, Globe } from 'lucide-react';
import { spaceColor } from './ChatSidebar';
import { api } from '@/lib/api';

const PdfThumbnail = dynamic(() => import('./PdfThumbnail'), { ssr: false });

export function sourceLabel(chat: Chat): string {
  switch (chat.source_type) {
    case 'youtube':
      return 'YouTube';
    case 'pdf':
      return 'PDF';
    case 'docx':
      return 'Document';
    case 'txt':
      return 'Text';
    case 'audio':
      return 'Audio';
    case 'website':
    case 'web':
      return 'Webpage';
    default:
      return 'Source';
  }
}

export function chatGradient(chat: Chat): string {
  const dark = [
    'linear-gradient(135deg, #1A1A2E 0%, #2A1A4E 60%, #4A2A6E 100%)',
    'linear-gradient(135deg, #1F3A2E 0%, #2E5A45 100%)',
    'linear-gradient(135deg, #2A2A3A 0%, #3A3A5A 100%)',
    'linear-gradient(135deg, #2E1F3A 0%, #4E2F5A 100%)',
    'linear-gradient(135deg, #1F2A3A 0%, #2F4A6A 100%)',
  ];
  const light = [
    'linear-gradient(160deg, #FAFAF8 0%, #ECECEA 100%)',
    'linear-gradient(160deg, #FAFAF8 0%, #EDE9FE 100%)',
    'linear-gradient(160deg, #FEF3C7 0%, #FDE68A 100%)',
  ];
  // Audio gets a dark gradient (waveform reads better on dark);
  // file-based sources (pdf/txt/docx/website) use a light gradient.
  if (
    chat.source_type === 'pdf' ||
    chat.source_type === 'txt' ||
    chat.source_type === 'docx' ||
    chat.source_type === 'website' ||
    chat.source_type === 'web'
  ) {
    return light[chat.id % light.length];
  }
  return dark[chat.id % dark.length];
}

export function ChatGlyph({ source, color }: { source: string; color: string }) {
  const props = { width: 13, height: 13, strokeWidth: 1.5 } as const;
  if (source === 'pdf' || source === 'txt' || source === 'docx')
    return <FileText {...props} style={{ color }} />;
  if (source === 'audio') return <Music {...props} style={{ color }} />;
  if (source === 'website' || source === 'web') return <Globe {...props} style={{ color }} />;
  return <Play {...props} style={{ color }} />;
}

export function FauxPagePreview() {
  return (
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
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
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
  );
}

export function SessionTile({
  chat,
  spaces,
  onClick,
  showSpaceMeta = true,
}: {
  chat: Chat;
  spaces: Space[];
  onClick: () => void;
  showSpaceMeta?: boolean;
}) {
  const space = chat.space_id ? spaces.find((s) => s.id === chat.space_id) : null;
  const sColor = space ? spaceColor(space.id).color : 'var(--lumina-text-faint)';
  const grad = chatGradient(chat);
  const isLightTile =
    chat.source_type === 'pdf' ||
    chat.source_type === 'txt' ||
    chat.source_type === 'docx' ||
    chat.source_type === 'website' ||
    chat.source_type === 'web';
  const isYouTube = chat.source_type === 'youtube' && chat.source_id;
  const isPdfFile = chat.source_type === 'pdf' && !!chat.source_id;
  const isAudio = chat.source_type === 'audio';
  const isWebsite = chat.source_type === 'website' || chat.source_type === 'web';

  return (
    <button
      onClick={onClick}
      className="text-left transition-all"
      style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
    >
      <div
        style={{
          aspectRatio: '1 / 1',
          borderRadius: 16,
          overflow: 'hidden',
          background: grad,
          position: 'relative',
          border: '1px solid var(--lumina-divider)',
          marginBottom: 10,
        }}
      >
        {isYouTube && (
          <img
            src={`https://i.ytimg.com/vi/${chat.source_id}/maxresdefault.jpg`}
            alt=""
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fallback) return;
              img.dataset.fallback = '1';
              img.src = `https://i.ytimg.com/vi/${chat.source_id}/mqdefault.jpg`;
            }}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
        )}
        {isYouTube && (
          <>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)',
              }}
            />
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
          </>
        )}
        {isPdfFile && (
          <PdfThumbnail url={api.getPdfUrl(chat.id)} fallback={<FauxPagePreview />} />
        )}
        {isLightTile && !isPdfFile && !isWebsite && <FauxPagePreview />}
        {/* Website tiles get a faux page preview on a light gradient too —
            same look as PDFs since most articles render that way. */}
        {isWebsite && <FauxPagePreview />}
        {/* Audio tiles get a waveform overlay on the dark gradient. */}
        {isAudio && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 18,
              right: 18,
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              height: 56,
            }}
          >
            {Array.from({ length: 32 }).map((_, i) => {
              const h = 18 + Math.abs(Math.sin(i * 0.7) * 30);
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: h,
                    background: 'rgba(255,255,255,0.55)',
                    borderRadius: 1.5,
                  }}
                />
              );
            })}
          </div>
        )}
        {showSpaceMeta && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 8,
              height: 8,
              borderRadius: 2,
              background: sColor,
              boxShadow: isLightTile
                ? '0 0 0 2px var(--lumina-surface)'
                : '0 0 0 2px rgba(255,255,255,0.15)',
            }}
          />
        )}
      </div>
      <div style={{ padding: '0 4px' }}>
        <div className="flex items-start gap-2 mb-1">
          <span style={{ marginTop: 2, flexShrink: 0 }}>
            <ChatGlyph source={chat.source_type} color="var(--lumina-text-faint)" />
          </span>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 500,
              letterSpacing: '-0.2px',
              lineHeight: 1.35,
              color: 'var(--lumina-text)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: 36,
            }}
          >
            {chat.session_name}
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--lumina-text-faint)', paddingLeft: 21 }}>
          {sourceLabel(chat)}
          {showSpaceMeta && space ? ` · ${space.name}` : ''}
        </div>
      </div>
    </button>
  );
}

export function AddTile({
  onClick,
  label = 'Add a new source',
  meta = 'YouTube, PDF, audio, web',
}: {
  onClick: () => void;
  label?: string;
  meta?: string;
}) {
  // Mirrors SessionTile's structure (square box + 36px title row + meta line)
  // so it lines up cleanly when placed alongside source tiles in the grid.
  return (
    <button
      onClick={onClick}
      style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
      className="text-left"
    >
      <div
        className="flex items-center justify-center"
        style={{
          aspectRatio: '1 / 1',
          borderRadius: 16,
          border: '1.5px dashed var(--lumina-divider)',
          background: 'transparent',
          marginBottom: 10,
          transition: 'border-color 0.15s, background 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--lumina-accent)';
          e.currentTarget.style.background = 'var(--lumina-accent-soft)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--lumina-divider)';
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'var(--lumina-surface-alt)',
            color: 'var(--lumina-text-dim)',
            fontSize: 24,
            fontWeight: 300,
          }}
        >
          ＋
        </div>
      </div>
      <div style={{ padding: '0 4px' }}>
        <div
          className="flex items-start gap-2 mb-1"
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            letterSpacing: '-0.2px',
            lineHeight: 1.35,
            color: 'var(--lumina-text-dim)',
            minHeight: 36,
          }}
        >
          <span style={{ marginTop: 2, flexShrink: 0, color: 'var(--lumina-text-faint)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <span>{label}</span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--lumina-text-faint)', paddingLeft: 21 }}>
          {meta}
        </div>
      </div>
    </button>
  );
}
