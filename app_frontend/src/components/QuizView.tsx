'use client';

import React, { useEffect, useState } from 'react';
import { SparklesIcon } from './Icons';
import Button from './Button';
import { api } from '@/lib/api';
import { SavedQuiz, SavedQuizQuestion, KeyConcept } from '@/types';
import clsx from 'clsx';
import { Loader2, CheckCircle, XCircle, ArrowRight, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';

interface QuizViewProps {
  chatId: number;
  videoTitle: string;
}

export default function QuizView({ chatId, videoTitle }: QuizViewProps) {
  // View mode
  const [viewMode, setViewMode] = useState<'config' | 'quiz' | 'results'>('config');

  // Config state
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

  // Existing quizzes
  const [existingQuizzes, setExistingQuizzes] = useState<SavedQuiz[]>([]);

  // Quiz state
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

  useEffect(() => {
    setViewMode('config');
    setCurrentQuiz(null);
    setError(null);
    loadConceptsAndQuizzes();
  }, [chatId]);

  const loadConceptsAndQuizzes = async () => {
    setIsLoadingConfig(true);
    try {
      const [conceptsData, quizzesData] = await Promise.all([
        api.getConcepts(chatId),
        api.getQuizzes(chatId)
      ]);
      setConcepts(conceptsData);
      setSelectedTopics(conceptsData.map(c => c.id));
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
        set_name: setName.trim() || undefined
      });

      // Create a SavedQuiz from the response
      const newQuiz: SavedQuiz = {
        id: data.id,
        set_name: data.set_name,
        total_questions: data.total_questions,
        completed: 0,
        difficulty,
        created_at: new Date().toISOString(),
        questions: data.questions
      };

      setExistingQuizzes(prev => [newQuiz, ...prev]);
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
        } catch { keyPoints = []; }

        const result = await api.gradeShortAnswer({
          question: currentQuestion.question,
          ideal_answer: currentQuestion.correct_answer,
          key_points: keyPoints,
          user_answer: shortAnswer,
        });

        setIsCorrect(result.correct);
        setFeedback(result.feedback);
        if (result.correct) setScore(s => s + 1);
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
    let explanation = currentQuestion.explanation || '';

    if (currentQuestion.type === 'mcq') {
      correct = selectedAnswer === parseInt(currentQuestion.correct_answer);
    } else if (currentQuestion.type === 'true_false') {
      correct = String(selectedAnswer).toLowerCase() === currentQuestion.correct_answer;
    }

    setIsCorrect(correct);
    setFeedback(explanation);
    if (correct) setScore(s => s + 1);
    setIsSubmitted(true);
  };

  const nextQuestion = () => {
    if (!currentQuiz) return;

    if (currentIndex < currentQuiz.questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelectedAnswer(null);
      setShortAnswer('');
      setIsSubmitted(false);
      setIsCorrect(false);
      setFeedback('');
    } else {
      setViewMode('results');
    }
  };

  const selectAllTopics = () => setSelectedTopics(concepts.map(c => c.id));
  const deselectAllTopics = () => setSelectedTopics([]);

  // Config view
  if (viewMode === 'config') {
    const totalQuestions = mcqCount + tfCount + shortCount;

    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl mx-auto">
          <h2 className="text-lg font-display font-semibold text-white text-center mb-4">Generate Quiz</h2>

          {isLoadingConfig ? (
            <div className="space-y-4 animate-pulse">
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                    <div className="h-3 bg-void-700 rounded w-10 mb-2" />
                    <div className="h-6 bg-void-700 rounded" />
                  </div>
                ))}
              </div>
              <div className="h-10 bg-void-700/50 rounded-xl" />
              <div className="h-10 bg-azure-500/20 rounded-xl" />
            </div>
          ) : (
            <>
              {/* Question Type Counts */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                  <label className="text-xs text-violet-400 mb-1 block">Multiple Choice</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min="0" max="10" value={mcqCount}
                      onChange={(e) => setMcqCount(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-void-700 rounded cursor-pointer accent-violet-500"
                    />
                    <span className="text-white font-medium text-sm w-4">{mcqCount}</span>
                  </div>
                </div>
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                  <label className="text-xs text-amber-400 mb-1 block">True or False</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min="0" max="10" value={tfCount}
                      onChange={(e) => setTfCount(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-void-700 rounded cursor-pointer accent-amber-500"
                    />
                    <span className="text-white font-medium text-sm w-4">{tfCount}</span>
                  </div>
                </div>
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                  <label className="text-xs text-emerald-400 mb-1 block">Short Answer</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min="0" max="5" value={shortCount}
                      onChange={(e) => setShortCount(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-void-700 rounded cursor-pointer accent-emerald-500"
                    />
                    <span className="text-white font-medium text-sm w-4">{shortCount}</span>
                  </div>
                </div>
              </div>

              {/* Difficulty */}
              <div className="mb-4">
                <label className="text-xs text-void-400 mb-2 block">Difficulty</label>
                <div className="flex gap-2">
                  {(['easy', 'medium', 'hard', 'mixed'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={clsx(
                        "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
                        difficulty === d
                          ? "bg-azure-500/20 text-azure-400 border border-azure-500/50"
                          : "bg-white/[0.02] text-void-400 border border-white/[0.06] hover:bg-white/[0.04]"
                      )}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topics */}
              {concepts.length > 0 && (
                <div className="mb-4 p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-void-400">Topics</label>
                    <div className="flex gap-2 text-xs">
                      <button onClick={selectAllTopics} className="text-azure-400 hover:text-azure-300">All</button>
                      <button onClick={deselectAllTopics} className="text-void-400 hover:text-void-300">Clear</button>
                    </div>
                  </div>
                  <span className="text-white text-sm">
                    {selectedTopics.length === concepts.length ? 'All topics' : `${selectedTopics.length}/${concepts.length} selected`}
                  </span>
                </div>
              )}

              {/* Focus & Name */}
              <input
                type="text"
                value={focusPrompt}
                onChange={(e) => setFocusPrompt(e.target.value)}
                placeholder="Focus area (optional)"
                className="w-full px-3 py-2 mb-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-void-100 placeholder:text-void-500 focus:outline-none focus:border-azure-500/50 text-sm"
              />
              <input
                type="text"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder="Quiz name (optional)"
                className="w-full px-3 py-2 mb-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-void-100 placeholder:text-void-500 focus:outline-none focus:border-azure-500/50 text-sm"
              />

              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

              {/* Generate Button */}
              <Button
                onClick={generateQuiz}
                variant="primary"
                className="w-full"
                disabled={isGenerating || totalQuestions === 0}
              >
                {isGenerating ? (
                  <><Loader2 size={16} className="animate-spin mr-2" />Generating...</>
                ) : (
                  <><SparklesIcon size={16} className="mr-2" />Generate {totalQuestions} Questions</>
                )}
              </Button>

              {/* Existing Quizzes */}
              {existingQuizzes.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/[0.06]">
                  <h3 className="text-sm font-medium text-void-300 mb-3">Previous Quizzes</h3>
                  <div className="space-y-2">
                    {existingQuizzes.map((quiz) => (
                      <button
                        key={quiz.id}
                        onClick={() => startQuiz(quiz)}
                        className="w-full p-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-xl text-left transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium text-sm">{quiz.set_name}</p>
                            <p className="text-xs text-void-500">
                              {quiz.total_questions} questions • {quiz.difficulty}
                              {quiz.score !== undefined && quiz.score !== null && (
                                <span className="text-emerald-400 ml-2">Score: {quiz.score}/{quiz.total_questions}</span>
                              )}
                            </p>
                          </div>
                          <ChevronRight size={18} className="text-void-500" />
                        </div>
                      </button>
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

  // Results view
  if (viewMode === 'results' && currentQuiz) {
    const percentage = Math.round((score / currentQuiz.questions.length) * 100);

    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className={clsx(
            "w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center",
            percentage >= 70 ? "bg-emerald-500/20 border-2 border-emerald-500/40" : "bg-amber-500/20 border-2 border-amber-500/40"
          )}>
            <span className={clsx(
              "text-3xl font-display font-bold",
              percentage >= 70 ? "text-emerald-400" : "text-amber-400"
            )}>
              {percentage}%
            </span>
          </div>

          <h3 className="text-2xl font-display font-semibold text-white mb-2">
            {percentage >= 90 ? "Excellent!" : percentage >= 70 ? "Great job!" : percentage >= 50 ? "Good effort!" : "Keep studying!"}
          </h3>

          <p className="text-void-400 mb-6">
            You scored {score} out of {currentQuiz.questions.length}
          </p>

          <div className="flex gap-3 justify-center">
            <Button onClick={() => setViewMode('config')} variant="ghost">
              <ChevronLeft size={18} />
              Back
            </Button>
            <Button onClick={() => startQuiz(currentQuiz)} variant="primary">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz view
  if (viewMode === 'quiz' && currentQuiz && currentQuestion) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Button onClick={() => setViewMode('config')} variant="ghost" size="sm">
                  <ChevronLeft size={18} />
                </Button>
                <div>
                  <h2 className="font-display font-semibold text-lg text-white">{currentQuiz.set_name}</h2>
                  <p className="text-sm text-void-500">Question {currentIndex + 1} of {currentQuiz.questions.length}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-void-500">Score</p>
                <p className="text-xl font-display font-bold text-white">{score}/{currentIndex + (isSubmitted ? 1 : 0)}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="h-1.5 bg-void-800 rounded-full mb-6 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-azure-500 to-azure-400 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / currentQuiz.questions.length) * 100}%` }}
              />
            </div>

            {/* Question type badge */}
            <div className="mb-4">
              <span className={clsx(
                "px-3 py-1 rounded-full text-xs font-medium",
                currentQuestion.type === 'mcq' && "bg-violet-500/20 text-violet-400",
                currentQuestion.type === 'true_false' && "bg-amber-500/20 text-amber-400",
                currentQuestion.type === 'short_answer' && "bg-emerald-500/20 text-emerald-400"
              )}>
                {currentQuestion.type === 'mcq' && "Multiple Choice"}
                {currentQuestion.type === 'true_false' && "True or False"}
                {currentQuestion.type === 'short_answer' && "Short Answer"}
              </span>
            </div>

            {/* Question */}
            <h3 className="text-lg text-white font-medium mb-6">{currentQuestion.question}</h3>

            {/* MCQ Options */}
            {currentQuestion.type === 'mcq' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => !isSubmitted && setSelectedAnswer(i)}
                    disabled={isSubmitted}
                    className={clsx(
                      "w-full p-4 rounded-xl border text-left transition-all",
                      !isSubmitted && selectedAnswer === i && "bg-azure-500/20 border-azure-500/50 text-white",
                      !isSubmitted && selectedAnswer !== i && "bg-white/[0.02] border-white/[0.08] text-void-300 hover:bg-white/[0.05]",
                      isSubmitted && i === parseInt(currentQuestion.correct_answer) && "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
                      isSubmitted && selectedAnswer === i && i !== parseInt(currentQuestion.correct_answer) && "bg-red-500/20 border-red-500/50 text-red-300",
                      isSubmitted && selectedAnswer !== i && i !== parseInt(currentQuestion.correct_answer) && "bg-white/[0.02] border-white/[0.08] text-void-500"
                    )}
                  >
                    <span className="font-medium mr-3">{String.fromCharCode(65 + i)}.</span>
                    {option}
                  </button>
                ))}
              </div>
            )}

            {/* True/False */}
            {currentQuestion.type === 'true_false' && (
              <div className="flex gap-4">
                {[true, false].map((value) => (
                  <button
                    key={String(value)}
                    onClick={() => !isSubmitted && setSelectedAnswer(value)}
                    disabled={isSubmitted}
                    className={clsx(
                      "flex-1 p-6 rounded-xl border text-center font-semibold transition-all",
                      !isSubmitted && selectedAnswer === value && "bg-azure-500/20 border-azure-500/50 text-white",
                      !isSubmitted && selectedAnswer !== value && "bg-white/[0.02] border-white/[0.08] text-void-300 hover:bg-white/[0.05]",
                      isSubmitted && String(value).toLowerCase() === currentQuestion.correct_answer && "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
                      isSubmitted && selectedAnswer === value && String(value).toLowerCase() !== currentQuestion.correct_answer && "bg-red-500/20 border-red-500/50 text-red-300"
                    )}
                  >
                    {value ? 'TRUE' : 'FALSE'}
                  </button>
                ))}
              </div>
            )}

            {/* Short Answer */}
            {currentQuestion.type === 'short_answer' && (
              <div>
                <textarea
                  value={shortAnswer}
                  onChange={(e) => setShortAnswer(e.target.value)}
                  disabled={isSubmitted}
                  placeholder="Type your answer here..."
                  rows={4}
                  className={clsx(
                    "w-full p-4 rounded-xl border bg-white/[0.02] text-white placeholder:text-void-500 focus:outline-none resize-none",
                    !isSubmitted && "border-white/[0.08] focus:border-azure-500/50",
                    isSubmitted && isCorrect && "border-emerald-500/50 bg-emerald-500/10",
                    isSubmitted && !isCorrect && "border-amber-500/50 bg-amber-500/10"
                  )}
                />
                {isSubmitted && (
                  <div className="mt-3 p-3 rounded-lg bg-void-900/50 border border-white/[0.05]">
                    <p className="text-xs text-void-500 uppercase mb-1">Ideal Answer</p>
                    <p className="text-sm text-void-300">{currentQuestion.correct_answer}</p>
                  </div>
                )}
              </div>
            )}

            {/* Feedback */}
            {isSubmitted && (
              <div className={clsx(
                "mt-6 p-4 rounded-xl border",
                isCorrect ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  {isCorrect ? <CheckCircle size={20} className="text-emerald-400" /> : <XCircle size={20} className="text-red-400" />}
                  <span className={clsx("font-semibold", isCorrect ? "text-emerald-400" : "text-red-400")}>
                    {isCorrect ? "Correct!" : "Incorrect"}
                  </span>
                </div>
                {feedback && <p className="text-void-300 text-sm">{feedback}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex-shrink-0 p-4 border-t border-white/[0.06] bg-void-950">
          <div className="max-w-2xl mx-auto flex justify-end">
            {!isSubmitted ? (
              <Button
                onClick={checkAnswer}
                variant="primary"
                disabled={(currentQuestion.type === 'short_answer' ? !shortAnswer.trim() : selectedAnswer === null) || isGrading}
              >
                {isGrading ? <><Loader2 size={18} className="animate-spin" /> Grading...</> : 'Submit Answer'}
              </Button>
            ) : (
              <Button onClick={nextQuestion} variant="primary">
                {currentIndex < currentQuiz.questions.length - 1 ? (
                  <>Next Question <ArrowRight size={18} /></>
                ) : (
                  'See Results'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}