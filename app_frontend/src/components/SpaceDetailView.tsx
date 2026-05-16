'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Chat, Space, SpaceFlashcard, SpaceQuizSummary } from '@/types';
import { ChevronLeft, ChevronRight, GraduationCap, Layers, Menu, MessageSquare, Plus, Trophy } from 'lucide-react';
import { spaceColor } from './ChatSidebar';
import { SessionTile, AddTile } from './library-tiles';
import { api } from '@/lib/api';

/** Optional deep-link target when opening a chat from the space view.
 *  Carries enough info for ChatView to land on the right tab AND start the
 *  exact set/quiz the user clicked, instead of just landing on the list. */
export type ChatOpenTarget =
  | { tab: 'flashcards'; setName: string }
  | { tab: 'quiz'; quizId: number };

interface SpaceDetailViewProps {
  space: Space;
  chats: Chat[];
  spaces: Space[];
  onBack: () => void;
  onSelectChat: (chat: Chat, target?: ChatOpenTarget) => void;
  onNewChat: () => void;
  /** Mobile-only sidebar toggle. Floating chevron is hidden on mobile so each
   *  view's header includes a hamburger that opens the sidebar overlay. */
  onToggleSidebar: () => void;
}

/** A flashcard "set" — a unique (chat_id, set_name) bucket of cards from a
 *  single source. We aggregate per-source cards into sets for display. */
interface FlashcardSet {
  chat_id: number;
  chat_name: string;
  chat_source_type: string;
  set_name: string;
  card_count: number;
}

