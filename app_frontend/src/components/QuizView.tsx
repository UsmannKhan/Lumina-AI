'use client';

import React, { useEffect, useRef, useState } from 'react';
import Button from './Button';
import { ApertureMini } from './Logo';
import { api } from '@/lib/api';
import { SavedQuiz, KeyConcept } from '@/types';
import clsx from 'clsx';
import {
  Loader2,
  CheckCircle,
  XCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Trophy,
} from 'lucide-react';

interface QuizViewProps {
  chatId: number;
  videoTitle: string;
  sourceType?: string;
  /** Optional deep-link: when this matches an existing quiz's id, the
   *  view auto-starts that quiz as soon as data loads, skipping the
   *  config/list screen. */
  initialQuizId?: number;
}

export default function QuizView({ chatId, initialQuizId }: QuizViewProps) {
  const [viewMode, setViewMode] = useState<'config' | 'quiz' | 'results'>('config');

  const [mcqCount, setMcqCount] = useState(5);
  const [tfCount, setTfCount] = useState(3);
  const [shortCount, setShortCount] = useState(2);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [concepts, setConcepts] = useState<KeyConcept[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [focusPrompt, setFocusPrompt] = useState('');
  const [setName, setSetName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  const [existingQuizzes, setExistingQuizzes] = useState<SavedQuiz[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [currentQuiz, setCurrentQuiz] = useState<SavedQuiz | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | boolean | null>(null);
  const [shortAnswer, setShortAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [isGrading, setIsGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTopicsExpanded, setIsTopicsExpanded] = useState(false);

  useEffect(() => {
    setViewMode('config');
    setCurrentQuiz(null);
    setError(null);
    loadConceptsAndQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // Deep-link: capture `initialQuizId` into a ref on first render per
  // chat. The parent (page.tsx) clears its `pendingDeepLink` state right
  // after activeChat changes — synchronously, before our async data load
  // finishes — so we can't rely on the prop still being there when
  // `existingQuizzes` populates. The ref-snapshot survives that clear.
  const targetQuizIdRef = useRef<{ chatId: number; quizId: number } | null>(null);
  if (initialQuizId !== undefined && targetQuizIdRef.current?.chatId !== chatId) {
    targetQuizIdRef.current = { chatId, quizId: initialQuizId };
  }

  const autoStartedForChatRef = useRef<number | null>(null);
  useEffect(() => {
    const target = targetQuizIdRef.current;
    if (
      !target ||
      target.chatId !== chatId ||
      autoStartedForChatRef.current === chatId ||
      existingQuizzes.length === 0
    ) {
      return;
    }
    const quiz = existingQuizzes.find((q) => q.id === target.quizId);
    if (!quiz) {
      // Quiz might have been deleted between space-view fetch and chat
      // mount — silently fall back to the config/list view.
      autoStartedForChatRef.current = chatId;
      return;
    }
    startQuiz(quiz);
    autoStartedForChatRef.current = chatId;
  }, [existingQuizzes, chatId]);

  const loadConceptsAndQuizzes = async () => {
    setIsLoadingConfig(true);
    try {
      const [conceptsData, quizzesData] = await Promise.all([
        api.getConcepts(chatId),
        api.getQuizzes(chatId),
      ]);
      setConcepts(conceptsData);
      setSelectedTopics(conceptsData.map((c) => c.id));
      setExistingQuizzes(quizzesData.quizzes);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const generateQuiz = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await api.generateQuizWithOptions(chatId, {
        mcq_count: mcqCount,
        tf_count: tfCount,
        short_answer_count: shortCount,
        difficulty,
        topic_ids: selectedTopics.length === concepts.length ? [] : selectedTopics,
        focus_prompt: focusPrompt.trim() || undefined,
        set_name: setName.trim() || undefined,
      });
      const newQuiz: SavedQuiz = {
        id: data.id,
        set_name: data.set_name,
        total_questions: data.total_questions,
        completed: 0,
        difficulty,
        created_at: new Date().toISOString(),
        questions: data.questions,
      };
      setExistingQuizzes((prev) => [newQuiz, ...prev]);
      startQuiz(newQuiz);
    } catch (err) {
      setError('Failed to generate quiz. Please try again.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const startQuiz = (quiz: SavedQuiz) => {
    setCurrentQuiz(quiz);
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShortAnswer('');
    setIsSubmitted(false);
    setFeedback('');
    setViewMode('quiz');
  };

  const toggleTopic = (id: number) =>
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  const selectAllTopics = () => setSelectedTopics(concepts.map((c) => c.id));
  const deselectAllTopics = () => setSelectedTopics([]);

  const currentQuestion = currentQuiz?.questions[currentIndex];

  const checkAnswer = async () => {
    if (!currentQuestion) return;
    if (currentQuestion.type === 'short_answer') {
      if (!shortAnswer.trim()) return;
      setIsGrading(true);
      try {
        let keyPoints: string[] = [];
        try {
          keyPoints = JSON.parse(currentQuestion.explanation || '[]');
        } catch {
          keyPoints = [];
        }
        const result = await api.gradeShortAnswer({
          question: currentQuestion.question,
          ideal_answer: currentQuestion.correct_answer,
          key_points: keyPoints,
          user_answer: shortAnswer,
        });
        setIsCorrect(result.correct);
        setFeedback(result.feedback);
        if (result.correct) setScore((s) => s + 1);
      } catch {
        setFeedback('Failed to grade. Counted as incorrect.');
        setIsCorrect(false);
      } finally {
        setIsGrading(false);
        setIsSubmitted(true);
      }
      return;
    }
    if (selectedAnswer === null) return;
    let correct = false;
    const explanation = currentQuestion.explanation || '';
    if (currentQuestion.type === 'mcq') {
      correct = selectedAnswer === parseInt(currentQuestion.correct_answer);
    } else if (currentQuestion.type === 'true_false') {
      correct = String(selectedAnswer).toLowerCase() === currentQuestion.correct_answer;
    }
    setIsCorrect(correct);
    setFeedback(explanation);
    if (correct) setScore((s) => s + 1);
    setIsSubmitted(true);
  };

  const nextQuestion = () => {
    if (!currentQuiz) return;
    if (currentIndex < currentQuiz.questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShortAnswer('');
      setIsSubmitted(false);
      setIsCorrect(false);
      setFeedback('');
    } else {
      setViewMode('results');
      setExistingQuizzes((prev) =>
        prev.map((q) => (q.id === currentQuiz.id ? { ...q, score } : q))
      );
      api.completeQuiz(currentQuiz.id, score).catch((err) => {
        console.error('Failed to save quiz score:', err);
      });
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid var(--lumina-divider)',
    background: 'var(--lumina-surface)',
    fontSize: 13,
    color: 'var(--lumina-text)',
    outline: 'none',
    fontFamily: 'var(--font-sans)',
  };

  // ============ Config view ============
  if (viewMode === 'config') {
    const totalQuestions = mcqCount + tfCount + shortCount;
    return (
      <div className="flex-1 overflow-y-auto" style={{ padding: '24px 28px 32px' }}>
        <div className="mx-auto" style={{ maxWidth: 720 }}>
          <div className="text-center" style={{ marginBottom: 24 }}>
            <div
              className="inline-flex items-center justify-center"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'var(--lumina-accent-soft)',
                color: 'var(--lumina-accent)',
                marginBottom: 12,
              }}
            >
              <Trophy size={20} />
            </div>
            <h2
              className="font-semibold"
              style={{
                fontSize: 22,
                letterSpacing: '-0.5px',
                margin: '0 0 6px',
                color: 'var(--lumina-text)',
              }}
            >
              Generate quiz
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--lumina-text-dim)', margin: 0 }}>
              Pick the mix and difficulty — Lumina builds it from your source.
            </p>
          </div>

          {isLoadingConfig ? (
            <div
              className="space-y-3 animate-pulse"
              style={{ background: 'var(--lumina-surface-alt)', padding: 24, borderRadius: 14 }}
            >
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 36, borderRadius: 10, background: 'var(--lumina-divider)' }} />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2" style={{ marginBottom: 8 }}>
                {[
                  { label: 'Multiple choice', value: mcqCount, set: setMcqCount, max: 10 },
                  { label: 'True / false', value: tfCount, set: setTfCount, max: 10 },
                  { label: 'Short answer', value: shortCount, set: setShortCount, max: 5 },
                ].map((c) => (
                  <div
                    key={c.label}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'var(--lumina-surface-alt)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        className="font-medium"
                        style={{ fontSize: 11.5, color: 'var(--lumina-text-dim)' }}
                      >
                        {c.label}
                      </label>
                      <span
                        className="font-semibold lumina-mono"
                        style={{ fontSize: 12, color: 'var(--lumina-text)' }}
                      >
                        {c.value}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={c.max}
                      value={c.value}
                      onChange={(e) => c.set(Number(e.target.value))}
                      className="w-full"
                      style={{ accentColor: 'var(--lumina-accent)' }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 8 }}>
                <label
                  className="font-medium block mb-2"
                  style={{ fontSize: 11.5, color: 'var(--lumina-text-faint)', letterSpacing: 0.3, textTransform: 'uppercase' }}
                >
                  Difficulty
                </label>
                <div className="flex gap-1.5">
                  {(['easy', 'medium', 'hard', 'mixed'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className="flex-1 capitalize transition-colors"
                      style={{
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: `1px solid ${
                          difficulty === d ? 'var(--lumina-accent)' : 'var(--lumina-divider)'
                        }`,
                        background: difficulty === d ? 'var(--lumina-accent-soft)' : 'var(--lumina-surface)',
                        color: difficulty === d ? 'var(--lumina-accent)' : 'var(--lumina-text-dim)',
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'var(--lumina-surface-alt)',
                  marginBottom: 8,
                }}
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => concepts.length > 0 && setIsTopicsExpanded(!isTopicsExpanded)}
                >
                  <label
                    className="font-medium cursor-pointer"
                    style={{ fontSize: 12.5, color: 'var(--lumina-text-dim)' }}
                  >
                    Topics
                  </label>
                  <div className="flex items-center gap-2">
                    {concepts.length > 0 && (
                      <span style={{ fontSize: 12, color: 'var(--lumina-text-faint)' }}>
                        {selectedTopics.length === concepts.length
                          ? 'All selected'
                          : `${selectedTopics.length} / ${concepts.length} selected`}
                      </span>
                    )}
                    {concepts.length > 0 && (
                      <ChevronRight
                        size={14}
                        className={clsx('transition-transform', isTopicsExpanded && 'rotate-90')}
                        style={{ color: 'var(--lumina-text-faint)' }}
                      />
                    )}
                  </div>
                </div>
                {concepts.length > 0
                  ? isTopicsExpanded && (
                      <>
                        <div className="flex justify-end gap-2 mt-2 mb-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectAllTopics();
                            }}
                            style={{
                              fontSize: 11.5,
                              color: 'var(--lumina-accent)',
                              background: 'transparent',
                              border: 'none',
                            }}
                          >
                            All
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deselectAllTopics();
                            }}
                            style={{
                              fontSize: 11.5,
                              color: 'var(--lumina-text-faint)',
                              background: 'transparent',
                              border: 'none',
                            }}
                          >
                            Clear
                          </button>
                        </div>
                        <div
                          className="overflow-y-auto"
                          style={{
                            maxHeight: 200,
                            borderTop: '1px solid var(--lumina-divider)',
                            paddingTop: 8,
                          }}
                        >
                          {concepts.map((concept) => (
                            <label
                              key={concept.id}
                              className="flex items-center gap-2.5 cursor-pointer"
                              style={{ padding: '6px 4px', fontSize: 13 }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedTopics.includes(concept.id)}
                                onChange={() => toggleTopic(concept.id)}
                                style={{ width: 14, height: 14, accentColor: 'var(--lumina-accent)' }}
                              />
                              <span className="flex-1 truncate" style={{ color: 'var(--lumina-text)' }}>
                                {concept.title}
                              </span>
                            </label>
                          ))}
                        </div>
                      </>
                    )
                  : (
                    <p
                      className="italic"
                      style={{
                        fontSize: 12,
                        color: 'var(--lumina-text-faint)',
                        marginTop: 6,
                        marginBottom: 0,
                      }}
                    >
                      No key concepts found. Quiz will cover the full content.
                    </p>
                  )}
              </div>

              <input
                type="text"
                value={focusPrompt}
                onChange={(e) => setFocusPrompt(e.target.value)}
                placeholder="Focus area (optional)"
                style={{ ...inputStyle, marginBottom: 8 }}
              />
              <input
                type="text"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder="Quiz name (optional)"
                style={{ ...inputStyle, marginBottom: 14 }}
              />

              {error && (
                <p
                  className="text-center mb-3"
                  style={{ fontSize: 12.5, color: 'var(--lumina-error-text)' }}
                >
                  {error}
                </p>
              )}

              <div className="flex justify-center">
                <Button
                  onClick={generateQuiz}
                  variant="primary"
                  disabled={isGenerating || totalQuestions === 0}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Generating…
                    </>
                  ) : (
                    `Generate ${totalQuestions} questions`
                  )}
                </Button>
              </div>

              {existingQuizzes.length > 0 && (
                <div
                  style={{
                    marginTop: 28,
                    paddingTop: 24,
                    borderTop: '1px solid var(--lumina-divider)',
                  }}
                >
                  <h3
                    className="font-medium"
                    style={{
                      fontSize: 12,
                      color: 'var(--lumina-text-faint)',
                      letterSpacing: 0.3,
                      textTransform: 'uppercase',
                      marginBottom: 12,
                    }}
                  >
                    Previous quizzes
                  </h3>
                  <div className="space-y-2">
                    {existingQuizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="flex items-center justify-between"
                        style={{
                          padding: '12px 14px',
                          borderRadius: 12,
                          background: 'var(--lumina-surface)',
                          border:
                            deleteConfirmId === quiz.id
                              ? '1px solid var(--lumina-error)'
                              : '1px solid var(--lumina-divider)',
                        }}
                      >
                        <button
                          onClick={() => deleteConfirmId !== quiz.id && startQuiz(quiz)}
                          className="flex-1 text-left"
                          disabled={deleteConfirmId === quiz.id}
                          style={{ background: 'transparent', border: 'none' }}
                        >
                          <p
                            className="font-semibold"
                            style={{
                              fontSize: 13.5,
                              color: 'var(--lumina-text)',
                              margin: 0,
                              letterSpacing: '-0.2px',
                            }}
                          >
                            {quiz.set_name}
                          </p>
                          <div
                            className="flex items-center gap-1.5"
                            style={{ fontSize: 11.5, color: 'var(--lumina-text-faint)' }}
                          >
                            <span>{quiz.total_questions} questions</span>
                            <span>·</span>
                            <span className="capitalize">{quiz.difficulty}</span>
                            {quiz.score !== undefined &&
                              quiz.score !== null &&
                              (() => {
                                const percentage =
                                  (quiz.score / quiz.total_questions) * 100;
                                const color =
                                  percentage >= 70
                                    ? 'var(--lumina-success-text)'
                                    : percentage >= 40
                                    ? 'var(--lumina-warn-text)'
                                    : 'var(--lumina-error-text)';
                                return (
                                  <>
                                    <span>·</span>
                                    <span style={{ color, fontWeight: 500 }}>
                                      Score {quiz.score}/{quiz.total_questions}
                                    </span>
                                  </>
                                );
                              })()}
                          </div>
                        </button>
                        {deleteConfirmId === quiz.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExistingQuizzes((prev) => prev.filter((q) => q.id !== quiz.id));
                                setDeleteConfirmId(null);
                                api.deleteQuiz(quiz.id).catch((err) => {
                                  console.error('Failed to delete quiz:', err);
                                });
                              }}
                              style={{
                                padding: '5px 10px',
                                borderRadius: 8,
                                background: 'var(--lumina-error)',
                                color: '#fff',
                                fontSize: 12,
                                fontWeight: 500,
                                border: 'none',
                              }}
                            >
                              Delete
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(null);
                              }}
                              style={{
                                padding: '5px 10px',
                                borderRadius: 8,
                                background: 'var(--lumina-surface-alt)',
                                color: 'var(--lumina-text-dim)',
                                fontSize: 12,
                                fontWeight: 500,
                                border: 'none',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(quiz.id);
                              }}
                              className="flex items-center justify-center"
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                background: 'transparent',
                                color: 'var(--lumina-text-faint)',
                                border: 'none',
                              }}
                              title="Delete quiz"
                            >
                              <Trash2 size={14} />
                            </button>
                            <ChevronRight
                              size={16}
                              style={{ color: 'var(--lumina-text-faint)' }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ============ Results view ============
  if (viewMode === 'results' && currentQuiz) {
    const percentage = Math.round((score / currentQuiz.questions.length) * 100);
    const goodScore = percentage >= 70;
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center" style={{ maxWidth: 420 }}>
          <div
            className="mx-auto flex items-center justify-center"
            style={{
              width: 110,
              height: 110,
              borderRadius: '50%',
              background: goodScore ? 'var(--lumina-success-soft)' : 'var(--lumina-warn-soft)',
              border: `2px solid ${goodScore ? 'var(--lumina-success)' : 'var(--lumina-warn)'}`,
              marginBottom: 20,
            }}
          >
            <span
              className="font-semibold lumina-mono"
              style={{
                fontSize: 30,
                color: goodScore ? 'var(--lumina-success-text)' : 'var(--lumina-warn-text)',
              }}
            >
              {percentage}%
            </span>
          </div>
          <h3
            className="font-semibold"
            style={{
              fontSize: 22,
              letterSpacing: '-0.5px',
              margin: '0 0 6px',
              color: 'var(--lumina-text)',
            }}
          >
            {percentage >= 90
              ? 'Excellent!'
              : percentage >= 70
              ? 'Great job!'
              : percentage >= 50
              ? 'Good effort!'
              : 'Keep studying'}
          </h3>
          <p
            style={{ fontSize: 14, color: 'var(--lumina-text-dim)', marginBottom: 20 }}
          >
            You scored {score} out of {currentQuiz.questions.length}.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => setViewMode('config')} variant="secondary">
              <ChevronLeft size={14} />
              Back
            </Button>
            <Button onClick={() => startQuiz(currentQuiz)} variant="primary">
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============ Quiz view ============
  if (viewMode === 'quiz' && currentQuiz && currentQuestion) {
    const total = currentQuiz.questions.length;
    const difficultyText = (currentQuiz.difficulty || 'mixed').toUpperCase();
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ padding: '14px 28px 0' }}
        >
          <button
            onClick={() => setViewMode('config')}
            className="flex items-center gap-1.5"
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              background: 'transparent',
              border: 'none',
              color: 'var(--lumina-text-dim)',
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            <ChevronLeft size={14} />
            Back
          </button>
          <div
            className="flex items-center gap-3 lumina-mono"
            style={{ fontSize: 11.5, color: 'var(--lumina-text-faint)' }}
          >
            <span>
              Question {currentIndex + 1} / {total}
            </span>
            <span>·</span>
            <span>Score {score} / {currentIndex + (isSubmitted ? 1 : 0)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end" style={{ padding: '8px 28px 0' }}>
          <div
            style={{
              width: 240,
              height: 3,
              background: 'var(--lumina-surface-alt)',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${((currentIndex + 1) / total) * 100}%`,
                height: '100%',
                background: 'var(--lumina-accent)',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto" style={{ padding: '24px 28px' }}>
          <div className="mx-auto" style={{ maxWidth: 720 }}>
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: 14 }}
            >
              <span
                className="inline-flex items-center gap-2 font-semibold"
                style={{
                  fontSize: 11,
                  color: 'var(--lumina-accent)',
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}
              >
                <ApertureMini size={11} />
                {currentQuestion.type === 'mcq'
                  ? 'Multiple choice'
                  : currentQuestion.type === 'true_false'
                  ? 'True / false'
                  : 'Short answer'}
              </span>
              <span
                className="font-semibold"
                style={{
                  fontSize: 11,
                  color: 'var(--lumina-text-faint)',
                  letterSpacing: 0.3,
                }}
              >
                {difficultyText}
              </span>
            </div>

            <h3
              className="font-medium"
              style={{
                fontSize: 22,
                letterSpacing: '-0.5px',
                lineHeight: 1.3,
                color: 'var(--lumina-text)',
                margin: '0 0 24px',
              }}
            >
              {currentQuestion.question}
            </h3>

            {currentQuestion.type === 'mcq' && currentQuestion.options && (
              <div className="space-y-2">
                {currentQuestion.options.map((option, i) => {
                  const correctIdx = parseInt(currentQuestion.correct_answer);
                  const isSel = selectedAnswer === i;
                  const isCorrectChoice = isSubmitted && i === correctIdx;
                  const isWrongChoice = isSubmitted && isSel && i !== correctIdx;
                  return (
                    <button
                      key={i}
                      onClick={() => !isSubmitted && setSelectedAnswer(i)}
                      disabled={isSubmitted}
                      className="w-full flex items-center gap-3 text-left transition-colors"
                      style={{
                        padding: '14px 16px',
                        borderRadius: 12,
                        border: `1px solid ${
                          isCorrectChoice
                            ? 'var(--lumina-success)'
                            : isWrongChoice
                            ? 'var(--lumina-error)'
                            : isSel
                            ? 'var(--lumina-accent)'
                            : 'var(--lumina-divider)'
                        }`,
                        background: isCorrectChoice
                          ? 'var(--lumina-success-soft)'
                          : isWrongChoice
                          ? 'var(--lumina-error-soft)'
                          : isSel
                          ? 'var(--lumina-accent-soft)'
                          : 'var(--lumina-surface)',
                        boxShadow: isSel && !isSubmitted ? '0 0 0 3px rgba(0,122,255,0.10)' : 'none',
                      }}
                    >
                      <span
                        className="flex items-center justify-center font-semibold lumina-mono flex-shrink-0"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          fontSize: 12,
                          background: isCorrectChoice
                            ? 'var(--lumina-success)'
                            : isWrongChoice
                            ? 'var(--lumina-error)'
                            : isSel
                            ? 'var(--lumina-accent)'
                            : 'var(--lumina-surface-alt)',
                          color:
                            isCorrectChoice || isWrongChoice || isSel
                              ? '#fff'
                              : 'var(--lumina-text-dim)',
                        }}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span
                        style={{
                          fontSize: 14.5,
                          color: 'var(--lumina-text)',
                          lineHeight: 1.4,
                        }}
                      >
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'true_false' && (
              <div className="grid grid-cols-2 gap-2">
                {[true, false].map((value) => {
                  const isSel = selectedAnswer === value;
                  const isCorrectChoice =
                    isSubmitted && String(value).toLowerCase() === currentQuestion.correct_answer;
                  const isWrongChoice =
                    isSubmitted &&
                    isSel &&
                    String(value).toLowerCase() !== currentQuestion.correct_answer;
                  return (
                    <button
                      key={String(value)}
                      onClick={() => !isSubmitted && setSelectedAnswer(value)}
                      disabled={isSubmitted}
                      className="font-semibold text-center transition-colors"
                      style={{
                        padding: '20px',
                        borderRadius: 12,
                        border: `1px solid ${
                          isCorrectChoice
                            ? 'var(--lumina-success)'
                            : isWrongChoice
                            ? 'var(--lumina-error)'
                            : isSel
                            ? 'var(--lumina-accent)'
                            : 'var(--lumina-divider)'
                        }`,
                        background: isCorrectChoice
                          ? 'var(--lumina-success-soft)'
                          : isWrongChoice
                          ? 'var(--lumina-error-soft)'
                          : isSel
                          ? 'var(--lumina-accent-soft)'
                          : 'var(--lumina-surface)',
                        color: 'var(--lumina-text)',
                        fontSize: 15,
                        letterSpacing: 0.5,
                        boxShadow: isSel && !isSubmitted ? '0 0 0 3px rgba(0,122,255,0.10)' : 'none',
                      }}
                    >
                      {value ? 'TRUE' : 'FALSE'}
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'short_answer' && (
              <div>
                <textarea
                  value={shortAnswer}
                  onChange={(e) => setShortAnswer(e.target.value)}
                  disabled={isSubmitted}
                  placeholder="Type your answer here…"
                  rows={4}
                  className="w-full outline-none resize-none"
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: `1px solid ${
                      isSubmitted
                        ? isCorrect
                          ? 'var(--lumina-success)'
                          : 'var(--lumina-warn)'
                        : 'var(--lumina-divider)'
                    }`,
                    background: isSubmitted
                      ? isCorrect
                        ? 'var(--lumina-success-soft)'
                        : 'var(--lumina-warn-soft)'
                      : 'var(--lumina-surface)',
                    fontSize: 14,
                    color: 'var(--lumina-text)',
                    fontFamily: 'var(--font-sans)',
                  }}
                />
                {isSubmitted && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'var(--lumina-surface-alt)',
                      border: '1px solid var(--lumina-divider)',
                      marginTop: 10,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 11,
                        color: 'var(--lumina-text-faint)',
                        textTransform: 'uppercase',
                        letterSpacing: 0.3,
                        margin: '0 0 4px',
                      }}
                    >
                      Ideal answer
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--lumina-text-dim)', margin: 0 }}>
                      {currentQuestion.correct_answer}
                    </p>
                  </div>
                )}
              </div>
            )}

            {isSubmitted && (
              <div
                className="mt-4"
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: isCorrect ? 'var(--lumina-success-soft)' : 'var(--lumina-error-soft)',
                  border: `1px solid ${
                    isCorrect ? 'var(--lumina-success)' : 'var(--lumina-error)'
                  }`,
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {isCorrect ? (
                    <CheckCircle size={16} style={{ color: 'var(--lumina-success-text)' }} />
                  ) : (
                    <XCircle size={16} style={{ color: 'var(--lumina-error-text)' }} />
                  )}
                  <span
                    className="font-semibold"
                    style={{
                      fontSize: 13,
                      color: isCorrect ? 'var(--lumina-success-text)' : 'var(--lumina-error-text)',
                    }}
                  >
                    {isCorrect ? 'Correct!' : 'Incorrect'}
                  </span>
                </div>
                {feedback && (
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--lumina-text-dim)',
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {feedback}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          className="flex-shrink-0 flex justify-end"
          style={{
            padding: '12px 28px 16px',
            borderTop: '1px solid var(--lumina-divider)',
          }}
        >
          {!isSubmitted ? (
            <Button
              onClick={checkAnswer}
              variant="primary"
              disabled={
                (currentQuestion.type === 'short_answer'
                  ? !shortAnswer.trim()
                  : selectedAnswer === null) || isGrading
              }
            >
              {isGrading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Grading…
                </>
              ) : (
                'Submit answer'
              )}
            </Button>
          ) : (
            <Button onClick={nextQuestion} variant="primary">
              {currentIndex < currentQuiz.questions.length - 1 ? (
                <>
                  Next question
                  <ArrowRight size={14} />
                </>
              ) : (
                'See results'
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
