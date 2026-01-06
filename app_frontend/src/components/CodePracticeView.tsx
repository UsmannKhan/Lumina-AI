'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { CodingProblem, CodeEvaluationResponse } from '@/types';
import { api } from '@/lib/api';
import Button from './Button';
import { SparklesIcon, ChevronLeftIcon } from './Icons';
import { Loader2, Code2, Lightbulb, CheckCircle, XCircle, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import dynamic from 'next/dynamic';

// Dynamically import Monaco to avoid SSR issues
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface CodePracticeViewProps {
    chatId: number;
}

type ViewMode = 'loading' | 'not_cs' | 'list' | 'problem';

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

    // Cache whether this is a CS video
    const csCheckDone = useRef(false);
    const isCsVideo = useRef(true);

    useEffect(() => {
        loadProblems();
    }, [chatId]);

    const loadProblems = async () => {
        // If we already checked and it's not CS, don't re-check
        if (csCheckDone.current && !isCsVideo.current) {
            setViewMode('not_cs');
            return;
        }

        // If we have problems, just show them (don't re-check)
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
            // When showing hints, reveal the first one automatically
            setShowHints(true);
            setRevealedHints(1);
        } else {
            setShowHints(false);
        }
    };

    const revealNextHint = () => {
        if (selectedProblem && revealedHints < selectedProblem.hints.length) {
            setRevealedHints(prev => prev + 1);
        }
    };

    const difficultyColors = {
        easy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        hard: 'bg-red-500/20 text-red-400 border-red-500/30',
    };

    // Loading state
    if (viewMode === 'loading') {
        return (
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#0C115B] mx-auto mb-4" />
                    <p className="text-gray-400">Checking video content...</p>
                </div>
            </div>
        );
    }

    // Not a CS video
    if (viewMode === 'not_cs') {
        return (
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/70 flex items-center justify-center">
                        <Code2 size={32} className="text-gray-500" />
                    </div>
                    <h3 className="text-lg font-display font-semibold text-gray-800 mb-2">
                        Not a Programming Video
                    </h3>
                    <p className="text-gray-400 text-sm">
                        Code Practice works best with programming tutorials, CS lectures, and
                        software development content. This video doesn't appear to cover coding topics.
                    </p>
                </div>
            </div>
        );
    }

    // Problem list view
    if (viewMode === 'list') {
        return (
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-xl mx-auto">
                    <h2 className="text-lg font-display font-semibold text-gray-800 text-center mb-6">
                        Code Practice
                    </h2>

                    {problems.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/70 flex items-center justify-center">
                                <Code2 size={32} className="text-gray-500" />
                            </div>
                            <p className="text-gray-400 mb-6">
                                Generate coding problems based on this video's content
                            </p>

                            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

                            <Button
                                onClick={generateProblems}
                                variant="primary"
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <><Loader2 size={16} className="animate-spin mr-2" />Generating...</>
                                ) : (
                                    <><SparklesIcon size={16} className="mr-2" />Generate Problems</>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {problems.map((problem) => (
                                <button
                                    key={problem.id}
                                    onClick={() => openProblem(problem)}
                                    className="w-full p-4 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-[#0C115B]/30 transition-all text-left group shadow-sm hover:shadow-md"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-medium text-gray-800 group-hover:text-[#0C115B] transition-colors">
                                            {problem.title}
                                        </h3>
                                        <span className={clsx(
                                            'text-xs px-2 py-1 rounded-full border capitalize',
                                            difficultyColors[problem.difficulty]
                                        )}>
                                            {problem.difficulty}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-400 line-clamp-2">
                                        {problem.description.substring(0, 150)}...
                                    </p>
                                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                                        <span>{problem.examples.length} examples</span>
                                        <span>•</span>
                                        <span>{problem.hints.length} hints</span>
                                        <ChevronRight size={14} className="ml-auto text-gray-500 group-hover:text-[#0C115B] transition-colors" />
                                    </div>
                                </button>
                            ))}

                            <div className="pt-4 border-t border-gray-200 mt-6">
                                <button
                                    onClick={generateProblems}
                                    disabled={isGenerating}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#0C115B] border border-[#0C115B] rounded-xl hover:bg-[#0C115B]/90 transition-colors disabled:opacity-50"
                                >
                                    {isGenerating ? (
                                        <><Loader2 size={16} className="animate-spin" />Regenerating...</>
                                    ) : (
                                        <><SparklesIcon size={16} />Regenerate Problems</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Problem detail view with code editor
    if (viewMode === 'problem' && selectedProblem) {
        return (
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header */}
                <div className="flex-shrink-0 p-4 border-b border-gray-200 flex items-center justify-between z-20 bg-white">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setViewMode('list')}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
                        >
                            <ChevronLeftIcon size={18} />
                        </button>
                        <div>
                            <h2 className="font-display font-semibold text-gray-800">
                                {selectedProblem.title}
                            </h2>
                            <span className={clsx(
                                'text-xs px-2 py-0.5 rounded-full border capitalize',
                                difficultyColors[selectedProblem.difficulty]
                            )}>
                                {selectedProblem.difficulty}
                            </span>
                        </div>
                    </div>

                    {/* Language selector - styled for light theme */}
                    <select
                        value={language}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[#0C115B]/50 cursor-pointer"
                    >
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="typescript">TypeScript</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                    </select>
                </div>

                {/* Main content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Problem description */}
                    <div className="w-2/5 border-r border-gray-200 overflow-y-auto p-4 bg-white">
                        <div className="prose prose-sm max-w-none">
                            <h3 className="text-gray-800 font-medium mb-3">Problem</h3>
                            <p className="text-gray-700 whitespace-pre-wrap">{selectedProblem.description}</p>

                            {/* Examples */}
                            {selectedProblem.examples.length > 0 && (
                                <div className="mt-6">
                                    <h4 className="text-gray-800 font-medium mb-3">Examples</h4>
                                    {selectedProblem.examples.map((ex, i) => (
                                        <div key={i} className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="mb-2">
                                                <span className="text-xs text-gray-500 font-medium">Input:</span>
                                                <pre className="text-gray-800 text-sm mt-1 bg-gray-100 p-2 rounded">{ex.input}</pre>
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-500 font-medium">Output:</span>
                                                <pre className="text-gray-800 text-sm mt-1 bg-gray-100 p-2 rounded">{ex.output}</pre>
                                            </div>
                                            {ex.explanation && (
                                                <p className="text-xs text-gray-500 mt-2 italic">{ex.explanation}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Hints */}
                            <div className="mt-6">
                                <button
                                    onClick={toggleHints}
                                    className="flex items-center gap-2 text-[#0C115B] hover:text-[#0C115B]/70 text-sm font-medium"
                                >
                                    <Lightbulb size={16} />
                                    {showHints ? 'Hide Hints' : 'Show Hints'}
                                </button>

                                {showHints && selectedProblem.hints.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {selectedProblem.hints.slice(0, revealedHints).map((hint, i) => (
                                            <div key={i} className="p-3 bg-[#0C115B]/5 rounded-lg border border-[#0C115B]/20">
                                                <span className="text-xs text-[#0C115B] font-medium">Hint {i + 1}</span>
                                                <p className="text-gray-700 text-sm mt-1">{hint}</p>
                                            </div>
                                        ))}
                                        {revealedHints < selectedProblem.hints.length && (
                                            <button
                                                onClick={revealNextHint}
                                                className="text-sm text-[#0C115B] hover:text-[#0C115B]/70 font-medium"
                                            >
                                                Reveal hint {revealedHints + 1}/{selectedProblem.hints.length}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Solution */}
                            {selectedProblem.solution && (
                                <div className="mt-6">
                                    <button
                                        onClick={() => setShowSolution(!showSolution)}
                                        className="flex items-center gap-2 text-[#0C115B] hover:text-[#0C115B]/70 text-sm font-medium"
                                    >
                                        <Code2 size={16} />
                                        {showSolution ? 'Hide Solution' : 'Reveal Solution'}
                                    </button>

                                    {showSolution && (
                                        <div className="mt-3 p-4 bg-gray-900 rounded-xl border border-gray-700 overflow-x-auto">
                                            <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap">{selectedProblem.solution}</pre>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Code editor + results */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Editor */}
                        <div className={clsx(
                            "overflow-hidden transition-all",
                            evaluation && isFeedbackExpanded ? "flex-1 min-h-[200px]" : "flex-1"
                        )}>
                            <Editor
                                height="100%"
                                language={language}
                                value={code}
                                onChange={(value) => setCode(value || '')}
                                theme="vs-dark"
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    padding: { top: 16 },
                                    scrollBeyondLastLine: false,
                                    wordWrap: 'on',
                                }}
                            />
                        </div>

                        {/* Evaluation results - collapsible */}
                        {evaluation && (
                            <div className={clsx(
                                "flex-shrink-0 border-t border-gray-200 bg-white transition-all",
                                isFeedbackExpanded ? "max-h-48" : "max-h-12"
                            )}>
                                {/* Header - always visible */}
                                <button
                                    onClick={() => setIsFeedbackExpanded(!isFeedbackExpanded)}
                                    className="w-full p-3 flex items-center justify-between hover:bg-gray-50"
                                >
                                    <div className="flex items-center gap-3">
                                        {evaluation.is_correct ? (
                                            <CheckCircle className="text-emerald-500" size={18} />
                                        ) : (
                                            <XCircle className="text-red-500" size={18} />
                                        )}
                                        <span className={clsx(
                                            'font-medium text-sm',
                                            evaluation.is_correct ? 'text-emerald-600' : 'text-red-600'
                                        )}>
                                            Score: {evaluation.score}/100
                                        </span>
                                    </div>
                                    {isFeedbackExpanded ? (
                                        <ChevronDown size={16} className="text-gray-400" />
                                    ) : (
                                        <ChevronUp size={16} className="text-gray-400" />
                                    )}
                                </button>

                                {/* Expanded content */}
                                {isFeedbackExpanded && (
                                    <div className="px-3 pb-3 overflow-y-auto max-h-32">
                                        <div className="markdown-content prose prose-sm max-w-none">
                                            <ReactMarkdown>{evaluation.feedback}</ReactMarkdown>
                                        </div>
                                        {evaluation.suggestions.length > 0 && (
                                            <div className="mt-3">
                                                <h4 className="text-xs text-gray-500 uppercase mb-2">Suggestions</h4>
                                                <ul className="space-y-1">
                                                    {evaluation.suggestions.map((s, i) => (
                                                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                                            <span className="text-[#0C115B] mt-0.5">•</span>
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

                        {/* Submit button */}
                        <div className="flex-shrink-0 p-3 border-t border-gray-200">
                            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
                            <Button
                                onClick={submitCode}
                                variant="primary"
                                className="w-full"
                                disabled={isEvaluating || !code.trim()}
                            >
                                {isEvaluating ? (
                                    <><Loader2 size={16} className="animate-spin mr-2" />Evaluating...</>
                                ) : (
                                    <>Submit Solution</>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}