function groupFlashcardsIntoSets(cards: SpaceFlashcard[]): FlashcardSet[] {
  const buckets = new Map<string, FlashcardSet>();
  for (const c of cards) {
    const setName = c.set_name || 'Untitled set';
    const key = `${c.chat_id}:::${setName}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.card_count += 1;
    } else {
      buckets.set(key, {
        chat_id: c.chat_id,
        chat_name: c.chat_name,
        chat_source_type: c.chat_source_type,
        set_name: setName,
        card_count: 1,
      });
    }
  }
  return Array.from(buckets.values());
}

export default function SpaceDetailView({
  space,
  chats,
  spaces,
  onBack,
  onSelectChat,
  onNewChat,
  onToggleSidebar,
}: SpaceDetailViewProps) {
  const { color, tint } = spaceColor(space.id);
  const spaceChats = chats
    .filter((c) => c.space_id === space.id)
    .sort((a, b) => b.id - a.id);

  const [flashcards, setFlashcards] = useState<SpaceFlashcard[]>([]);
  const [quizzes, setQuizzes] = useState<SpaceQuizSummary[]>([]);
  const [loadingAggregates, setLoadingAggregates] = useState(true);
  // Pills act as collapsible disclosures — both can be open simultaneously,
  // both default closed so Sources stays the visual focus on arrival.
  const [flashcardsExpanded, setFlashcardsExpanded] = useState(false);
  const [quizzesExpanded, setQuizzesExpanded] = useState(false);

  // Fetch aggregated flashcards + quizzes whenever the space changes
  useEffect(() => {
    let cancelled = false;
    setLoadingAggregates(true);
    Promise.all([
      api.getSpaceFlashcards(space.id).catch((err) => {
        console.error('Failed to load space flashcards:', err);
        return [] as SpaceFlashcard[];
      }),
      api.getSpaceQuizzes(space.id).catch((err) => {
        console.error('Failed to load space quizzes:', err);
        return [] as SpaceQuizSummary[];
      }),
    ]).then(([fc, qz]) => {
      if (cancelled) return;
      setFlashcards(fc);
      setQuizzes(qz);
      setLoadingAggregates(false);
    });
    return () => {
      cancelled = true;
    };
  }, [space.id]);

  const flashcardSets = useMemo(
    () => groupFlashcardsIntoSets(flashcards),
    [flashcards]
  );

  // Helper: open a source chat by id with an optional target tab. Used
  // when clicking a flashcard set (→ flashcards tab) or quiz row (→ quiz
  // tab). Falls back silently if the chat can't be found.
  const openChatById = (chatId: number, target?: ChatOpenTarget) => {
    const chat = chats.find((c) => c.id === chatId);
    if (chat) onSelectChat(chat, target);
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
      <div className="flex-1 overflow-auto">
        {/* Hero — uses the space's color tint, fading into the white surface
            below. Mirrors the design's ap-space.jsx hero gradient. */}
        <div
          className="px-4 md:px-12 pt-6 md:pt-8 pb-7"
          style={{
            borderBottom: '1px solid var(--lumina-divider)',
            background: `linear-gradient(180deg, ${tint} 0%, var(--lumina-surface) 100%)`,
          }}
        >
          <div
            className="flex items-center gap-2"
            style={{ fontSize: 12.5, color: 'var(--lumina-text-dim)', marginBottom: 14 }}
          >
            {/* Mobile-only sidebar hamburger. Sits next to the breadcrumb on
                the left so users can reach the sidebar without a floating
                button. Hidden on lg+ where the floating chevron is back. */}
            <button
              onClick={onToggleSidebar}
              aria-label="Open sidebar"
              className="lg:hidden flex items-center justify-center flex-shrink-0"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--lumina-surface-alt)',
                color: 'var(--lumina-text-dim)',
                border: 'none',
                marginRight: 4,
              }}
            >
              <Menu size={18} />
            </button>
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
                  className="flex items-center gap-2"
                  style={{ fontSize: 13, color: 'var(--lumina-text-dim)' }}
                >
                  <span>
                    <strong style={{ color: 'var(--lumina-text)' }}>{spaceChats.length}</strong>{' '}
                    {spaceChats.length === 1 ? 'source' : 'sources'}
                  </span>
                  <span style={{ color: 'var(--lumina-text-faint)' }}>•</span>
                  <span>
                    {loadingAggregates ? (
                      <span style={{ color: 'var(--lumina-text-faint)' }}>— flashcards</span>
                    ) : (
                      <>
                        <strong style={{ color: 'var(--lumina-text)' }}>{flashcards.length}</strong>{' '}
                        {flashcards.length === 1 ? 'flashcard' : 'flashcards'}
                      </>
                    )}
                  </span>
                  <span style={{ color: 'var(--lumina-text-faint)' }}>•</span>
                  <span>
                    {loadingAggregates ? (
                      <span style={{ color: 'var(--lumina-text-faint)' }}>— quizzes</span>
                    ) : (
                      <>
                        <strong style={{ color: 'var(--lumina-text)' }}>{quizzes.length}</strong>{' '}
                        {quizzes.length === 1 ? 'quiz' : 'quizzes'}
                      </>
                    )}
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

        {/* Action cards — four cards above Sources. Stack vertically on
            mobile (so labels + subtitles remain readable); switch to a
            4-across grid on md+. */}
        <div
          className="grid gap-3 grid-cols-1 md:grid-cols-4 px-4 md:px-12 pt-5"
        >
          <ActionCard
            icon={<MessageSquare size={16} />}
            label="Ask across this space"
            subtitle="Coming soon"
            disabled
          />
          <ActionCard
            icon={<Layers size={16} />}
            label="Review flashcards"
            subtitle={flashcardsActionSubtitle(flashcards.length, flashcardSets.length, loadingAggregates)}
            disabled={loadingAggregates || flashcards.length === 0}
            expanded={flashcardsExpanded}
            onClick={() => setFlashcardsExpanded((v) => !v)}
          />
          <ActionCard
            icon={<Trophy size={16} />}
            label="Take a quiz"
            subtitle={quizzesActionSubtitle(quizzes.length, loadingAggregates)}
            disabled={loadingAggregates || quizzes.length === 0}
            expanded={quizzesExpanded}
            onClick={() => setQuizzesExpanded((v) => !v)}
          />
          <ActionCard
            icon={<GraduationCap size={16} />}
            label="Take an exam"
            subtitle="Coming soon"
            disabled
          />
        </div>

        {/* Flashcards — appears between the pills row and the Sources section. */}
        {!loadingAggregates && flashcardSets.length > 0 && flashcardsExpanded && (
          <div className="px-4 md:px-12 pt-5">
            <SectionHeader title="Flashcards" count={flashcards.length} />
            <div className="flex flex-col gap-2">
              {flashcardSets.map((s) => (
                <AggregatedRow
                  key={`${s.chat_id}:::${s.set_name}`}
                  title={s.set_name}
                  source={s.chat_name}
                  meta={`${s.card_count} ${s.card_count === 1 ? 'card' : 'cards'}`}
                  onClick={() =>
                    openChatById(s.chat_id, { tab: 'flashcards', setName: s.set_name })
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Quizzes — appears between the pills row and the Sources section. */}
        {!loadingAggregates && quizzes.length > 0 && quizzesExpanded && (
          <div className="px-4 md:px-12 pt-5">
            <SectionHeader title="Quizzes" count={quizzes.length} />
            <div className="flex flex-col gap-2">
              {quizzes.map((q) => (
                <AggregatedRow
                  key={q.id}
                  title={q.set_name || 'Untitled quiz'}
                  source={q.chat_name}
                  meta={quizMetaLabel(q)}
                  onClick={() => openChatById(q.chat_id, { tab: 'quiz', quizId: q.id })}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
        <div className="px-4 md:px-12 pt-6 pb-8">
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

/* ─── Subcomponents ───────────────────────────────────────────────────── */

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
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
        {title}
        <span style={{ fontSize: 13, color: 'var(--lumina-text-faint)', fontWeight: 400 }}>
          {count}
        </span>
      </h2>
    </div>
  );
}

interface AggregatedRowProps {
  title: string;
  source: string;
  meta: string;
  onClick: () => void;
}

/** Shared row for an aggregated flashcard set or quiz. Click takes the user
 *  to the originating source chat, where they can use the existing
 *  per-source flashcard / quiz views. */
function AggregatedRow({ title, source, meta, onClick }: AggregatedRowProps) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="text-left transition-all"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        alignItems: 'center',
        gap: 16,
        padding: '14px 18px',
        borderRadius: 12,
        background: hover ? 'var(--lumina-surface-hover, #F5F5F7)' : 'var(--lumina-surface-alt)',
        border: '1px solid var(--lumina-divider)',
        cursor: 'pointer',
        transform: hover ? 'translateY(-1px)' : 'none',
        boxShadow: hover ? '0 2px 6px rgba(15,15,20,0.05)' : 'none',
      }}
    >
      <div className="min-w-0">
        <div
          className="truncate"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--lumina-text)',
            marginBottom: 2,
          }}
        >
          {title}
        </div>
        <div
          className="truncate"
          style={{ fontSize: 12.5, color: 'var(--lumina-text-dim)' }}
        >
          from {source}
        </div>
      </div>
      <span
        style={{
          fontSize: 12,
          color: 'var(--lumina-text-dim)',
          whiteSpace: 'nowrap',
        }}
      >
        {meta}
      </span>
      <ChevronRight
        size={16}
        style={{
          color: hover ? 'var(--lumina-text-dim)' : 'var(--lumina-text-faint)',
          transition: 'transform 0.15s, color 0.15s',
          transform: hover ? 'translateX(2px)' : 'none',
        }}
      />
    </button>
  );
}

interface ActionCardProps {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  disabled?: boolean;
  expanded?: boolean;
  onClick?: () => void;
}

/** Top-of-space action card — the design pattern from the mockup.
 *  Three of these stack horizontally above the Sources section. Each one
 *  surfaces a top-level action (chat across the space, review flashcards,
 *  take a quiz). The "Coming soon" variant is rendered with `disabled` and
 *  no `onClick`. Active cards toggle inline content below the row. */
function ActionCard({
  icon,
  label,
  subtitle,
  disabled,
  expanded,
  onClick,
}: ActionCardProps) {
  const [hover, setHover] = useState(false);
  const interactive = !disabled && !!onClick;

  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-expanded={expanded}
      disabled={!interactive}
      className="text-left"
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 14,
        // Default surface is the muted "shelf" color — slightly grey vs. the
        // pure-white Sources section below, so the cards read as their own
        // band. Expanded shifts to soft-accent for clear active state.
        background: expanded
          ? 'var(--lumina-accent-soft)'
          : hover && interactive
          ? 'var(--lumina-surface-hover, #ECECEE)'
          : 'var(--lumina-surface-alt)',
        border: `1px solid ${
          expanded ? 'rgba(0,122,255,0.25)' : 'var(--lumina-divider)'
        }`,
        cursor: interactive ? 'pointer' : 'default',
        opacity: disabled ? 0.6 : 1,
        transition: 'background 0.15s, border-color 0.15s',
        boxShadow: expanded ? '0 1px 2px rgba(0,122,255,0.06)' : 'none',
        minWidth: 0, // allow children to truncate
      }}
    >
      {/* Icon in square-rounded soft-accent tile — geometry echoes the card
          itself (rounded rectangle inside rounded rectangle). Icon stays
          accent-blue across all states for consistency with the design. */}
      <span
        className="inline-flex items-center justify-center flex-shrink-0"
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: expanded
            ? 'var(--lumina-surface)'
            : 'var(--lumina-accent-soft)',
          color: 'var(--lumina-accent)',
        }}
      >
        {icon}
      </span>

      {/* Label + subtitle */}
      <span className="min-w-0">
        <span
          className="block truncate"
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: expanded ? 'var(--lumina-accent)' : 'var(--lumina-text)',
            lineHeight: 1.3,
          }}
        >
          {label}
        </span>
        <span
          className="block truncate"
          style={{
            fontSize: 12,
            color: expanded ? 'var(--lumina-accent)' : 'var(--lumina-text-dim)',
            opacity: expanded ? 0.85 : 1,
            lineHeight: 1.35,
            marginTop: 1,
          }}
        >
          {subtitle}
        </span>
      </span>

      {/* Right chevron — points right when collapsed, rotates down when
          expanded. Hidden entirely when the card is disabled. */}
      {interactive && (
        <ChevronRight
          size={15}
          style={{
            color: expanded ? 'var(--lumina-accent)' : 'var(--lumina-text-faint)',
            transition: 'transform 0.18s, color 0.15s',
            transform: expanded ? 'rotate(90deg)' : 'none',
            flexShrink: 0,
          }}
        />
      )}
    </button>
  );
}

/** Subtitle text for the "Review flashcards" action card. */
function flashcardsActionSubtitle(
  cardCount: number,
  setCount: number,
  loading: boolean
): string {
  if (loading) return 'Loading…';
  if (cardCount === 0) return 'No flashcards yet';
  const cardsLabel = `${cardCount} ${cardCount === 1 ? 'card' : 'cards'}`;
  if (setCount <= 1) return cardsLabel;
  return `${cardsLabel} across ${setCount} sets`;
}

/** Subtitle text for the "Take a quiz" action card. */
function quizzesActionSubtitle(quizCount: number, loading: boolean): string {
  if (loading) return 'Loading…';
  if (quizCount === 0) return 'No quizzes yet';
  return `${quizCount} ${quizCount === 1 ? 'quiz' : 'quizzes'} available`;
}

function quizMetaLabel(q: SpaceQuizSummary): string {
  const parts: string[] = [];
  if (q.total_questions != null) {
    parts.push(`${q.total_questions} ${q.total_questions === 1 ? 'question' : 'questions'}`);
  }
  if (q.completed === 2 && q.score != null && q.total_questions) {
    parts.push(`${q.score}/${q.total_questions}`);
  } else if (q.completed === 2 && q.score != null) {
    parts.push(`Score ${q.score}`);
  }
  return parts.join(' • ') || '—';
}
