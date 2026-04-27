'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { CodingProblem, CodeEvaluationResponse } from '@/types';
import { api } from '@/lib/api';
import Button from './Button';
import {
  Loader2,
  Code2,
  Lightbulb,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
} from 'lucide-react';
import clsx from 'clsx';
import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface CodePracticeViewProps {
  chatId: number;
}

type ViewMode = 'loading' | 'not_cs' | 'list' | 'problem';

const DIFFICULTY_STYLE: Record<'easy' | 'medium' | 'hard', { color: string; label: string }> = {
  easy: { color: '#067647', label: 'EASY' },
  medium: { color: '#CA8A04', label: 'MEDIUM' },
  hard: { color: '#B42318', label: 'HARD' },
};

export default function CodePracticeView({ chatId }: CodePracticeViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('loading');
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem | null>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<CodeEvaluationResponse | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [revealedHints, setRevealedHints] = useState<number>(0);
  const [showSolution, setShowSolution] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(true);

  const csCheckDone = useRef(false);
  const isCsVideo = useRef(true);

  useEffect(() => {
    loadProblems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const loadProblems = async () => {
    if (csCheckDone.current && !isCsVideo.current) {
      setViewMode('not_cs');
      return;
    }
    if (problems.length > 0) {
      setViewMode('list');
      return;
    }
    setViewMode('loading');
    try {
      const data = await api.getCodeProblems(chatId);
      csCheckDone.current = true;
      isCsVideo.current = data.is_cs_video;
      if (!data.is_cs_video) {
        setViewMode('not_cs');
      } else if (data.problems.length > 0) {
        setProblems(data.problems);
        setViewMode('list');
      } else {
        setViewMode('list');
      }
    } catch (err) {
      console.error('Failed to load problems:', err);
      setError('Failed to load code practice');
      setViewMode('list');
    }
  };

  const generateProblems = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await api.generateCodeProblems(chatId);
      setProblems(data.problems);
    } catch (err) {
      console.error('Failed to generate:', err);
      setError('Failed to generate problems. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const openProblem = (problem: CodingProblem) => {
    setSelectedProblem(problem);
    setCode(getStarterCode(language));
    setEvaluation(null);
    setShowHints(false);
    setRevealedHints(0);
    setShowSolution(false);
    setIsFeedbackExpanded(true);
    setViewMode('problem');
  };

  const getStarterCode = (lang: string): string => {
    switch (lang) {
      case 'python':
        return '# Write your solution here\n\ndef solution():\n    pass\n';
      case 'javascript':
        return '// Write your solution here\n\nfunction solution() {\n  \n}\n';
      case 'typescript':
        return '// Write your solution here\n\nfunction solution(): void {\n  \n}\n';
      case 'java':
        return '// Write your solution here\n\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n';
      case 'cpp':
        return '// Write your solution here\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n';
      default:
        return '// Write your solution here\n';
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (!code || code === getStarterCode(language)) {
      setCode(getStarterCode(newLang));
    }
  };

  const submitCode = async () => {
    if (!selectedProblem || !code.trim()) return;
    setIsEvaluating(true);
    setEvaluation(null);
    setIsFeedbackExpanded(true);
    try {
      const result = await api.evaluateCode(chatId, {
        problem_id: selectedProblem.id,
        code,
        language,
      });
      setEvaluation(result);
    } catch (err) {
      console.error('Evaluation failed:', err);
      setError('Failed to evaluate code. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const toggleHints = () => {
    if (!showHints) {
      setShowHints(true);
      setRevealedHints(1);
    } else {
      setShowHints(false);
    }
  };

  const revealNextHint = () => {
    if (selectedProblem && revealedHints < selectedProblem.hints.length) {
      setRevealedHints((prev) => prev + 1);
    }
  };

  // ============ Loading ============
  if (viewMode === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2
            className="w-7 h-7 animate-spin mx-auto mb-3"
            style={{ color: 'var(--lumina-accent)' }}
          />
          <p style={{ fontSize: 13, color: 'var(--lumina-text-faint)' }}>Checking content…</p>
        </div>
      </div>
    );
  }

  // ============ Not CS ============
  if (viewMode === 'not_cs') {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center" style={{ maxWidth: 420 }}>
          <div
            className="mx-auto flex items-center justify-center"
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'var(--lumina-surface-alt)',
              marginBottom: 16,
            }}
          >
            <Code2 size={26} style={{ color: 'var(--lumina-text-faint)' }} />
          </div>
          <h3
            className="font-semibold"
            style={{
              fontSize: 18,
              letterSpacing: '-0.4px',
              margin: '0 0 8px',
              color: 'var(--lumina-text)',
            }}
          >
            Not a programming source
          </h3>
          <p style={{ fontSize: 13.5, color: 'var(--lumina-text-dim)', margin: 0, lineHeight: 1.5 }}>
            Practice works best with programming tutorials and CS lectures. This source doesn&apos;t
            seem to cover coding topics.
          </p>
        </div>
      </div>
    );
  }

  // ============ Problem list ============
  if (viewMode === 'list') {
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
              <Code2 size={20} />
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
              Code practice
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--lumina-text-dim)', margin: 0 }}>
              Apply concepts from your source in a real editor.
            </p>
          </div>

          {problems.length === 0 ? (
            <div className="text-center" style={{ padding: '8px 0' }}>
              <p style={{ fontSize: 14, color: 'var(--lumina-text-dim)', marginBottom: 20 }}>
                Generate coding problems based on this source.
              </p>
              {error && (
                <p style={{ fontSize: 12.5, color: 'var(--lumina-error-text)', marginBottom: 12 }}>
                  {error}
                </p>
              )}
              <Button onClick={generateProblems} variant="primary" disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Generating…
                  </>
                ) : (
                  'Generate problems'
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {problems.map((problem) => {
                  const diff = DIFFICULTY_STYLE[problem.difficulty] || DIFFICULTY_STYLE.medium;
                  return (
                    <button
                      key={problem.id}
                      onClick={() => openProblem(problem)}
                      className="w-full text-left transition-colors group"
                      style={{
                        padding: '14px 16px',
                        borderRadius: 12,
                        background: 'var(--lumina-surface)',
                        border: '1px solid var(--lumina-divider)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--lumina-surface-alt)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--lumina-surface)';
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3
                          className="font-semibold"
                          style={{
                            fontSize: 14,
                            letterSpacing: '-0.2px',
                            color: 'var(--lumina-text)',
                            margin: 0,
                          }}
                        >
                          {problem.title}
                        </h3>
                        <span
                          className="font-semibold"
                          style={{ fontSize: 11, color: diff.color, letterSpacing: 0.3 }}
                        >
                          {diff.label}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 12.5,
                          color: 'var(--lumina-text-dim)',
                          lineHeight: 1.5,
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {problem.description}
                      </p>
                      <div
                        className="flex items-center gap-2 mt-2"
                        style={{ fontSize: 11.5, color: 'var(--lumina-text-faint)' }}
                      >
                        <span>{problem.examples.length} examples</span>
                        <span>·</span>
                        <span>{problem.hints.length} hints</span>
                        <ChevronRight
                          size={14}
                          className="ml-auto"
                          style={{ color: 'var(--lumina-text-faint)' }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div
                className="flex justify-center"
                style={{
                  marginTop: 24,
                  paddingTop: 20,
                  borderTop: '1px solid var(--lumina-divider)',
                }}
              >
                <Button onClick={generateProblems} variant="secondary" disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Regenerating…
                    </>
                  ) : (
                    'Regenerate problems'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ============ Problem detail ============
  if (viewMode === 'problem' && selectedProblem) {
    const diff = DIFFICULTY_STYLE[selectedProblem.difficulty] || DIFFICULTY_STYLE.medium;
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center justify-between"
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--lumina-divider)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setViewMode('list')}
              className="flex items-center justify-center"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'transparent',
                color: 'var(--lumina-text-dim)',
                border: 'none',
              }}
              aria-label="Back to list"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="min-w-0">
              <h2
                className="font-semibold truncate"
                style={{
                  fontSize: 14,
                  letterSpacing: '-0.2px',
                  margin: 0,
                  color: 'var(--lumina-text)',
                }}
              >
                {selectedProblem.title}
              </h2>
              <span
                className="font-semibold"
                style={{ fontSize: 10.5, color: diff.color, letterSpacing: 0.3 }}
              >
                {diff.label}
              </span>
            </div>
          </div>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid var(--lumina-divider)',
              background: 'var(--lumina-surface)',
              fontSize: 12.5,
              color: 'var(--lumina-text)',
              outline: 'none',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: prompt */}
          <section
            className="overflow-y-auto"
            style={{
              width: '40%',
              minWidth: 320,
              padding: '20px 24px',
              borderRight: '1px solid var(--lumina-divider)',
            }}
          >
            <h3
              className="font-semibold"
              style={{
                fontSize: 13,
                color: 'var(--lumina-text)',
                margin: '0 0 8px',
                letterSpacing: '-0.2px',
              }}
            >
              Problem
            </h3>
            <p
              className="whitespace-pre-wrap"
              style={{
                fontSize: 13.5,
                color: 'var(--lumina-text-dim)',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {selectedProblem.description}
            </p>

            {selectedProblem.examples.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h4
                  className="font-semibold"
                  style={{
                    fontSize: 13,
                    color: 'var(--lumina-text)',
                    margin: '0 0 8px',
                    letterSpacing: '-0.2px',
                  }}
                >
                  Examples
                </h4>
                {selectedProblem.examples.map((ex, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background: 'var(--lumina-surface-alt)',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <span
                        className="font-medium"
                        style={{
                          fontSize: 11,
                          color: 'var(--lumina-text-faint)',
                          letterSpacing: 0.3,
                          textTransform: 'uppercase',
                        }}
                      >
                        Input
                      </span>
                      <pre
                        className="lumina-mono"
                        style={{
                          fontSize: 12,
                          color: 'var(--lumina-text)',
                          background: 'var(--lumina-surface)',
                          border: '1px solid var(--lumina-divider)',
                          borderRadius: 8,
                          padding: '6px 8px',
                          marginTop: 4,
                          marginBottom: 0,
                          overflowX: 'auto',
                        }}
                      >
                        {ex.input}
                      </pre>
                    </div>
                    <div>
                      <span
                        className="font-medium"
                        style={{
                          fontSize: 11,
                          color: 'var(--lumina-text-faint)',
                          letterSpacing: 0.3,
                          textTransform: 'uppercase',
                        }}
                      >
                        Output
                      </span>
                      <pre
                        className="lumina-mono"
                        style={{
                          fontSize: 12,
                          color: 'var(--lumina-text)',
                          background: 'var(--lumina-surface)',
                          border: '1px solid var(--lumina-divider)',
                          borderRadius: 8,
                          padding: '6px 8px',
                          marginTop: 4,
                          marginBottom: 0,
                          overflowX: 'auto',
                        }}
                      >
                        {ex.output}
                      </pre>
                    </div>
                    {ex.explanation && (
                      <p
                        className="italic"
                        style={{
                          fontSize: 11.5,
                          color: 'var(--lumina-text-faint)',
                          marginTop: 6,
                          marginBottom: 0,
                        }}
                      >
                        {ex.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <button
                onClick={toggleHints}
                className="flex items-center gap-1.5 font-medium"
                style={{
                  fontSize: 12.5,
                  color: 'var(--lumina-accent)',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                }}
              >
                <Lightbulb size={13} />
                {showHints ? 'Hide hints' : 'Show hints'}
              </button>

              {showHints && selectedProblem.hints.length > 0 && (
                <div className="space-y-2 mt-2">
                  {selectedProblem.hints.slice(0, revealedHints).map((hint, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        background: 'var(--lumina-accent-soft)',
                      }}
                    >
                      <span
                        className="font-semibold"
                        style={{
                          fontSize: 11,
                          color: 'var(--lumina-accent)',
                          letterSpacing: 0.3,
                          textTransform: 'uppercase',
                        }}
                      >
                        Hint {i + 1}
                      </span>
                      <p
                        style={{
                          fontSize: 13,
                          color: 'var(--lumina-text)',
                          margin: '4px 0 0',
                          lineHeight: 1.5,
                        }}
                      >
                        {hint}
                      </p>
                    </div>
                  ))}
                  {revealedHints < selectedProblem.hints.length && (
                    <button
                      onClick={revealNextHint}
                      className="font-medium"
                      style={{
                        fontSize: 12.5,
                        color: 'var(--lumina-accent)',
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                      }}
                    >
                      Reveal hint {revealedHints + 1} of {selectedProblem.hints.length}
                    </button>
                  )}
                </div>
              )}
            </div>

            {selectedProblem.solution && (
              <div style={{ marginTop: 20 }}>
                <button
                  onClick={() => setShowSolution(!showSolution)}
                  className="flex items-center gap-1.5 font-medium"
                  style={{
                    fontSize: 12.5,
                    color: 'var(--lumina-accent)',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                  }}
                >
                  <Code2 size={13} />
                  {showSolution ? 'Hide solution' : 'Reveal solution'}
                </button>
                {showSolution && (
                  <pre
                    className="lumina-mono"
                    style={{
                      marginTop: 8,
                      padding: 14,
                      background: '#0D1117',
                      color: '#E6EDF3',
                      borderRadius: 12,
                      fontSize: 12,
                      lineHeight: 1.6,
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {selectedProblem.solution}
                  </pre>
                )}
              </div>
            )}
          </section>

          {/* Right: editor + results */}
          <section className="flex-1 flex flex-col overflow-hidden">
            <div
              className={clsx(
                'overflow-hidden transition-all',
                evaluation && isFeedbackExpanded ? 'flex-1 min-h-[200px]' : 'flex-1'
              )}
              style={{ background: '#0D1117' }}
            >
              <Editor
                height="100%"
                language={language}
                value={code}
                onChange={(value) => setCode(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13.5,
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                }}
              />
            </div>

            {evaluation && (
              <div
                className={clsx('flex-shrink-0 transition-all overflow-hidden')}
                style={{
                  borderTop: '1px solid var(--lumina-divider)',
                  background: 'var(--lumina-surface)',
                  maxHeight: isFeedbackExpanded ? 240 : 48,
                }}
              >
                <button
                  onClick={() => setIsFeedbackExpanded(!isFeedbackExpanded)}
                  className="w-full flex items-center justify-between"
                  style={{
                    padding: '10px 16px',
                    background: 'transparent',
                    border: 'none',
                  }}
                >
                  <div className="flex items-center gap-3">
                    {evaluation.is_correct ? (
                      <CheckCircle size={16} style={{ color: 'var(--lumina-success-text)' }} />
                    ) : (
                      <XCircle size={16} style={{ color: 'var(--lumina-error-text)' }} />
                    )}
                    <span
                      className="font-medium"
                      style={{
                        fontSize: 13,
                        color: evaluation.is_correct
                          ? 'var(--lumina-success-text)'
                          : 'var(--lumina-error-text)',
                      }}
                    >
                      Score {evaluation.score}/100
                    </span>
                  </div>
                  {isFeedbackExpanded ? (
                    <ChevronDown size={14} style={{ color: 'var(--lumina-text-faint)' }} />
                  ) : (
                    <ChevronUp size={14} style={{ color: 'var(--lumina-text-faint)' }} />
                  )}
                </button>
                {isFeedbackExpanded && (
                  <div
                    className="overflow-y-auto"
                    style={{ padding: '0 16px 14px', maxHeight: 192 }}
                  >
                    <div className="markdown-content max-w-none">
                      <ReactMarkdown>{evaluation.feedback}</ReactMarkdown>
                    </div>
                    {evaluation.suggestions.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <h4
                          className="font-semibold"
                          style={{
                            fontSize: 11,
                            color: 'var(--lumina-text-faint)',
                            letterSpacing: 0.3,
                            textTransform: 'uppercase',
                            margin: '0 0 6px',
                          }}
                        >
                          Suggestions
                        </h4>
                        <ul className="space-y-1" style={{ paddingLeft: 0, listStyle: 'none' }}>
                          {evaluation.suggestions.map((s, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2"
                              style={{
                                fontSize: 13,
                                color: 'var(--lumina-text-dim)',
                                lineHeight: 1.5,
                              }}
                            >
                              <span style={{ color: 'var(--lumina-accent)', marginTop: 2 }}>•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div
              className="flex-shrink-0"
              style={{
                padding: '10px 14px',
                borderTop: '1px solid var(--lumina-divider)',
                background: 'var(--lumina-surface)',
              }}
            >
              {error && (
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--lumina-error-text)',
                    marginBottom: 6,
                    margin: 0,
                  }}
                >
                  {error}
                </p>
              )}
              <Button
                onClick={submitCode}
                variant="primary"
                className="w-full"
                disabled={isEvaluating || !code.trim()}
              >
                {isEvaluating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Evaluating…
                  </>
                ) : (
                  'Submit solution'
                )}
              </Button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return null;
}
