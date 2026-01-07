'use client';

import React, { useEffect, useState } from 'react';
import { SparklesIcon } from './Icons';
import Button from './Button';
import { api } from '@/lib/api';
import { SavedQuiz, SavedQuizQuestion, KeyConcept } from '@/types';
import clsx from 'clsx';
import { Loader2, CheckCircle, XCircle, ArrowRight, ChevronLeft, ChevronRight, Trophy, Trash2 } from 'lucide-react';

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
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

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

  const toggleTopic = (id: number) => {
    setSelectedTopics(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const selectAllTopics = () => setSelectedTopics(concepts.map(c => c.id));
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
      // Show results immediately
      setViewMode('results');
      // Optimistically update the score in existingQuizzes (instant UI update)
      setExistingQuizzes(prev => prev.map(q =>
        q.id === currentQuiz.id ? { ...q, score } : q
      ));
      // Save score in background (don't await)
      api.completeQuiz(currentQuiz.id, score).catch(err => {
        console.error('Failed to save quiz score:', err);
      });
    }
  };

  // Config view
  if (viewMode === 'config') {
    const totalQuestions = mcqCount + tfCount + shortCount;

    return (
      <div className="flex-1 overflow-y-auto p-4 2xl:p-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-lg font-display font-semibold text-gray-800 text-center mb-4">Generate Quiz</h2>

          {isLoadingConfig ? (
            <div className="space-y-4 animate-pulse">
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-3 bg-white/60 rounded-xl border border-gray-200">
                    <div className="h-3 bg-gray-700 rounded w-10 mb-2" />
                    <div className="h-6 bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
              <div className="h-10 bg-gray-700/50 rounded-xl" />
              <div className="h-10 bg-blue-500/20 rounded-xl" />
            </div>
          ) : (
            <>
              {/* Question Type Counts */}
              <div className="flex flex-col gap-3 mb-4">
                <div className="p-3 bg-white rounded-xl border border-gray-200">
                  <label className="text-sm text-gray-700 font-medium mb-1 block">Multiple Choice</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min="0" max="10" value={mcqCount}
                      onChange={(e) => setMcqCount(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-gray-200 rounded cursor-pointer accent-[#0C115B]"
                    />
                    <span className="text-gray-800 font-medium text-sm w-4">{mcqCount}</span>
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-gray-200">
                  <label className="text-sm text-gray-700 font-medium mb-1 block">True or False</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min="0" max="10" value={tfCount}
                      onChange={(e) => setTfCount(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-gray-200 rounded cursor-pointer accent-[#0C115B]"
                    />
                    <span className="text-gray-800 font-medium text-sm w-4">{tfCount}</span>
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-gray-200">
                  <label className="text-sm text-gray-700 font-medium mb-1 block">Short Answer</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min="0" max="5" value={shortCount}
                      onChange={(e) => setShortCount(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-gray-200 rounded cursor-pointer accent-[#0C115B]"
                    />
                    <span className="text-gray-800 font-medium text-sm w-4">{shortCount}</span>
                  </div>
                </div>
              </div>

              {/* Difficulty */}
              <div className="mb-4">
                <label className="text-sm text-gray-700 font-medium mb-2 block">Difficulty</label>
                <div className="flex gap-2">
                  {(['easy', 'medium', 'hard', 'mixed'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={clsx(
                        "flex-1 py-2 rounded-lg text-sm font-medium transition-colors border",
                        difficulty === d
                          ? "bg-[#0C115B] text-white border-[#0C115B]"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topics - Always show */}
              <div className="mb-4 p-3 bg-white rounded-xl border border-gray-200">
                <label className="text-sm text-gray-700 font-medium mb-1 block">Topics</label>
                {concepts.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-800 text-sm">
                        {selectedTopics.length === concepts.length ? 'All topics' : `${selectedTopics.length}/${concepts.length} selected`}
                      </span>
                      <div className="flex gap-2 text-xs">
                        <button onClick={selectAllTopics} className="text-[#0C115B] hover:text-[#0C115B]/70">All</button>
                        <button onClick={deselectAllTopics} className="text-gray-500 hover:text-gray-700">Clear</button>
                      </div>
                    </div>
                    {/* Topic Selection Checkboxes */}
                    <div className="max-h-40 overflow-y-auto border-t border-gray-100 pt-2">
                      {concepts.map((concept) => (
                        <label key={concept.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={selectedTopics.includes(concept.id)}
                            onChange={() => toggleTopic(concept.id)}
                            className="w-4 h-4 rounded border-gray-300 text-[#0C115B] accent-[#0C115B] focus:ring-[#0C115B]"
                          />
                          <span className="text-gray-700 flex-1">{concept.title}</span>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm italic">
                    No key concepts found. Quiz will cover the full content.
                  </p>
                )}
              </div>

              {/* Focus & Name */}
              <input
                type="text"
                value={focusPrompt}
                onChange={(e) => setFocusPrompt(e.target.value)}
                placeholder="Focus area (optional)"
                className="w-full px-3 py-2 mb-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#0C115B]/50 text-sm"
              />
              <input
                type="text"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder="Quiz name (optional)"
                className="w-full px-3 py-2 mb-4 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#0C115B]/50 text-sm"
              />

              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

              {/* Generate Button */}
              <div className="flex justify-center">
                <Button
                  onClick={generateQuiz}
                  variant="primary"
                  disabled={isGenerating || totalQuestions === 0}
                >
                  {isGenerating ? (
                    <><Loader2 size={16} className="animate-spin mr-2" />Generating...</>
                  ) : (
                    <><SparklesIcon size={16} className="mr-2" />Generate {totalQuestions} Questions</>
                  )}
                </Button>
              </div>

              {/* Existing Quizzes */}
              {existingQuizzes.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Previous Quizzes</h3>
                  <div className="space-y-2">
                    {existingQuizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className={clsx(
                          "w-full p-4 bg-white border rounded-xl transition-all shadow-sm flex items-center justify-between",
                          deleteConfirmId === quiz.id ? "border-red-300 bg-red-50" : "border-gray-200 hover:bg-gray-50 hover:shadow-md"
                        )}
                      >
                        <button
                          onClick={() => deleteConfirmId !== quiz.id && startQuiz(quiz)}
                          className="flex-1 text-left"
                          disabled={deleteConfirmId === quiz.id}
                        >
                          <p className="text-gray-800 font-semibold text-base">{quiz.set_name}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{quiz.total_questions} questions</span>
                            <span>•</span>
                            <span className="capitalize">{quiz.difficulty}</span>
                            {quiz.score !== undefined && quiz.score !== null && (() => {
                              const percentage = (quiz.score / quiz.total_questions) * 100;
                              const colorClass = percentage >= 70
                                ? "text-emerald-600"
                                : percentage >= 40
                                  ? "text-amber-600"
                                  : "text-red-600";
                              return (
                                <>
                                  <span>•</span>
                                  <span className={`${colorClass} font-medium`}>Score: {quiz.score}/{quiz.total_questions}</span>
                                </>
                              );
                            })()}
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          {deleteConfirmId === quiz.id ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Optimistic delete - remove from UI immediately
                                  setExistingQuizzes(prev => prev.filter(q => q.id !== quiz.id));
                                  setDeleteConfirmId(null);
                                  // Delete in background
                                  api.deleteQuiz(quiz.id).catch(err => {
                                    console.error('Failed to delete quiz:', err);
                                    // Could restore item on error, but for now just log
                                  });
                                }}
                                className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                              >
                                Delete
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(null);
                                }}
                                className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(quiz.id);
                                }}
                                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Delete quiz"
                              >
                                <Trash2 size={16} />
                              </button>
                              <ChevronRight size={18} className="text-gray-400" />
                            </>
                          )}
                        </div>
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
              "text-xl 2xl:text-3xl font-display font-bold",
              percentage >= 70 ? "text-emerald-400" : "text-amber-400"
            )}>
              {percentage}%
            </span>
          </div>

          <h3 className="text-lg 2xl:text-2xl font-display font-semibold text-gray-800 mb-2">
            {percentage >= 90 ? "Excellent!" : percentage >= 70 ? "Great job!" : percentage >= 50 ? "Good effort!" : "Keep studying!"}
          </h3>

          <p className="text-gray-400 mb-6">
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
        <div className="flex-1 overflow-y-auto p-4 2xl:p-6">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Button onClick={() => setViewMode('config')} variant="ghost" size="sm">
                  <ChevronLeft size={18} />
                </Button>
                <div>
                  <h2 className="font-display font-semibold text-lg text-gray-800">{currentQuiz.set_name}</h2>
                  <p className="text-sm text-gray-500">Question {currentIndex + 1} of {currentQuiz.questions.length}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Score</p>
                <p className="text-xl font-display font-bold text-gray-800">{score}/{currentIndex + (isSubmitted ? 1 : 0)}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="h-2 bg-gray-200 rounded-full mb-6 overflow-hidden">
              <div
                className="h-full bg-[#0C115B] transition-all duration-300"
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
            <h3 className="text-lg text-gray-800 font-medium mb-6">{currentQuestion.question}</h3>

            {/* MCQ Options */}
            {currentQuestion.type === 'mcq' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => !isSubmitted && setSelectedAnswer(i)}
                    disabled={isSubmitted}
                    className={clsx(
                      "w-full p-4 rounded-xl border text-left transition-all shadow-sm",
                      !isSubmitted && selectedAnswer === i && "bg-[#0C115B] border-[#0C115B] text-white",
                      !isSubmitted && selectedAnswer !== i && "bg-white border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-[#0C115B]/30",
                      isSubmitted && i === parseInt(currentQuestion.correct_answer) && "bg-emerald-50 border-emerald-500 text-emerald-700",
                      isSubmitted && selectedAnswer === i && i !== parseInt(currentQuestion.correct_answer) && "bg-red-50 border-red-500 text-red-700",
                      isSubmitted && selectedAnswer !== i && i !== parseInt(currentQuestion.correct_answer) && "bg-white border-gray-200 text-gray-500"
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
                      "flex-1 p-6 rounded-xl border text-center font-semibold transition-all shadow-sm",
                      !isSubmitted && selectedAnswer === value && "bg-[#0C115B] border-[#0C115B] text-white",
                      !isSubmitted && selectedAnswer !== value && "bg-white border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-[#0C115B]/30",
                      isSubmitted && String(value).toLowerCase() === currentQuestion.correct_answer && "bg-emerald-50 border-emerald-500 text-emerald-700",
                      isSubmitted && selectedAnswer === value && String(value).toLowerCase() !== currentQuestion.correct_answer && "bg-red-50 border-red-500 text-red-700"
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
                    "w-full p-4 rounded-xl border bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none resize-none",
                    !isSubmitted && "border-gray-200 focus:border-[#0C115B]/50",
                    isSubmitted && isCorrect && "border-emerald-500 bg-emerald-50",
                    isSubmitted && !isCorrect && "border-amber-500 bg-amber-50"
                  )}
                />
                {isSubmitted && (
                  <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase mb-1">Ideal Answer</p>
                    <p className="text-sm text-gray-700">{currentQuestion.correct_answer}</p>
                  </div>
                )}
              </div>
            )}

            {/* Feedback */}
            {isSubmitted && (
              <div className={clsx(
                "mt-6 p-4 rounded-xl border",
                isCorrect ? "bg-emerald-50 border-emerald-500" : "bg-red-50 border-red-500"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  {isCorrect ? <CheckCircle size={20} className="text-emerald-600" /> : <XCircle size={20} className="text-red-600" />}
                  <span className={clsx("font-semibold", isCorrect ? "text-emerald-700" : "text-red-700")}>
                    {isCorrect ? "Correct!" : "Incorrect"}
                  </span>
                </div>
                {feedback && <p className="text-gray-700 text-sm">{feedback}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
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

