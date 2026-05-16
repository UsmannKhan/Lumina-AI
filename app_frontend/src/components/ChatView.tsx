'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { jsPDF } from 'jspdf';
import { Chat, Message, TranscriptSegment } from '@/types';
import { cn } from '@/lib/utils';
import FlashcardsView from './FlashcardsView';
import QuizView from './QuizView';
import CodePracticeView from './CodePracticeView';
import TranscriptView from './TranscriptView';
import ManualNotesEditor from './ManualNotesEditor';
import SelectionBubbleMenu from './SelectionBubbleMenu';
import dynamic from 'next/dynamic';
import {
  Download,
  FileText,
  Layers,
  Trophy,
  Globe,
  ChevronDown,
  Send,
  User,
  Menu,
  Code2,
  PenLine,
  Bot,
  Loader2,
  X,
  Copy,
  Check,
  MessageSquare,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { ApertureMini } from './Logo';
import { spaceColor } from './ChatSidebar';
import { api } from '@/lib/api';

const PdfViewer = dynamic(() => import('./PdfViewer'), {
  ssr: false,
  loading: () => (
    <div
      className="flex-1 flex items-center justify-center"
      style={{ background: 'var(--lumina-surface-alt)' }}
    >
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--lumina-text-faint)' }} />
    </div>
  ),
});

const TextViewer = dynamic(() => import('./TextViewer'), {
  ssr: false,
  loading: () => (
    <div
      className="flex-1 flex items-center justify-center"
      style={{ background: 'var(--lumina-surface-alt)' }}
    >
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--lumina-text-faint)' }} />
    </div>
  ),
});

type ActiveTab = 'notes' | 'chat' | 'flashcards' | 'quiz' | 'code';

interface ChatViewProps {
  chat: Chat;
  messages: Message[];
  onSendMessage: (input: string, useWebSearch: boolean) => Promise<void>;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  isSending: boolean;
  spaceName?: string | null;
  spaceId?: number | null;
  /** Optional deep-link target for the active tab. When provided, the chat
   *  view opens directly on that tab instead of the default Notes tab. */
  initialTab?: ActiveTab;
  /** When `initialTab` is 'flashcards', auto-start this set instead of
   *  landing on the set list. */
  initialFlashcardSetName?: string;
  /** When `initialTab` is 'quiz', auto-start this quiz instead of landing
   *  on the quiz list. */
  initialQuizId?: number;
}

const TABS: { id: ActiveTab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'chat', label: 'Ask', icon: MessageSquare },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'quiz', label: 'Quiz', icon: Trophy },
  { id: 'code', label: 'Practice', icon: Code2 },
];

function sourceMeta(chat: Chat) {
  if (chat.source_type === 'youtube') return 'YouTube';
  if (chat.source_type === 'pdf') return 'PDF';
  if (chat.source_type === 'docx') return 'Document';
  if (chat.source_type === 'txt') return 'Text';
  if (chat.source_type === 'audio') return 'Audio';
  if (chat.source_type === 'website' || chat.source_type === 'web') return 'Webpage';
  return 'Source';
}

/** Renders an audio transcript with `**bold**` markdown markers turned into
 *  real <strong> elements. We deliberately do NOT use the full
 *  MarkdownRenderer here — we want the whitespace-pre-wrap layout (each
 *  newline preserved as a real line break) which a paragraph-block markdown
 *  renderer would collapse. Only the speaker-label bold is special-cased. */
function renderTranscriptWithBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*\n]+?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: 'var(--lumina-text)', fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export default function ChatView({
  chat,
  messages,
  onSendMessage,
  onToggleSidebar,
  isSidebarCollapsed: _isSidebarCollapsed,
  isSending,
  spaceName,
  spaceId,
  initialTab,
  initialFlashcardSetName,
  initialQuizId,
}: ChatViewProps) {
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab ?? 'notes');
  const [isStudyDropdownOpen, setIsStudyDropdownOpen] = useState(false);
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);
  const [transcriptMode, setTranscriptMode] = useState<'collapsed' | 'compact' | 'full'>('compact');
  const [isTranscriptAutoScroll, setIsTranscriptAutoScroll] = useState(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [chatStyle, setChatStyle] = useState<'study' | 'conversational' | 'concise' | 'custom'>(
    (chat.chat_style as 'study' | 'conversational' | 'concise' | 'custom') || 'study'
  );
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false);
  const [customInstructions, setCustomInstructions] = useState(chat.custom_instructions || '');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [notesSubTab, setNotesSubTab] = useState<'ai' | 'manual'>('ai');
  const [manualNotesContent, setManualNotesContent] = useState<string>(chat.manual_notes || '');

  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);

  const [attachedQuote, setAttachedQuote] = useState<string | null>(null);
  const [notesCopied, setNotesCopied] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const studyDropdownRef = useRef<HTMLDivElement>(null);
  const styleDropdownRef = useRef<HTMLDivElement>(null);

  const timedTranscript: TranscriptSegment[] | undefined = chat.timed_content
    ? JSON.parse(chat.timed_content)
    : undefined;

  const isYouTube = chat.source_type === 'youtube';
  const isAudio = chat.source_type === 'audio';

  useEffect(() => {
    setManualNotesContent(chat.manual_notes || '');
    setChatStyle((chat.chat_style as 'study' | 'conversational' | 'concise' | 'custom') || 'study');
    setCustomInstructions(chat.custom_instructions || '');
    setAttachedQuote(null);
    setNotesSubTab('ai');
  }, [chat.id, chat.manual_notes, chat.chat_style, chat.custom_instructions]);

  // Deep-link: if a target tab was provided (e.g., from the space detail
  // view's "Review flashcards" / "Take a quiz" rows), jump to it whenever
  // the chat changes. No-op if initialTab is undefined, so normal sidebar
  // navigation preserves the user's current tab.
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [chat.id, initialTab]);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'chat' && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (studyDropdownRef.current && !studyDropdownRef.current.contains(event.target as Node)) {
        setIsStudyDropdownOpen(false);
      }
      if (styleDropdownRef.current && !styleDropdownRef.current.contains(event.target as Node)) {
        setIsStyleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStyleChange = async (style: 'study' | 'conversational' | 'concise' | 'custom') => {
    if (style === 'custom') {
      setShowCustomInput(true);
      setIsStyleDropdownOpen(false);
      return;
    }
    setChatStyle(style);
    setIsStyleDropdownOpen(false);
    setShowCustomInput(false);
    try {
      await api.updateChatStyle(chat.id, style);
    } catch (err) {
      console.error('Failed to update chat style:', err);
    }
  };

  const handleCustomInstructionsSave = async () => {
    setChatStyle('custom');
    setShowCustomInput(false);
    try {
      await api.updateChatStyle(chat.id, 'custom', customInstructions);
    } catch (err) {
      console.error('Failed to save custom instructions:', err);
    }
  };

  const handleTextSelect = useCallback((text: string, position: { x: number; y: number }) => {
    setSelectedText(text);
    setSelectionPosition(position);
  }, []);

  const handleCloseSelection = useCallback(() => {
    setSelectedText(null);
    setSelectionPosition(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleChatWithSelection = useCallback((text: string) => {
    setActiveTab('chat');
    setAttachedQuote(text);
    inputRef.current?.focus();
  }, []);

  const handleAddToNotes = useCallback((text: string) => {
    setActiveTab('notes');
    setNotesSubTab('manual');
    const newParagraph = `<p>${text}</p>`;
    setManualNotesContent((prev) => (prev ? `${prev}${newParagraph}` : newParagraph));
  }, []);

  const handleExplain = useCallback(
    async (text: string) => {
      setActiveTab('chat');
      await onSendMessage(`Explain: ${text}`, false);
    },
    [onSendMessage]
  );

  const handleDefine = useCallback(
    async (text: string) => {
      setActiveTab('chat');
      await onSendMessage(`Define: ${text}`, false);
    },
    [onSendMessage]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    let message = input;
    if (attachedQuote) {
      message = `Regarding this text: "${attachedQuote}"\n\n${input}`;
      setAttachedQuote(null);
    }
    setInput('');
    await onSendMessage(message, webSearchEnabled);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleExportPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    const checkPage = (needed: number) => {
      if (y + needed > 280) {
        pdf.addPage();
        y = 20;
      }
    };

    const addText = (text: string, fontSize: number, isBold = false, indent = 0) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      const lines = pdf.splitTextToSize(text, maxWidth - indent);
      for (const line of lines) {
        checkPage(fontSize * 0.5);
        pdf.text(line, margin + indent, y);
        y += fontSize * 0.45;
      }
    };

    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    const titleLines = pdf.splitTextToSize(chat.session_name, maxWidth);
    for (const line of titleLines) {
      pdf.text(line, margin, y);
      y += 9;
    }
    y += 14;
    pdf.setDrawColor(200);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 10;

    const lines = chat.notes.split('\n');
    for (const line of lines) {
      if (!line.trim()) {
        y += 3;
        continue;
      }
      const cleanText = (text: string) =>
        text
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/`(.*?)`/g, '$1')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1')
          .trim();
      if (line.startsWith('# ')) {
        checkPage(15);
        y += 6;
        addText(cleanText(line.replace('# ', '')), 18, true);
        y += 4;
      } else if (line.startsWith('## ')) {
        checkPage(12);
        y += 5;
        addText(cleanText(line.replace('## ', '')), 14, true);
        y += 3;
      } else if (line.startsWith('### ')) {
        checkPage(10);
        y += 4;
        addText(cleanText(line.replace('### ', '')), 12, true);
        y += 2;
      } else if (line.startsWith('---')) {
        checkPage(10);
        y += 4;
        pdf.setDrawColor(220);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 6;
      } else if (line.match(/^[\s]*[-*•]\s/)) {
        checkPage(8);
        const indent = (line.match(/^(\s*)/)?.[1]?.length || 0) / 2;
        const text = cleanText(line.replace(/^[\s]*[-*•]\s/, ''));
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('•', margin + indent * 5, y);
        const bulletLines = pdf.splitTextToSize(text, maxWidth - 8 - indent * 5);
        for (let j = 0; j < bulletLines.length; j++) {
          if (j > 0) checkPage(5);
          pdf.text(bulletLines[j], margin + 6 + indent * 5, y);
          y += 5;
        }
      } else if (line.match(/^\d+\.\s/)) {
        checkPage(8);
        const num = line.match(/^(\d+)\./)?.[1] || '1';
        const text = cleanText(line.replace(/^\d+\.\s/, ''));
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${num}.`, margin, y);
        const numLines = pdf.splitTextToSize(text, maxWidth - 10);
        for (let j = 0; j < numLines.length; j++) {
          if (j > 0) checkPage(5);
          pdf.text(numLines[j], margin + 8, y);
          y += 5;
        }
      } else {
        checkPage(8);
        addText(cleanText(line), 10, false);
        y += 1;
      }
    }

    const filename =
      chat.session_name
        .replace(/[^a-z0-9\s]/gi, '')
        .replace(/\s+/g, '_')
        .substring(0, 50) || 'notes';
    pdf.save(`${filename}.pdf`);
  };

  const spaceDot = spaceId ? spaceColor(spaceId).color : 'var(--lumina-text-faint)';
  const showSourcePane =
    isYouTube ||
    isAudio ||
    chat.source_type === 'pdf' ||
    chat.source_type === 'txt' ||
    chat.source_type === 'docx';

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{
        background: 'var(--lumina-surface)',
        borderRadius: 16,
        boxShadow: 'var(--lumina-shadow-md)',
        minWidth: 0,
      }}
    >
      {/* Header — breadcrumb + title only. Tabs live inside the notes pane
          to match the Apple-clean handoff. */}
      <header
        className="flex items-start justify-between gap-4 flex-shrink-0"
        style={{
          padding: '24px 32px',
          borderBottom: '1px solid var(--lumina-divider)',
        }}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden flex items-center justify-center"
            aria-label="Toggle sidebar"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--lumina-surface-alt)',
              color: 'var(--lumina-text-dim)',
              border: 'none',
              flexShrink: 0,
            }}
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <div
              className="flex items-center gap-2 mb-2"
              style={{ fontSize: 12.5, color: 'var(--lumina-text-faint)' }}
            >
              {spaceName && (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 2,
                        background: spaceDot,
                        display: 'inline-block',
                      }}
                    />
                    {spaceName}
                  </span>
                  <span>·</span>
                </>
              )}
              <span>{sourceMeta(chat)}</span>
            </div>
            <h1
              className="font-semibold truncate"
              style={{
                fontSize: 24,
                letterSpacing: '-0.6px',
                margin: 0,
                lineHeight: 1.2,
                color: 'var(--lumina-text)',
              }}
            >
              {chat.session_name}
            </h1>
          </div>
        </div>

        {/* Mobile Tab Dropdown — shown below md only. Desktop tabs render
            inside the notes pane. */}
        <div ref={studyDropdownRef} className="md:hidden relative">
          <button
            onClick={() => setIsStudyDropdownOpen(!isStudyDropdownOpen)}
            className="flex items-center gap-2 font-medium"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: 'var(--lumina-surface-alt)',
              color: 'var(--lumina-text)',
              border: 'none',
              fontSize: 12.5,
            }}
          >
            {(() => {
              const t = TABS.find((x) => x.id === activeTab);
              if (!t) return null;
              const Icon = t.icon;
              return (
                <>
                  <Icon size={14} />
                  {t.label}
                </>
              );
            })()}
            <ChevronDown
              className={cn('transition-transform', isStudyDropdownOpen && 'rotate-180')}
              size={12}
            />
          </button>
          {isStudyDropdownOpen && (
            <div
              className="absolute top-full mt-2 right-0 z-[100] overflow-hidden"
              style={{
                width: 180,
                background: 'var(--lumina-surface)',
                border: '1px solid var(--lumina-divider)',
                borderRadius: 12,
                boxShadow: 'var(--lumina-shadow-md)',
              }}
            >
              {TABS.map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTab(t.id);
                      setIsStudyDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 transition-colors"
                    style={{
                      padding: '10px 14px',
                      fontSize: 13,
                      background: isActive ? 'var(--lumina-accent-soft)' : 'transparent',
                      color: isActive ? 'var(--lumina-accent)' : 'var(--lumina-text-dim)',
                      border: 'none',
                      textAlign: 'left',
                    }}
                  >
                    <Icon size={14} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* Main split */}
      <div className="flex-1 flex min-h-0">
        {/* Source pane — width adapts when video is expanded so the user
            can give the source more room without losing the notes pane. */}
        {showSourcePane && (
          <section
            className="hidden lg:flex flex-col flex-shrink-0 overflow-hidden transition-[width] duration-300"
            style={{
              width: isVideoExpanded
                ? 'clamp(540px, 50%, 760px)'
                : 'clamp(400px, 36%, 500px)',
              borderRight: '1px solid var(--lumina-divider)',
            }}
          >
            {/* PDF Viewer */}
            {!isYouTube && chat.source_type === 'pdf' && (
              <div className="flex-1 flex flex-col min-h-0 relative">
                <PdfViewer pdfUrl={api.getPdfUrl(chat.id)} onTextSelect={handleTextSelect} />
                {selectedText && selectionPosition && (
                  <SelectionBubbleMenu
                    selectedText={selectedText}
                    position={selectionPosition}
                    onChat={handleChatWithSelection}
                    onAddToNotes={handleAddToNotes}
                    onExplain={handleExplain}
                    onDefine={handleDefine}
                    onClose={handleCloseSelection}
                  />
                )}
              </div>
            )}

            {/* Text/DOCX viewer */}
            {!isYouTube && (chat.source_type === 'txt' || chat.source_type === 'docx') && (
              <div className="flex-1 flex flex-col min-h-0 relative">
                <TextViewer
                  content={chat.source_content || ''}
                  fileName={chat.session_name}
                  onTextSelect={handleTextSelect}
                />
                {selectedText && selectionPosition && (
                  <SelectionBubbleMenu
                    selectedText={selectedText}
                    position={selectionPosition}
                    onChat={handleChatWithSelection}
                    onAddToNotes={handleAddToNotes}
                    onExplain={handleExplain}
                    onDefine={handleDefine}
                    onClose={handleCloseSelection}
                  />
                )}
              </div>
            )}

            {/* Audio player — top of source pane for audio chats. */}
            {isAudio && chat.source_id && (
              <div style={{ padding: '24px 28px 16px', flexShrink: 0 }}>
                <div
                  className="relative overflow-hidden"
                  style={{
                    borderRadius: 14,
                    background:
                      'linear-gradient(135deg, #1F1F3A 0%, #3A2F5A 100%)',
                    boxShadow: 'var(--lumina-shadow-sm)',
                    padding: '20px 18px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      height: 56,
                      marginBottom: 16,
                    }}
                  >
                    {Array.from({ length: 36 }).map((_, i) => {
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
                  <audio
                    src={api.getAudioUrl(chat.id)}
                    controls
                    preload="metadata"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}

            {/* YouTube video */}
            {isYouTube && transcriptMode !== 'full' && chat.source_id && (
              <div style={{ padding: '24px 28px 16px', flexShrink: 0 }}>
                <div
                  className="relative group overflow-hidden"
                  style={{
                    aspectRatio: '16/9',
                    borderRadius: 14,
                    background: '#0A0A0B',
                    boxShadow: 'var(--lumina-shadow-sm)',
                  }}
                >
                  <iframe
                    src={`https://www.youtube.com/embed/${chat.source_id}?enablejsapi=1`}
                    title="YouTube video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                  <button
                    onClick={() => setIsVideoExpanded((v) => !v)}
                    aria-label={isVideoExpanded ? 'Collapse video' : 'Expand video'}
                    title={isVideoExpanded ? 'Collapse video' : 'Expand video'}
                    className="absolute opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    style={{
                      top: 10,
                      right: 10,
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: 'rgba(0,0,0,0.55)',
                      color: '#fff',
                      border: 'none',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    {isVideoExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                </div>
              </div>
            )}

            {/* Transcript — sits directly under the video on the same surface,
                no divider, no alt-bg header. Just a clean header row with the
                Auto-scroll / Expand-Compact / Hide pills, like the design's
                "Chapters" toggle. */}
            {isYouTube && (
              <div
                className={cn(
                  'flex flex-col min-h-0 overflow-hidden',
                  transcriptMode === 'full' ? 'flex-1' : transcriptMode === 'compact' ? 'flex-1' : 'h-auto'
                )}
              >
                <div
                  className="flex items-center justify-between flex-shrink-0"
                  style={{ padding: '6px 28px 10px' }}
                >
                  <span
                    className="font-semibold"
                    style={{ fontSize: 14, color: 'var(--lumina-text)' }}
                  >
                    Transcript
                  </span>
                  <div className="flex items-center" style={{ gap: 4 }}>
                    {transcriptMode !== 'collapsed' && (
                      <button
                        onClick={() => setIsTranscriptAutoScroll(!isTranscriptAutoScroll)}
                        className="font-medium transition-colors"
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 11.5,
                          background: isTranscriptAutoScroll
                            ? 'var(--lumina-text)'
                            : 'transparent',
                          color: isTranscriptAutoScroll
                            ? 'var(--lumina-surface)'
                            : 'var(--lumina-text-faint)',
                          border: 'none',
                        }}
                      >
                        Auto-scroll
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (transcriptMode === 'collapsed') setTranscriptMode('compact');
                        else if (transcriptMode === 'compact') setTranscriptMode('full');
                        else setTranscriptMode('compact');
                      }}
                      className="font-medium transition-colors"
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        background: 'transparent',
                        color: 'var(--lumina-text-faint)',
                        border: 'none',
                      }}
                    >
                      {transcriptMode === 'collapsed'
                        ? 'Show'
                        : transcriptMode === 'compact'
                        ? 'Expand'
                        : 'Compact'}
                    </button>
                    {transcriptMode !== 'collapsed' && (
                      <button
                        onClick={() => setTranscriptMode('collapsed')}
                        className="font-medium transition-colors"
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 11.5,
                          background: 'transparent',
                          color: 'var(--lumina-text-faint)',
                          border: 'none',
                        }}
                      >
                        Hide
                      </button>
                    )}
                  </div>
                </div>

                {transcriptMode !== 'collapsed' && timedTranscript && (
                  <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: '0 16px 12px' }}>
                    <TranscriptView
                      transcript={chat.source_content}
                      transcriptTimed={timedTranscript}
                      youtubeId={chat.source_id || ''}
                      hideHeader={true}
                      isAutoScrollControlled={true}
                      autoScrollValue={isTranscriptAutoScroll}
                      onAutoScrollChange={setIsTranscriptAutoScroll}
                      isExpanded={false}
                    />
                  </div>
                )}

                {transcriptMode !== 'collapsed' && !timedTranscript && (
                  <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: '0 28px 16px' }}>
                    <p
                      className="whitespace-pre-wrap"
                      style={{
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: 'var(--lumina-text-dim)',
                      }}
                    >
                      {chat.source_content}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Audio transcript — plain text from the audio source.
                Bold markers (e.g. **Speaker:**) emitted by the AI are
                rendered as real <strong> elements while preserving the
                whitespace-pre-wrap line breaks. */}
            {isAudio && chat.source_content && (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div
                  className="flex items-center flex-shrink-0"
                  style={{ padding: '6px 28px 10px' }}
                >
                  <span
                    className="font-semibold"
                    style={{ fontSize: 14, color: 'var(--lumina-text)' }}
                  >
                    Transcript
                  </span>
                </div>
                <div
                  className="flex-1 min-h-0 overflow-y-auto"
                  style={{ padding: '0 28px 16px' }}
                >
                  <p
                    className="whitespace-pre-wrap"
                    style={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: 'var(--lumina-text-dim)',
                      margin: 0,
                    }}
                  >
                    {renderTranscriptWithBold(chat.source_content)}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Content pane */}
        <section className="flex-1 flex flex-col min-w-0">
          {/* Main tab strip — sits at the top of the notes/content pane and
              switches activeTab. Always visible (md+); mobile uses the
              dropdown in the header. */}
          <div
            className="hidden md:flex items-center justify-start flex-shrink-0"
            style={{ padding: '20px 28px 0' }}
          >
            <div
              className="inline-flex"
              style={{
                padding: 3,
                gap: 1,
                background: 'var(--lumina-surface-alt)',
                borderRadius: 10,
              }}
            >
              {TABS.map((t) => {
                const isActive = activeTab === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className="flex items-center gap-1.5 transition-colors"
                    style={{
                      padding: '7px 14px',
                      borderRadius: 7,
                      border: 'none',
                      background: isActive ? 'var(--lumina-surface)' : 'transparent',
                      color: isActive ? 'var(--lumina-text)' : 'var(--lumina-text-dim)',
                      fontSize: 13,
                      fontWeight: 500,
                      boxShadow: isActive ? 'var(--lumina-shadow-sm)' : 'none',
                    }}
                  >
                    <Icon size={13} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes tab */}
          {activeTab === 'notes' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div
                className="flex items-center justify-between gap-2 flex-shrink-0"
                style={{ padding: '16px 28px 8px' }}
              >
                <div
                  className="inline-flex"
                  style={{ padding: 3, gap: 1, background: 'var(--lumina-surface-alt)', borderRadius: 10 }}
                >
                  <button
                    onClick={() => setNotesSubTab('ai')}
                    className="flex items-center gap-1.5"
                    style={{
                      padding: '6px 12px',
                      borderRadius: 7,
                      border: 'none',
                      background: notesSubTab === 'ai' ? 'var(--lumina-surface)' : 'transparent',
                      color: notesSubTab === 'ai' ? 'var(--lumina-text)' : 'var(--lumina-text-dim)',
                      fontSize: 12.5,
                      fontWeight: 500,
                      boxShadow: notesSubTab === 'ai' ? 'var(--lumina-shadow-sm)' : 'none',
                    }}
                  >
                    <Bot size={13} />
                    AI Generated
                  </button>
                  <button
                    onClick={() => setNotesSubTab('manual')}
                    className="flex items-center gap-1.5"
                    style={{
                      padding: '6px 12px',
                      borderRadius: 7,
                      border: 'none',
                      background: notesSubTab === 'manual' ? 'var(--lumina-surface)' : 'transparent',
                      color: notesSubTab === 'manual' ? 'var(--lumina-text)' : 'var(--lumina-text-dim)',
                      fontSize: 12.5,
                      fontWeight: 500,
                      boxShadow: notesSubTab === 'manual' ? 'var(--lumina-shadow-sm)' : 'none',
                    }}
                  >
                    <PenLine size={13} />
                    My Notes
                  </button>
                </div>

                {notesSubTab === 'ai' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(chat.notes || '');
                        setNotesCopied(true);
                        setTimeout(() => setNotesCopied(false), 2000);
                      }}
                      className="lumina-btn-secondary flex items-center gap-1.5"
                      style={{ padding: '7px 12px', fontSize: 12.5 }}
                      title="Copy to clipboard"
                    >
                      {notesCopied ? <Check size={13} /> : <Copy size={13} />}
                      {notesCopied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="lumina-btn-secondary flex items-center gap-1.5"
                      style={{ padding: '7px 12px', fontSize: 12.5 }}
                    >
                      <Download size={13} />
                      Export
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-hidden">
                {notesSubTab === 'ai' ? (
                  <div className="markdown-content h-full overflow-y-auto">
                    <div
                      className="mx-auto"
                      style={{ maxWidth: 720, padding: '20px 28px 32px' }}
                    >
                      <MarkdownRenderer content={chat.notes} />
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-hidden">
                    <ManualNotesEditor
                      chatId={chat.id}
                      initialContent={manualNotesContent}
                      onSave={async (content) => {
                        setManualNotesContent(content);
                        await api.updateManualNotes(chat.id, content);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'flashcards' && (
            <FlashcardsView chatId={chat.id} videoTitle={chat.session_name} sourceType={chat.source_type} initialSetName={initialFlashcardSetName} />
          )}

          {activeTab === 'quiz' && (
            <QuizView chatId={chat.id} videoTitle={chat.session_name} sourceType={chat.source_type} initialQuizId={initialQuizId} />
          )}

          {activeTab === 'code' && <CodePracticeView chatId={chat.id} />}

          {activeTab === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto" style={{ padding: '20px 28px' }}>
                <div className="mx-auto" style={{ maxWidth: 760 }}>
                  {messages.length === 0 && (
                    <div
                      className="text-center mx-auto flex flex-col items-center justify-center"
                      style={{ padding: '48px 24px', minHeight: 240 }}
                    >
                      <div
                        className="flex items-center justify-center"
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 14,
                          background: 'var(--lumina-accent-soft)',
                          color: 'var(--lumina-accent)',
                          marginBottom: 18,
                        }}
                      >
                        <MessageSquare size={26} />
                      </div>
                      <h3
                        className="font-semibold"
                        style={{
                          fontSize: 20,
                          letterSpacing: '-0.4px',
                          margin: '0 0 6px',
                          color: 'var(--lumina-text)',
                        }}
                      >
                        Ask anything about this source
                      </h3>
                      <p
                        className="mx-auto"
                        style={{
                          fontSize: 14,
                          color: 'var(--lumina-text-dim)',
                          maxWidth: 420,
                          lineHeight: 1.5,
                          margin: 0,
                        }}
                      >
                        Summaries, comparisons, deeper dives — Lumina answers from your source
                        and cites it.
                      </p>
                      <div className="flex flex-wrap justify-center gap-2 mt-6">
                        {[
                          'What are the main takeaways?',
                          'Summarize in 3 bullets',
                          'What was the conclusion?',
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => setInput(suggestion)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 999,
                              border: '1px solid var(--lumina-divider)',
                              background: 'var(--lumina-surface-alt)',
                              color: 'var(--lumina-text-dim)',
                              fontSize: 12.5,
                              cursor: 'pointer',
                            }}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-5">
                    {messages.map((message) => (
                      <div key={message.id} className="space-y-3">
                        <div className="flex gap-3">
                          <div
                            className="flex-shrink-0 flex items-center justify-center"
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 9,
                              background: 'var(--lumina-surface-alt)',
                              color: 'var(--lumina-text-dim)',
                            }}
                          >
                            <User size={15} />
                          </div>
                          <div
                            className="flex-1"
                            style={{
                              fontSize: 15.5,
                              color: 'var(--lumina-text)',
                              lineHeight: 1.6,
                              paddingTop: 6,
                            }}
                          >
                            {message.input}
                          </div>
                        </div>

                        {message.output && (
                          <div className="flex gap-3">
                            <div
                              className="flex-shrink-0 flex items-center justify-center"
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 9,
                                background: 'var(--lumina-accent)',
                                color: '#fff',
                              }}
                            >
                              <ApertureMini size={14} color="#fff" />
                            </div>
                            <div
                              className="flex-1 markdown-content max-w-none"
                              style={{
                                padding: '12px 16px',
                                borderRadius: 12,
                                background: 'var(--lumina-surface-alt)',
                              }}
                            >
                              <MarkdownRenderer content={message.output} />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {isSending && (
                      <div className="flex gap-3">
                        <div
                          className="flex-shrink-0 flex items-center justify-center"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 9,
                            background: 'var(--lumina-accent)',
                            color: '#fff',
                          }}
                        >
                          <ApertureMini size={14} color="#fff" />
                        </div>
                        <div
                          className="flex-1"
                          style={{
                            padding: '6px 14px',
                            borderRadius: 12,
                            background: 'var(--lumina-surface-alt)',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          <div className="typing-indicator">
                            <span />
                            <span />
                            <span />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </div>

              <div
                className="flex-shrink-0"
                style={{ padding: '14px 28px 20px' }}
              >
                <form onSubmit={handleSubmit} className="mx-auto" style={{ maxWidth: 760 }}>
                  {attachedQuote && (
                    <div
                      className="mb-2 inline-flex items-start gap-2 max-w-md"
                      style={{
                        padding: '8px 12px',
                        borderRadius: 10,
                        background: 'var(--lumina-accent-soft)',
                        border: '1px solid rgba(0,122,255,0.18)',
                      }}
                    >
                      <p
                        className="flex-1 italic line-clamp-3"
                        style={{ fontSize: 12.5, color: 'var(--lumina-text-dim)', lineHeight: 1.5, margin: 0 }}
                      >
                        “{attachedQuote.length > 100 ? attachedQuote.slice(0, 100) + '…' : attachedQuote}”
                      </p>
                      <button
                        type="button"
                        onClick={() => setAttachedQuote(null)}
                        className="flex-shrink-0"
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          background: 'transparent',
                          color: 'var(--lumina-text-faint)',
                          border: 'none',
                        }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  )}

                  <div
                    className="flex items-center gap-2"
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: 'var(--lumina-surface-alt)',
                      border: '1px solid var(--lumina-divider)',
                    }}
                  >
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        webSearchEnabled ? 'Ask with web search…' : 'Ask anything about this source…'
                      }
                      rows={1}
                      className="flex-1 outline-none resize-none bg-transparent"
                      style={{
                        fontSize: 14,
                        color: 'var(--lumina-text)',
                        border: 'none',
                        minHeight: 24,
                        maxHeight: 200,
                        lineHeight: 1.5,
                        padding: 0,
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isSending}
                      className="flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-50"
                      style={{
                        width: 28,
                        height: 26,
                        borderRadius: 7,
                        background: 'var(--lumina-accent)',
                        color: '#fff',
                        border: 'none',
                        boxShadow: 'var(--lumina-shadow-accent)',
                      }}
                    >
                      {isSending ? (
                        <div
                          className="animate-spin"
                          style={{
                            width: 13,
                            height: 13,
                            borderRadius: '50%',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTopColor: '#fff',
                          }}
                        />
                      ) : (
                        <Send size={13} />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-2 px-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                      className="flex items-center gap-1.5 transition-colors"
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 500,
                        background: webSearchEnabled
                          ? 'var(--lumina-accent-soft)'
                          : 'var(--lumina-surface-alt)',
                        color: webSearchEnabled ? 'var(--lumina-accent)' : 'var(--lumina-text-dim)',
                        border: 'none',
                      }}
                    >
                      <Globe size={11} />
                      Web search
                    </button>

                    <div ref={styleDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setIsStyleDropdownOpen(!isStyleDropdownOpen)}
                        className="flex items-center gap-1.5 transition-colors"
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 11.5,
                          fontWeight: 500,
                          background: 'var(--lumina-surface-alt)',
                          color: 'var(--lumina-text-dim)',
                          border: 'none',
                        }}
                      >
                        <MessageSquare size={11} />
                        <span className="capitalize">{chatStyle}</span>
                        <ChevronDown
                          size={10}
                          className={cn('transition-transform', isStyleDropdownOpen && 'rotate-180')}
                        />
                      </button>
                      {isStyleDropdownOpen && (
                        <div
                          className="absolute bottom-full mb-2 left-0 z-50 overflow-hidden"
                          style={{
                            width: 180,
                            background: 'var(--lumina-surface)',
                            border: '1px solid var(--lumina-divider)',
                            borderRadius: 12,
                            boxShadow: 'var(--lumina-shadow-md)',
                          }}
                        >
                          {(['study', 'conversational', 'concise', 'custom'] as const).map((style) => (
                            <button
                              key={style}
                              type="button"
                              onClick={() => handleStyleChange(style)}
                              className="w-full flex items-center justify-between transition-colors"
                              style={{
                                padding: '8px 12px',
                                fontSize: 12.5,
                                background:
                                  chatStyle === style ? 'var(--lumina-accent-soft)' : 'transparent',
                                color:
                                  chatStyle === style ? 'var(--lumina-accent)' : 'var(--lumina-text-dim)',
                                border: 'none',
                                textAlign: 'left',
                              }}
                            >
                              <span className="capitalize">{style}</span>
                              {style === 'study' && (
                                <span
                                  style={{ fontSize: 10, color: 'var(--lumina-text-faint)' }}
                                >
                                  Default
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {showCustomInput && (
                    <div
                      className="mt-3"
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        background: 'var(--lumina-surface)',
                        border: '1px solid var(--lumina-divider)',
                      }}
                    >
                      <label
                        className="block mb-2"
                        style={{ fontSize: 12, color: 'var(--lumina-text-dim)' }}
                      >
                        Custom instructions
                      </label>
                      <textarea
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        placeholder="Tell the AI how you want it to respond…"
                        rows={3}
                        className="w-full outline-none resize-none"
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1px solid var(--lumina-divider)',
                          background: 'var(--lumina-surface)',
                          fontSize: 13,
                          color: 'var(--lumina-text)',
                        }}
                      />
                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => setShowCustomInput(false)}
                          className="lumina-btn-secondary"
                          style={{ padding: '6px 12px', fontSize: 12.5 }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleCustomInstructionsSave}
                          className="lumina-btn-primary"
                          style={{ padding: '6px 14px', fontSize: 12.5, color: '#fff' }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
