'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, File as FileIcon } from 'lucide-react';
import { Aperture, ApertureMini } from './Logo';
import { Space } from '@/types';
import { spaceColor } from './ChatSidebar';

export type SourceKind = 'youtube' | 'pdf' | 'audio' | 'web';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitYoutube: (youtubeLink: string, spaceId?: number) => Promise<void>;
  onSubmitPdf: (file: File, spaceId?: number) => Promise<void>;
  onSubmitAudio: (file: File, spaceId?: number) => Promise<void>;
  onSubmitWebsite: (url: string, spaceId?: number) => Promise<void>;
  spaces: Space[];
  activeSpaceId: number | null;
  /** When provided, the modal opens with this source kind preselected. */
  initialKind?: SourceKind | null;
}

const SOURCE_KIND_DEFS: { id: SourceKind; label: string; sub: string; icon: React.ReactNode }[] = [
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
    sub: 'PDF, DOCX, TXT',
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
        <path d="M5 9v6M9 6v12M13 7v10M17 9v6M21 11v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
        <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  },
];

const ACCEPT_BY_KIND: Record<SourceKind, string> = {
  youtube: '',
  pdf: '.pdf,.txt,.docx,.pptx',
  audio: '.mp3,.wav,.m4a,.ogg,.webm,.flac',
  web: '',
};

const VALID_FILE_EXTS: Record<'pdf' | 'audio', string[]> = {
  pdf: ['pdf', 'txt', 'docx', 'pptx'],
  audio: ['mp3', 'wav', 'm4a', 'ogg', 'webm', 'flac'],
};

const MAX_BYTES_BY_KIND: Record<'pdf' | 'audio', number> = {
  pdf: 10 * 1024 * 1024, // 10 MB
  audio: 25 * 1024 * 1024, // 25 MB (matches backend limit)
};

