'use client';

import React, { useState, useEffect } from 'react';
import { SparklesIcon } from './Icons';
import Button from './Button';
import { api } from '@/lib/api';
import { Flashcard, KeyConcept } from '@/types';
import clsx from 'clsx';
import { Shuffle, ChevronLeft, ChevronRight, RotateCcw, Loader2, RefreshCw, Lightbulb, Clock, Info, Settings, X } from 'lucide-react';

interface FlashcardsViewProps {
  chatId: number;
  videoTitle: string;
}

export default function FlashcardsView({ chatId, videoTitle }: FlashcardsViewProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Changed to false - no auto-loading
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Config state
  const [concepts, setConcepts] = useState<KeyConcept[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [cardCount, setCardCount] = useState(10);
  const [focusPrompt, setFocusPrompt] = useState('');
  const [setName, setSetName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true); // For skeleton

  // View mode: 'config' (show config + sets) or 'study' (view flashcards)
  const [viewMode, setViewMode] = useState<'config' | 'study'>('config');
  const [existingSets, setExistingSets] = useState<Flashcard[]>([]); // All flashcards for listing
  const [activeSetName, setActiveSetName] = useState<string>(''); // Currently viewing set name


  useEffect(() => {
    // Reset and load data for new chat
    setFlashcards([]);
    setExistingSets([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setShowExplanation(false);
    setError(null);
    setViewMode('config');
    loadConceptsAndSets();
  }, [chatId]);



  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (flashcards.length === 0) return;

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          setIsFlipped(f => !f);
          break;
        case 'ArrowRight':
        case 'j':
          e.preventDefault();
          nextCard();
          break;
        case 'ArrowLeft':
        case 'k':
          e.preventDefault();
          prevCard();
          break;
        case 'h':
          e.preventDefault();
          setShowHint(h => !h);
          break;
        case 'e':
          e.preventDefault();
          if (isFlipped) setShowExplanation(e => !e);
          break;
        case 's':
          e.preventDefault();
          shuffleCards();
          break;
        case 'r':
          e.preventDefault();
          resetCards();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flashcards.length, isFlipped]);

  const loadConceptsAndSets = async () => {
    setIsLoadingConfig(true);
    try {
      // Fetch concepts and flashcards in parallel
      const [conceptsData, flashcardsData] = await Promise.all([
        api.getConcepts(chatId),
        api.getFlashcards(chatId)
      ]);

      setConcepts(conceptsData);
      setSelectedTopics(conceptsData.map(c => c.id)); // Select all by default
      setExistingSets(flashcardsData.flashcards);
    } catch (err) {
      console.error('Failed to load concepts/sets:', err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const generateWithConfig = async () => {
    setIsGenerating(true);
    setError(null);

    // Generate auto name: Set N based on existing sets count
    const existingSetNames = Array.from(new Set(existingSets.map(c => c.set_name || 'Unnamed')));
    const autoName = setName.trim() || `Set ${existingSetNames.length + 1}`;

    try {
      const data = await api.generateFlashcardsWithOptions(chatId, {
        count: cardCount,
        topic_ids: selectedTopics.length === concepts.length ? [] : selectedTopics,
        focus_prompt: focusPrompt.trim() || undefined,
        set_name: autoName
      });

      // Set the new flashcards and switch to study mode
      setFlashcards(data.flashcards);
      setActiveSetName(autoName);
      setExistingSets(prev => [...data.flashcards, ...prev]); // Add to existing sets
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowHint(false);
      setShowExplanation(false);
      setViewMode('study');
    } catch (err) {
      setError('Failed to generate flashcards. Please try again.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };


  const toggleTopic = (id: number) => {
    setSelectedTopics(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const selectAllTopics = () => setSelectedTopics(concepts.map(c => c.id));
  const deselectAllTopics = () => setSelectedTopics([]);


  const regenerateFlashcards = async () => {
    setIsRegenerating(true);
    setError(null);

    try {
      const data = await api.regenerateFlashcards(chatId);
      setFlashcards(data.flashcards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowHint(false);
      setShowExplanation(false);
    } catch (err) {
      setError('Failed to regenerate flashcards. Please try again.');
      console.error(err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const nextCard = () => {
    setIsFlipped(false);
    setShowHint(false);
    setShowExplanation(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    }, 150);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setShowHint(false);
    setShowExplanation(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    }, 150);
  };

  const shuffleCards = () => {
    setIsFlipped(false);
    setShowHint(false);
    setShowExplanation(false);
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
  };

  const resetCards = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setShowExplanation(false);
  };

  const handleTimestampClick = (timestamp: string) => {
    // Parse timestamp (e.g., "02:15" or "1:23:45")
    const parts = timestamp.split(':').map(Number);
    let seconds = 0;

    if (parts.length === 2) {
      // MM:SS
      seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // HH:MM:SS
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    // Find the YouTube iframe and seek to time
    const iframe = document.querySelector('iframe[src*="youtube"]') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: 'seekTo',
        args: [seconds, true]
      }), '*');
    }
  };

  const currentCard = flashcards[currentIndex];

  const difficultyColors = {
    easy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    hard: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  // Show error
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={() => { setError(null); loadConceptsAndSets(); }} variant="primary">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Config view (default view)
  if (viewMode === 'config') {
    // Group flashcards by set_name for display
    const flashcardSets = existingSets.reduce((acc, card) => {
      const name = card.set_name || 'Unnamed Set';
      if (!acc[name]) acc[name] = [];
      acc[name].push(card);
      return acc;
    }, {} as Record<string, Flashcard[]>);

    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl mx-auto">
          {/* Centered Header */}
          <h2 className="text-lg font-display font-semibold text-white text-center mb-4">Generate Flashcards</h2>

          {isLoadingConfig ? (
            // Skeleton Loading
            <div className="space-y-4 animate-pulse">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                  <div className="h-3 bg-void-700 rounded w-12 mb-2" />
                  <div className="h-4 bg-void-700 rounded w-full" />
                </div>
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                  <div className="h-3 bg-void-700 rounded w-12 mb-2" />
                  <div className="h-4 bg-void-700 rounded w-full" />
                </div>
              </div>
              <div className="h-10 bg-void-700/50 rounded-xl" />
              <div className="h-10 bg-void-700/50 rounded-xl" />
              <div className="h-10 bg-ember-500/20 rounded-xl" />
              <div className="mt-6 pt-6 border-t border-white/[0.06]">
                <div className="h-4 bg-void-700 rounded w-32 mb-3" />
                <div className="h-16 bg-void-700/50 rounded-xl" />
              </div>
            </div>
          ) : (
            <>
              {/* Compact Config Grid */}
              <div className="flex flex-col gap-3 mb-4">
                {/* Card Count */}
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                  <label className="text-xs text-void-400 mb-1 block">Cards</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="5"
                      max="25"
                      value={cardCount}
                      onChange={(e) => setCardCount(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-void-700 rounded cursor-pointer accent-ember-500"
                    />
                    <span className="text-white font-medium text-sm w-6">{cardCount}</span>
                  </div>
                </div>

                {/* Topics Summary */}
                {concepts.length > 0 && (
                  <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                    <label className="text-xs text-void-400 mb-1 block">Topics</label>
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm">
                        {selectedTopics.length === concepts.length ? 'All' : `${selectedTopics.length}/${concepts.length}`}
                      </span>
                      <div className="flex gap-1 text-xs">
                        <button onClick={selectAllTopics} className="text-azure-400 hover:text-azure-300 px-1">All</button>
                        <button onClick={deselectAllTopics} className="text-void-400 hover:text-void-300 px-1">Clear</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Collapsible Topic Selection */}
              {concepts.length > 0 && selectedTopics.length !== concepts.length && (
                <div className="mb-4 p-2 bg-white/[0.02] rounded-xl border border-white/[0.06] max-h-32 overflow-y-auto">
                  {concepts.map((concept) => (
                    <label key={concept.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-white/[0.03] cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={selectedTopics.includes(concept.id)}
                        onChange={() => toggleTopic(concept.id)}
                        className="w-3 h-3 rounded border-void-600 text-ember-500"
                      />
                      <span className="text-white flex-1 truncate">{concept.title}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Focus Prompt */}
              <input
                type="text"
                value={focusPrompt}
                onChange={(e) => setFocusPrompt(e.target.value)}
                placeholder="Focus area (optional): e.g., practical examples..."
                className="w-full px-3 py-2 mb-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-void-100 placeholder:text-void-500 focus:outline-none focus:border-ember-500/50 text-sm"
              />

              {/* Set Name */}
              <input
                type="text"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder="Set name (optional): e.g., Chapter 1 Review"
                className="w-full px-3 py-2 mb-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-void-100 placeholder:text-void-500 focus:outline-none focus:border-ember-500/50 text-sm"
              />

              {/* Generate Button */}
              <Button
                onClick={generateWithConfig}
                variant="primary"
                className="w-full"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon size={16} className="mr-2" />
                    Generate {cardCount} Cards
                  </>
                )}
              </Button>

              {/* Existing Sets */}
              {Object.keys(flashcardSets).length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/[0.06]">
                  <h3 className="text-sm font-medium text-void-300 mb-3">
                    Existing Flashcard Sets
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(flashcardSets).map(([name, cards]) => (
                      <button
                        key={name}
                        onClick={() => {
                          setFlashcards(cards);
                          setActiveSetName(name);
                          setCurrentIndex(0);
                          setViewMode('study');
                        }}
                        className="w-full p-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-xl text-left transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium text-sm">{name}</p>
                            <p className="text-xs text-void-500">{cards.length} cards</p>
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


  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button onClick={() => setViewMode('config')} variant="ghost" size="sm" title="Back to config">
              <ChevronLeft size={18} />
            </Button>
            <div>
              <h2 className="font-display font-semibold text-xl text-white">{activeSetName}</h2>
              <p className="text-sm text-void-500">
                Card {currentIndex + 1} of {flashcards.length}
              </p>
            </div>
          </div>


          <div className="flex items-center gap-2">
            <Button onClick={shuffleCards} variant="ghost" size="sm" title="Shuffle cards (S)">
              <Shuffle size={16} />
            </Button>
            <Button onClick={resetCards} variant="ghost" size="sm" title="Reset to first card (R)">
              <RotateCcw size={16} />
            </Button>
            <Button
              onClick={regenerateFlashcards}
              variant="ghost"
              size="sm"
              title="Regenerate flashcards"
              disabled={isRegenerating}
            >
              <RefreshCw size={16} className={isRegenerating ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-void-800 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-ember-500 to-ember-400 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center mb-4">{error}</p>
        )}

        {/* Flashcard */}
        <div className="flex items-center justify-center py-4">
          <div className="w-full max-w-lg">
            {/* Main Card */}
            <div
              onClick={() => {
                if (showExplanation) {
                  setShowExplanation(false);
                } else {
                  setIsFlipped(!isFlipped);
                }
              }}
              className={clsx(
                "cursor-pointer transition-all duration-300 transform",
                (isFlipped && !showExplanation) ? "scale-[0.98]" : "hover:scale-[1.02]"
              )}
            >
              <div
                className={clsx(
                  "relative rounded-2xl p-6 min-h-[280px] flex flex-col transition-all duration-300",
                  "border shadow-xl",
                  showExplanation
                    ? "bg-gradient-to-br from-azure-500/10 to-azure-600/5 border-azure-500/20"
                    : isFlipped
                      ? "bg-gradient-to-br from-ember-500/10 to-ember-600/5 border-ember-500/20"
                      : "bg-gradient-to-br from-white/[0.03] to-white/[0.01] border-white/[0.08]"
                )}
              >
                {/* Top row: Label and Difficulty aligned */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-void-500 uppercase tracking-wider">
                    {showExplanation ? 'Explanation' : (isFlipped ? 'Answer' : 'Question')}
                  </p>
                  <span className={clsx(
                    "px-2 py-1 rounded-full text-xs font-medium border",
                    difficultyColors[currentCard.difficulty]
                  )}>
                    {currentCard.difficulty}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 flex items-center justify-center">
                  {showExplanation ? (
                    <div className="text-center space-y-4">
                      {currentCard.explanation && (
                        <p className="text-sm text-azure-100 leading-relaxed">{currentCard.explanation}</p>
                      )}
                      {currentCard.timestamp && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTimestampClick(currentCard.timestamp!);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-azure-500/20 text-azure-400 hover:bg-azure-500/30 transition-colors text-xs"
                          title="Jump to this moment in video"
                        >
                          {currentCard.timestamp}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className={clsx(
                      "text-center leading-relaxed",
                      isFlipped ? "text-void-200 text-base" : "text-white text-lg font-medium"
                    )}>
                      {isFlipped ? currentCard.answer : currentCard.question}
                    </p>
                  )}
                </div>

                {/* Bottom hint */}
                <p className="text-xs text-void-600 text-center mt-4">
                  {showExplanation
                    ? 'Click to go back to answer'
                    : isFlipped
                      ? 'Click to see question'
                      : 'Click to reveal answer'}
                </p>
              </div>
            </div>

            {/* Hint Section - only on question side */}
            {!isFlipped && !showExplanation && currentCard.hint && (
              <div className="mt-3">
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors mx-auto"
                >
                  <Lightbulb size={16} />
                  {showHint ? 'Hide hint' : 'Show hint'}
                </button>
                {showHint && (
                  <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-200 text-center">{currentCard.hint}</p>
                  </div>
                )}
              </div>
            )}

            {/* Show Explanation Button - only on answer side */}
            {isFlipped && !showExplanation && (currentCard.explanation || currentCard.timestamp) && (
              <div className="mt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExplanation(true);
                  }}
                  className="flex items-center gap-2 text-sm text-azure-400 hover:text-azure-300 transition-colors mx-auto"
                >
                  Show explanation
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 py-2">
          <Button
            onClick={prevCard}
            variant="ghost"
            size="sm"
            disabled={flashcards.length <= 1}
            className="!px-4"
          >
            <ChevronLeft size={20} />
            Previous
          </Button>

          <span className="text-void-500 text-sm px-4">
            {currentIndex + 1} / {flashcards.length}
          </span>

          <Button
            onClick={nextCard}
            variant="ghost"
            size="sm"
            disabled={flashcards.length <= 1}
            className="!px-4"
          >
            Next
            <ChevronRight size={20} />
          </Button>
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-xs text-void-600 pb-4">
          <span className="hidden sm:inline">
            Space to flip • Arrow keys to navigate • H for hint • S to shuffle • R to reset
          </span>
          <span className="sm:hidden">Tap card to flip</span>
        </p>
      </div>
    </div>
  );
}