export default function NewChatModal({
  isOpen,
  onClose,
  onSubmitYoutube,
  onSubmitPdf,
  onSubmitAudio,
  onSubmitWebsite,
  spaces,
  activeSpaceId,
  initialKind,
}: NewChatModalProps) {
  const [activeKind, setActiveKind] = useState<SourceKind>(initialKind || 'youtube');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | undefined>(activeSpaceId ?? undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSelectFile = (file: File | null) => {
    if (!file) return;
    const fileKind = activeKind === 'audio' ? 'audio' : 'pdf';
    const ext = file.name.toLowerCase().split('.').pop() || '';
    if (!VALID_FILE_EXTS[fileKind].includes(ext)) {
      setError(
        fileKind === 'audio'
          ? 'Only MP3, WAV, M4A, OGG, WebM, FLAC files are allowed'
          : 'Only PDF, TXT, DOCX, and PPTX files are allowed'
      );
      return;
    }
    if (file.size > MAX_BYTES_BY_KIND[fileKind]) {
      const mb = MAX_BYTES_BY_KIND[fileKind] / (1024 * 1024);
      setError(`File too large. Maximum size is ${mb} MB`);
      return;
    }
    setSelectedFile(file);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (activeKind === 'youtube') {
        if (!youtubeLink.includes('youtube.com') && !youtubeLink.includes('youtu.be')) {
          setError('Please enter a valid YouTube URL');
          setIsLoading(false);
          return;
        }
        await onSubmitYoutube(youtubeLink, selectedSpaceId);
        setYoutubeLink('');
        onClose();
      } else if (activeKind === 'pdf') {
        if (!selectedFile) {
          setError('Please select a file');
          setIsLoading(false);
          return;
        }
        await onSubmitPdf(selectedFile, selectedSpaceId);
        setSelectedFile(null);
        onClose();
      } else if (activeKind === 'audio') {
        if (!selectedFile) {
          setError('Please select an audio file');
          setIsLoading(false);
          return;
        }
        await onSubmitAudio(selectedFile, selectedSpaceId);
        setSelectedFile(null);
        onClose();
      } else if (activeKind === 'web') {
        const url = websiteUrl.trim();
        if (!/^https?:\/\//i.test(url)) {
          setError('Please enter a valid URL (must start with http:// or https://)');
          setIsLoading(false);
          return;
        }
        await onSubmitWebsite(url, selectedSpaceId);
        setWebsiteUrl('');
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add source');
    } finally {
      setIsLoading(false);
    }
  };

  const loadingMessage =
    activeKind === 'youtube'
      ? 'Extracting transcript…'
      : activeKind === 'audio'
      ? 'Transcribing audio…'
      : activeKind === 'web'
      ? 'Fetching webpage…'
      : 'Extracting text from file…';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dim backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(15,15,20,0.32)', backdropFilter: 'blur(2px)' }}
        onClick={isLoading ? undefined : onClose}
      />

      <div
        className="relative w-full animate-fade-in-up"
        style={{
          maxWidth: 540,
          background: 'var(--lumina-surface)',
          borderRadius: 18,
          padding: 24,
          boxShadow:
            '0 20px 60px rgba(15,15,20,0.18), 0 0 0 1px rgba(15,15,20,0.06)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--lumina-accent-soft)',
                color: 'var(--lumina-accent)',
              }}
            >
              <ApertureMini size={16} />
            </div>
            <div>
              <div
                className="font-semibold"
                style={{ fontSize: 15, letterSpacing: '-0.2px' }}
              >
                Add a source
              </div>
              <div style={{ fontSize: 12, color: 'var(--lumina-text-faint)' }}>
                Pick how you want to bring it in
              </div>
            </div>
          </div>
          <button
            onClick={isLoading ? undefined : onClose}
            disabled={isLoading}
            aria-label="Close"
            className="flex items-center justify-center transition-colors"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'transparent',
              border: 'none',
              color: 'var(--lumina-text-faint)',
              cursor: isLoading ? 'default' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.background = 'var(--lumina-surface-alt)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source kind picker */}
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 16 }}>
          {SOURCE_KIND_DEFS.map((kind) => {
            const isActive = activeKind === kind.id;
            return (
              <button
                key={kind.id}
                type="button"
                onClick={() => {
                  setActiveKind(kind.id);
                  // Clear file selection when switching between file-based kinds
                  // so the validator picks up the right ext list.
                  setSelectedFile(null);
                  setError('');
                }}
                className="flex items-center gap-3 text-left transition-colors"
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: `1px solid ${isActive ? 'var(--lumina-accent)' : 'var(--lumina-divider)'}`,
                  background: isActive ? 'var(--lumina-accent-soft)' : 'var(--lumina-surface)',
                  boxShadow: isActive ? '0 0 0 3px rgba(0,122,255,0.12)' : 'none',
                }}
              >
                <span
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: isActive ? 'var(--lumina-surface)' : 'var(--lumina-surface-alt)',
                    color: isActive ? 'var(--lumina-accent)' : 'var(--lumina-text-dim)',
                  }}
                >
                  {kind.icon}
                </span>
                <span className="min-w-0">
                  <span
                    className="block font-semibold"
                    style={{ fontSize: 13, letterSpacing: '-0.2px' }}
                  >
                    {kind.label}
                  </span>
                  <span className="block" style={{ fontSize: 11, color: 'var(--lumina-text-faint)' }}>
                    {kind.sub}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          {activeKind === 'youtube' && (
            <div
              className="flex items-center gap-2"
              style={{
                background: 'var(--lumina-surface-alt)',
                border: '1px solid var(--lumina-divider)',
                borderRadius: 12,
                padding: '10px 12px',
                marginBottom: 12,
              }}
            >
              <span
                className="lumina-mono"
                style={{ color: 'var(--lumina-text-faint)', fontSize: 13 }}
              >
                ↗
              </span>
              <input
                value={youtubeLink}
                onChange={(e) => setYoutubeLink(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
                autoFocus
                className="flex-1 outline-none bg-transparent lumina-mono"
                style={{ fontSize: 13, color: 'var(--lumina-text)', border: 'none' }}
              />
            </div>
          )}

          {(activeKind === 'pdf' || activeKind === 'audio') && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleSelectFile(e.dataTransfer.files?.[0] ?? null);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="text-center cursor-pointer transition-colors"
              style={{
                padding: '24px 16px',
                borderRadius: 12,
                border: `1.5px dashed ${
                  isDragging
                    ? 'var(--lumina-accent)'
                    : selectedFile
                    ? 'var(--lumina-success)'
                    : 'var(--lumina-divider)'
                }`,
                background: isDragging
                  ? 'var(--lumina-accent-soft)'
                  : selectedFile
                  ? 'var(--lumina-success-soft)'
                  : 'var(--lumina-surface-alt)',
                marginBottom: 12,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_BY_KIND[activeKind]}
                onChange={(e) => handleSelectFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <FileIcon className="w-8 h-8" style={{ color: 'var(--lumina-success-text)' }} />
                  <p className="font-medium" style={{ fontSize: 13, color: 'var(--lumina-text)' }}>
                    {selectedFile.name}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--lumina-text-faint)' }}>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    style={{
                      fontSize: 11,
                      color: 'var(--lumina-error-text)',
                      background: 'transparent',
                      border: 'none',
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8" style={{ color: 'var(--lumina-text-faint)' }} />
                  <p className="font-medium" style={{ fontSize: 13, color: 'var(--lumina-text)' }}>
                    Drop your file here or click to browse
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--lumina-text-faint)' }}>
                    {activeKind === 'audio'
                      ? 'MP3, WAV, M4A, OGG, WebM, FLAC · max 25 MB'
                      : 'PDF, TXT, DOCX, PPTX · max 10 MB'}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeKind === 'web' && (
            <div
              className="flex items-center gap-2"
              style={{
                background: 'var(--lumina-surface-alt)',
                border: '1px solid var(--lumina-divider)',
                borderRadius: 12,
                padding: '10px 12px',
                marginBottom: 12,
              }}
            >
              <span
                className="lumina-mono"
                style={{ color: 'var(--lumina-text-faint)', fontSize: 13 }}
              >
                ↗
              </span>
              <input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com/article"
                autoFocus
                className="flex-1 outline-none bg-transparent lumina-mono"
                style={{ fontSize: 13, color: 'var(--lumina-text)', border: 'none' }}
              />
            </div>
          )}

          {error && (
            <p
              style={{
                fontSize: 12,
                color: 'var(--lumina-error-text)',
                marginBottom: 12,
              }}
            >
              {error}
            </p>
          )}

          {/* Space selector — chip style */}
          {spaces.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--lumina-text-faint)',
                  marginBottom: 8,
                  fontWeight: 500,
                }}
              >
                Add to space
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedSpaceId(undefined)}
                  className="inline-flex items-center gap-1.5"
                  style={{
                    padding: '5px 10px',
                    borderRadius: 999,
                    background:
                      selectedSpaceId === undefined ? 'var(--lumina-accent-soft)' : 'var(--lumina-surface-alt)',
                    color:
                      selectedSpaceId === undefined ? 'var(--lumina-accent)' : 'var(--lumina-text-dim)',
                    border: `1px solid ${
                      selectedSpaceId === undefined ? 'var(--lumina-accent)' : 'transparent'
                    }`,
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  No space
                </button>
                {spaces.map((s) => {
                  const { color } = spaceColor(s.id);
                  const active = selectedSpaceId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSpaceId(s.id)}
                      className="inline-flex items-center gap-1.5"
                      style={{
                        padding: '5px 10px',
                        borderRadius: 999,
                        background: active ? 'var(--lumina-accent-soft)' : 'var(--lumina-surface-alt)',
                        color: active ? 'var(--lumina-accent)' : 'var(--lumina-text)',
                        border: `1px solid ${active ? 'var(--lumina-accent)' : 'transparent'}`,
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 2,
                          background: color,
                          display: 'inline-block',
                        }}
                      />
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: 'var(--lumina-surface-alt)',
                border: 'none',
                color: 'var(--lumina-text-dim)',
                fontSize: 13,
                fontWeight: 500,
                cursor: isLoading ? 'default' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || (((activeKind === 'pdf' || activeKind === 'audio') && !selectedFile))}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: 'var(--lumina-accent)',
                color: '#fff',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'var(--lumina-shadow-accent)',
                opacity: isLoading || (((activeKind === 'pdf' || activeKind === 'audio') && !selectedFile)) ? 0.6 : 1,
              }}
            >
              {isLoading ? 'Adding…' : 'Add source'}
            </button>
          </div>
        </form>

        {isLoading && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{
              borderRadius: 18,
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <div className="relative">
              <div
                className="animate-spin"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  border: '2px solid rgba(0,122,255,0.18)',
                  borderTopColor: 'var(--lumina-accent)',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Aperture size={20} />
              </div>
            </div>
            <p
              className="font-medium mt-4"
              style={{ fontSize: 13.5, color: 'var(--lumina-text)' }}
            >
              {loadingMessage}
            </p>
            <p style={{ fontSize: 12, color: 'var(--lumina-text-faint)', marginTop: 4 }}>
              This may take a moment
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
