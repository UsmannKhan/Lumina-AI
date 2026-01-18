'use client';

import React, { useState, useEffect } from 'react';
import { SparklesIcon } from './Icons';
import Button from './Button';
import { api } from '@/lib/api';
import { Flashcard, KeyConcept, FlashcardCreateRequest } from '@/types';
import clsx from 'clsx';
import { Shuffle, ChevronLeft, ChevronRight, RotateCcw, Loader2, RefreshCw, Lightbulb, Clock, Info, Settings, X, Pencil, Trash2, Plus, Check, ArrowUp, ArrowDown, Save } from 'lucide-react';

interface FlashcardsViewProps {
  chatId: number;
  videoTitle: string;
  sourceType?: string; // 'youtube', 'pdf', 'text'
}

export default function FlashcardsView({ chatId, videoTitle, sourceType = 'youtube' }: FlashcardsViewProps) {
  const isYouTube = sourceType === 'youtube';
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

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Flashcard>>({});
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [newCardData, setNewCardData] = useState<FlashcardCreateRequest>({
    question: '', answer: '', hint: '', explanation: '', timestamp: '', difficulty: 'medium', set_name: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isRenamingSet, setIsRenamingSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isTopicsExpanded, setIsTopicsExpanded] = useState(false);

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
          // If showing explanation, hide it first (matches click behavior)
          if (showExplanation) {
            setShowExplanation(false);
          } else {
            setIsFlipped(f => !f);
          }
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
  }, [flashcards.length, isFlipped, showExplanation]);

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

  // ============== CRUD Functions ==============

  const startEditing = (card: Flashcard) => {
    setEditingCardId(card.id);
    setEditFormData({
      question: card.question,
      answer: card.answer,
      hint: card.hint,
      explanation: card.explanation,
      timestamp: card.timestamp,
      difficulty: card.difficulty
    });
  };

  const saveEdit = async () => {
    if (!editingCardId) return;
    setIsSaving(true);
    try {
      const updated = await api.updateFlashcard(editingCardId, editFormData);
      setFlashcards(prev => prev.map(c => c.id === editingCardId ? updated : c));
      setExistingSets(prev => prev.map(c => c.id === editingCardId ? updated : c));
      setEditingCardId(null);
      setEditFormData({});
    } catch (err) {
      console.error('Failed to save:', err);
      setError('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingCardId(null);
    setEditFormData({});
  };

  const deleteCard = async (cardId: number) => {
    setIsSaving(true);
    try {
      await api.deleteFlashcard(cardId);
      setFlashcards(prev => prev.filter(c => c.id !== cardId));
      setExistingSets(prev => prev.filter(c => c.id !== cardId));
      setDeleteConfirmId(null);
      // Adjust current index if needed
      if (currentIndex >= flashcards.length - 1) {
        setCurrentIndex(Math.max(0, flashcards.length - 2));
      }
    } catch (err) {
      console.error('Failed to delete:', err);
      setError('Failed to delete card');
    } finally {
      setIsSaving(false);
    }
  };

  const createCard = async () => {
    if (!newCardData.question.trim() || !newCardData.answer.trim()) return;
    setIsSaving(true);
    try {
      const created = await api.createFlashcard(chatId, {
        ...newCardData,
        set_name: activeSetName
      });
      setFlashcards(prev => [...prev, created]);
      setExistingSets(prev => [...prev, created]);
      setIsCreatingCard(false);
      setNewCardData({
        question: '', answer: '', hint: '', explanation: '', timestamp: '', difficulty: 'medium', set_name: ''
      });
    } catch (err) {
      console.error('Failed to create:', err);
      setError('Failed to create card');
    } finally {
      setIsSaving(false);
    }
  };

  const moveCard = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= flashcards.length) return;

    const newCards = [...flashcards];
    [newCards[index], newCards[newIndex]] = [newCards[newIndex], newCards[index]];
    setFlashcards(newCards);

    // Update current index if viewing the moved card
    if (currentIndex === index) setCurrentIndex(newIndex);
    else if (currentIndex === newIndex) setCurrentIndex(index);
  };

  const handleRenameSet = async () => {
    if (!newSetName.trim() || newSetName === activeSetName) {
      setIsRenamingSet(false);
      return;
    }
    setIsSaving(true);
    try {
      await api.renameSet({ chat_id: chatId, old_name: activeSetName, new_name: newSetName });
      // Update local state
      setFlashcards(prev => prev.map(c => ({ ...c, set_name: newSetName })));
      setExistingSets(prev => prev.map(c =>
        c.set_name === activeSetName ? { ...c, set_name: newSetName } : c
      ));
      setActiveSetName(newSetName);
      setIsRenamingSet(false);
    } catch (err) {
      console.error('Failed to rename:', err);
      setError('Failed to rename set');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteEntireSet = async () => {
    setIsSaving(true);
    try {
      await api.deleteSet(chatId, activeSetName);
      setExistingSets(prev => prev.filter(c => c.set_name !== activeSetName));
      setFlashcards([]);
      setViewMode('config');
    } catch (err) {
      console.error('Failed to delete set:', err);
      setError('Failed to delete set');
    } finally {
      setIsSaving(false);
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
      <div className="flex-1 overflow-y-auto p-4 2xl:p-8">
        <div className="max-w-xl 2xl:max-w-5xl mx-auto">
          {/* Centered Header */}
          <h2 className="text-base 2xl:text-xl font-display font-semibold text-gray-800 text-center mb-3 2xl:mb-6">Generate Flashcards</h2>

          {isLoadingConfig ? (
            // Skeleton Loading
            <div className="space-y-4 animate-pulse">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="h-3 bg-gray-700 rounded w-12 mb-2" />
                  <div className="h-4 bg-gray-700 rounded w-full" />
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="h-3 bg-gray-700 rounded w-12 mb-2" />
                  <div className="h-4 bg-gray-700 rounded w-full" />
                </div>
              </div>
              <div className="h-10 bg-gray-700/50 rounded-xl" />
              <div className="h-10 bg-gray-700/50 rounded-xl" />
              <div className="h-10 bg-[#0C115B]/20 rounded-xl" />
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="h-4 bg-gray-700 rounded w-32 mb-3" />
                <div className="h-16 bg-gray-700/50 rounded-xl" />
              </div>
            </div>
          ) : (
            <>
              {/* Compact Config Grid */}
              <div className="flex flex-col gap-2 2xl:gap-4 mb-3 2xl:mb-6">
                {/* Card Count */}
                <div className="p-2.5 2xl:p-4 bg-white rounded-lg 2xl:rounded-xl border border-gray-200">
                  <label className="text-xs 2xl:text-base text-gray-700 font-medium mb-1 2xl:mb-2 block">Cards</label>
                  <div className="flex items-center gap-2 2xl:gap-3">
                    <input
                      type="range"
                      min="5"
                      max="25"
                      value={cardCount}
                      onChange={(e) => setCardCount(Number(e.target.value))}
                      className="flex-1 h-1 2xl:h-2 bg-gray-200 rounded cursor-pointer accent-[#0C115B]"
                    />
                    <span className="text-gray-800 font-medium text-xs 2xl:text-base w-5 2xl:w-8">{cardCount}</span>
                  </div>
                </div>

                {/* Topics Summary - Collapsible */}
                <div className="p-2.5 2xl:p-4 bg-white rounded-lg 2xl:rounded-xl border border-gray-200">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => concepts.length > 0 && setIsTopicsExpanded(!isTopicsExpanded)}
                  >
                    <label className="text-xs 2xl:text-base text-gray-700 font-medium cursor-pointer">Topics</label>
                    <div className="flex items-center gap-2">
                      {concepts.length > 0 && (
                        <span className="text-gray-500 text-xs 2xl:text-base">
                          {selectedTopics.length === concepts.length ? 'All selected' : `${selectedTopics.length}/${concepts.length} selected`}
                        </span>
                      )}
                      {concepts.length > 0 && (
                        <ChevronRight
                          size={14}
                          className={clsx(
                            "text-gray-400 transition-transform 2xl:w-5 2xl:h-5",
                            isTopicsExpanded && "rotate-90"
                          )}
                        />
                      )}
                    </div>
                  </div>
                  {concepts.length > 0 ? (
                    <>
                      {isTopicsExpanded && (
                        <>
                          <div className="flex items-center justify-end gap-1 mt-1.5 2xl:mt-3 mb-1 2xl:mb-2 text-[10px] 2xl:text-sm">
                            <button onClick={(e) => { e.stopPropagation(); selectAllTopics(); }} className="text-[#0C115B] hover:text-[#0C115B]/70 px-1 2xl:px-2">All</button>
                            <button onClick={(e) => { e.stopPropagation(); deselectAllTopics(); }} className="text-gray-500 hover:text-gray-700 px-1 2xl:px-2">Clear</button>
                          </div>
                          {/* Topic Selection Checkboxes */}
                          <div className="max-h-28 2xl:max-h-48 overflow-y-auto border-t border-gray-100 pt-1.5 2xl:pt-3">
                            {concepts.map((concept) => (
                              <label key={concept.id} className="flex items-center gap-1.5 2xl:gap-3 p-1 2xl:p-2 rounded hover:bg-gray-50 cursor-pointer text-xs 2xl:text-base">
                                <input
                                  type="checkbox"
                                  checked={selectedTopics.includes(concept.id)}
                                  onChange={() => toggleTopic(concept.id)}
                                  className="w-3.5 h-3.5 2xl:w-5 2xl:h-5 rounded border-gray-300 text-[#0C115B] accent-[#0C115B] focus:ring-[#0C115B]"
                                />
                                <span className="text-gray-700 flex-1">{concept.title}</span>
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500 text-xs 2xl:text-base italic mt-1 2xl:mt-2">
                      No key concepts found. Cards will cover the full content.
                    </p>
                  )}
                </div>
              </div>

              {/* Focus Prompt */}
              <input
                type="text"
                value={focusPrompt}
                onChange={(e) => setFocusPrompt(e.target.value)}
                placeholder="Focus area (optional): e.g., practical examples..."
                className="w-full px-2.5 2xl:px-3 py-1.5 2xl:py-2 mb-2 2xl:mb-3 bg-white border border-gray-200 rounded-lg 2xl:rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#0C115B]/50 text-xs 2xl:text-sm"
              />

              {/* Set Name */}
              <input
                type="text"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder="Set name (optional): e.g., Chapter 1 Review"
                className="w-full px-2.5 2xl:px-3 py-1.5 2xl:py-2 mb-3 2xl:mb-4 bg-white border border-gray-200 rounded-lg 2xl:rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#0C115B]/50 text-xs 2xl:text-sm"
              />

              {/* Generate Button */}
              <div className="flex justify-center">
                <Button
                  onClick={generateWithConfig}
                  variant="primary"
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
              </div>

              {/* Existing Sets */}
              {Object.keys(flashcardSets).length > 0 && (
                <div className="mt-4 2xl:mt-6 pt-4 2xl:pt-6 border-t border-gray-200">
                  <h3 className="text-xs 2xl:text-sm font-medium text-gray-700 mb-2 2xl:mb-3">
                    Existing Flashcard Sets
                  </h3>
                  <div className="space-y-1.5 2xl:space-y-2">
                    {Object.entries(flashcardSets).map(([name, cards]) => (
                      <div
                        key={name}
                        className={clsx(
                          "w-full p-3 2xl:p-4 bg-white border rounded-lg 2xl:rounded-xl transition-all shadow-sm flex items-center justify-between",
                          deleteConfirmId === cards[0]?.id ? "border-red-300 bg-red-50" : "border-gray-200 hover:bg-gray-50 hover:shadow-md"
                        )}
                      >
                        <button
                          onClick={() => {
                            if (deleteConfirmId !== cards[0]?.id) {
                              setFlashcards(cards);
                              setActiveSetName(name);
                              setCurrentIndex(0);
                              setViewMode('study');
                            }
                          }}
                          className="flex-1 text-left"
                          disabled={deleteConfirmId === cards[0]?.id}
                        >
                          <p className="text-gray-800 font-semibold text-sm 2xl:text-base">{name}</p>
                          <p className="text-xs 2xl:text-sm text-gray-500">{cards.length} cards</p>
                        </button>
                        <div className="flex items-center gap-2">
                          {deleteConfirmId === cards[0]?.id ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Optimistic delete - remove from UI immediately
                                  const setToDelete = name;
                                  setExistingSets(prev => prev.filter(card => card.set_name !== setToDelete));
                                  setDeleteConfirmId(null);
                                  // Delete in background
                                  api.deleteSet(chatId, name).catch(err => {
                                    console.error('Failed to delete set:', err);
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
                                  setDeleteConfirmId(cards[0]?.id || null);
                                }}
                                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Delete set"
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


  return (
    <div className="flex-1 overflow-y-auto p-4 2xl:p-8">
      <div className="max-w-xl 2xl:max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 2xl:mb-8">
          <div className="flex items-center gap-2 2xl:gap-4">
            <Button onClick={() => { setViewMode('config'); setIsEditMode(false); }} variant="ghost" size="sm" title="Back to config">
              <ChevronLeft size={16} className="2xl:w-5 2xl:h-5" />
            </Button>
            <div>
              {isRenamingSet ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSetName}
                    onChange={(e) => setNewSetName(e.target.value)}
                    className="px-2 py-1 bg-white/5 border border-gray-200 rounded-lg text-gray-800 text-base 2xl:text-lg font-display font-semibold focus:outline-none focus:border-[#0C115B]/50"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleRenameSet()}
                  />
                  <Button onClick={handleRenameSet} variant="ghost" size="sm" disabled={isSaving}>
                    <Check size={14} className="2xl:w-4 2xl:h-4 text-emerald-400" />
                  </Button>
                  <Button onClick={() => setIsRenamingSet(false)} variant="ghost" size="sm">
                    <X size={14} className="2xl:w-4 2xl:h-4" />
                  </Button>
                </div>
              ) : (
                <h2
                  className={clsx(
                    "font-display font-semibold text-base 2xl:text-xl text-gray-800",
                    isEditMode && "cursor-pointer hover:text-[#0C115B]"
                  )}
                  onClick={() => {
                    if (isEditMode) {
                      setNewSetName(activeSetName);
                      setIsRenamingSet(true);
                    }
                  }}
                  title={isEditMode ? "Click to rename set" : undefined}
                >
                  {activeSetName}
                </h2>
              )}
              <p className="text-xs 2xl:text-sm text-gray-500">
                Card {currentIndex + 1} of {flashcards.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 2xl:gap-2">
            {/* Edit mode toggle */}
            <Button
              onClick={() => setIsEditMode(!isEditMode)}
              variant={isEditMode ? "primary" : "ghost"}
              size="sm"
              title={isEditMode ? "Exit edit mode" : "Edit mode"}
            >
              <Pencil size={14} className="2xl:w-4 2xl:h-4" />
            </Button>

            {isEditMode ? (
              <>
                <Button
                  onClick={() => {
                    setNewCardData({ ...newCardData, set_name: activeSetName });
                    setIsCreatingCard(true);
                  }}
                  variant="ghost"
                  size="sm"
                  title="Add new card"
                >
                  <Plus size={14} className="2xl:w-4 2xl:h-4" />
                  <span className="ml-1 text-xs 2xl:text-sm">New Card</span>
                </Button>
                <Button
                  onClick={deleteEntireSet}
                  variant="ghost"
                  size="sm"
                  title="Delete entire set"
                  disabled={isSaving}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 size={14} className="2xl:w-4 2xl:h-4" />
                  <span className="ml-1 text-xs 2xl:text-sm">Delete Set</span>
                </Button>
              </>
            ) : (
              <>
                <Button onClick={shuffleCards} variant="ghost" size="sm" title="Shuffle cards (S)">
                  <Shuffle size={14} className="2xl:w-4 2xl:h-4" />
                </Button>
                <Button onClick={resetCards} variant="ghost" size="sm" title="Reset to first card (R)">
                  <RotateCcw size={14} className="2xl:w-4 2xl:h-4" />
                </Button>
                <Button
                  onClick={regenerateFlashcards}
                  variant="ghost"
                  size="sm"
                  title="Regenerate flashcards"
                  disabled={isRegenerating}
                >
                  <RefreshCw size={14} className={clsx("2xl:w-4 2xl:h-4", isRegenerating && 'animate-spin')} />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 2xl:h-2 bg-gray-200 rounded-full mb-4 2xl:mb-6 overflow-hidden">
          <div
            className="h-full bg-[#0C115B] transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
          />
        </div>

        {error && (
          <p className="text-red-400 text-xs 2xl:text-sm text-center mb-3 2xl:mb-4">{error}
          </p>
        )}

        {/* Flashcard */}
        <div className="flex items-center justify-center py-4 2xl:py-6">
          <div className="w-full max-w-3xl">
            {/* Main Card - 3D Flip Container */}
            <div
              onClick={() => {
                if (showExplanation) {
                  setShowExplanation(false);
                } else {
                  setIsFlipped(!isFlipped);
                }
              }}
              className="cursor-pointer flashcard-container"
            >
              <div className={clsx(
                "flashcard-inner relative",
                isFlipped && "flipped"
              )}>
                {/* Front Face (Question) */}
                <div
                  className={clsx(
                    "flashcard-face rounded-xl 2xl:rounded-2xl p-4 2xl:p-8 min-h-[320px] 2xl:min-h-[480px] flex flex-col",
                    "border-2 shadow-xl bg-white border-gray-200"
                  )}
                >
                  {/* Top row: Label, Difficulty, and Edit Mode Controls */}
                  <div className="flex items-center justify-between mb-3 2xl:mb-4">
                    <div className="flex items-center gap-1.5 2xl:gap-2">
                      <p className="text-[10px] 2xl:text-xs text-gray-500 uppercase tracking-wider">
                        Question
                      </p>
                      <span className={clsx(
                        "px-1.5 2xl:px-2 py-0.5 2xl:py-1 rounded-full text-[10px] 2xl:text-xs font-medium border",
                        difficultyColors[currentCard.difficulty]
                      )}>
                        {currentCard.difficulty}
                      </span>
                    </div>
                    {/* Card controls - only in edit mode */}
                    {isEditMode && currentCard && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => moveCard(currentIndex, 'up')}
                          disabled={currentIndex === 0}
                          className="p-1 text-gray-400 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move up"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => moveCard(currentIndex, 'down')}
                          disabled={currentIndex === flashcards.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move down"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          onClick={() => startEditing(currentCard)}
                          className="p-1 text-gray-400 hover:text-[#0C115B] transition-colors"
                          title="Edit card"
                        >
                          <Pencil size={14} />
                        </button>
                        {deleteConfirmId === currentCard.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-red-400">Delete?</span>
                            <button
                              onClick={() => deleteCard(currentCard.id)}
                              disabled={isSaving}
                              className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="p-1 text-gray-400 hover:text-gray-800 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(currentCard.id)}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete card"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Question Content */}
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-center leading-relaxed text-gray-800 text-base 2xl:text-xl font-medium">
                      {currentCard.question}
                    </p>
                  </div>

                  {/* Bottom hint */}
                  <p className="text-xs text-gray-600 text-center mt-4">
                    Click to reveal answer
                  </p>
                </div>

                {/* Back Face (Answer) */}
                <div
                  className={clsx(
                    "flashcard-face flashcard-back absolute inset-0 rounded-xl 2xl:rounded-2xl p-4 2xl:p-8 min-h-[320px] 2xl:min-h-[480px] flex flex-col",
                    "border-2 shadow-xl",
                    showExplanation
                      ? "bg-white border-[#0C115B]/30"
                      : "bg-white border-[#0C115B]/20"
                  )}
                >
                  {/* Top row */}
                  <div className="flex items-center justify-between mb-3 2xl:mb-4">
                    <div className="flex items-center gap-1.5 2xl:gap-2">
                      <p className="text-[10px] 2xl:text-xs text-gray-500 uppercase tracking-wider">
                        Answer
                      </p>
                      <span className={clsx(
                        "px-1.5 2xl:px-2 py-0.5 2xl:py-1 rounded-full text-[10px] 2xl:text-xs font-medium border",
                        difficultyColors[currentCard.difficulty]
                      )}>
                        {currentCard.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Answer Content */}
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-center leading-relaxed text-gray-700 text-base 2xl:text-lg">
                      {currentCard.answer}
                    </p>
                  </div>

                  {/* Bottom hint */}
                  <p className="text-xs text-gray-600 text-center mt-4">
                    Click to see question
                  </p>
                </div>

                {/* Explanation Overlay */}
                {showExplanation && (
                  <div
                    className={clsx(
                      "flashcard-back absolute inset-0 rounded-xl 2xl:rounded-2xl p-4 2xl:p-8 min-h-[320px] 2xl:min-h-[480px] flex flex-col",
                      "border-2 shadow-xl bg-white border-[#0C115B]/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3 2xl:mb-4">
                      <p className="text-[10px] 2xl:text-xs text-gray-500 uppercase tracking-wider">
                        Explanation
                      </p>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center space-y-4">
                        {currentCard.explanation && (
                          <p className="text-sm 2xl:text-base text-gray-700 leading-relaxed">{currentCard.explanation}</p>
                        )}
                        {isYouTube && currentCard.timestamp && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTimestampClick(currentCard.timestamp!);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-xs"
                            title="Jump to this moment in video"
                          >
                            {currentCard.timestamp}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 text-center mt-4">
                      Click to go back to answer
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Hint Section - only on question side */}
            {!isFlipped && !showExplanation && currentCard.hint && (
              <div className="mt-4">
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="flex items-center gap-2 text-sm text-[#0C115B] hover:text-[#0C115B]/70 transition-colors mx-auto font-medium"
                >
                  <Lightbulb size={16} />
                  {showHint ? 'Hide hint' : 'Show hint'}
                </button>
                {showHint && (
                  <div className="mt-3 p-4 rounded-xl bg-[#0C115B]/5 border border-[#0C115B]/20">
                    <p className="text-sm text-gray-700 text-center leading-relaxed">{currentCard.hint}</p>
                  </div>
                )}
              </div>
            )}

            {/* Show Explanation Button - only on answer side */}
            {isFlipped && !showExplanation && (currentCard.explanation || currentCard.timestamp) && (
              <div className="mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExplanation(true);
                  }}
                  className="flex items-center gap-2 text-sm text-[#0C115B] hover:text-[#0C115B]/70 transition-colors mx-auto font-medium"
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

          <span className="text-gray-500 text-sm px-4">
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

        {/* Card controls moved to card surface (top-right) */}

        {/* Keyboard hint */}
        {!isEditMode && (
          <p className="text-center text-xs text-gray-600 pb-4">
            <span className="hidden sm:inline">
              Space to flip • Arrow keys to navigate • H for hint • S to shuffle • R to reset
            </span>
            <span className="sm:hidden">Tap card to flip</span>
          </p>
        )}

        {/* Edit Card Modal */}
        {editingCardId !== null && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-200 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-semibold text-gray-800">Edit Flashcard</h3>
                <Button onClick={cancelEdit} variant="ghost" size="sm"><X size={18} /></Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Question</label>
                  <textarea
                    value={editFormData.question || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, question: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-gray-200 rounded-lg text-gray-800 resize-none focus:outline-none focus:border-[#0C115B]/50"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Answer</label>
                  <textarea
                    value={editFormData.answer || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, answer: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-gray-200 rounded-lg text-gray-800 resize-none focus:outline-none focus:border-[#0C115B]/50"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Hint</label>
                    <input
                      type="text"
                      value={editFormData.hint || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, hint: e.target.value })}
                      className="w-full px-3 py-2 bg-white/5 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-[#0C115B]/50"
                    />
                  </div>
                  {isYouTube && (
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Timestamp</label>
                      <input
                        type="text"
                        value={editFormData.timestamp || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, timestamp: e.target.value })}
                        className="w-full px-3 py-2 bg-white/5 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-[#0C115B]/50"
                        placeholder="00:00"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Explanation</label>
                  <textarea
                    value={editFormData.explanation || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, explanation: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-gray-200 rounded-lg text-gray-800 resize-none focus:outline-none focus:border-[#0C115B]/50"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Difficulty</label>
                  <select
                    value={editFormData.difficulty || 'medium'}
                    onChange={(e) => setEditFormData({ ...editFormData, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-[#0C115B]/50"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button onClick={cancelEdit} variant="secondary">Cancel</Button>
                <Button onClick={saveEdit} variant="primary" disabled={isSaving}>
                  {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Create Card Modal */}
        {isCreatingCard && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-200 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-semibold text-gray-800">Create New Flashcard</h3>
                <Button onClick={() => setIsCreatingCard(false)} variant="ghost" size="sm"><X size={18} /></Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Question *</label>
                  <textarea
                    value={newCardData.question}
                    onChange={(e) => setNewCardData({ ...newCardData, question: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-gray-200 rounded-lg text-gray-800 resize-none focus:outline-none focus:border-[#0C115B]/50"
                    rows={3}
                    placeholder="Enter the question..."
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Answer *</label>
                  <textarea
                    value={newCardData.answer}
                    onChange={(e) => setNewCardData({ ...newCardData, answer: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-gray-200 rounded-lg text-gray-800 resize-none focus:outline-none focus:border-[#0C115B]/50"
                    rows={3}
                    placeholder="Enter the answer..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Hint</label>
                    <input
                      type="text"
                      value={newCardData.hint}
                      onChange={(e) => setNewCardData({ ...newCardData, hint: e.target.value })}
                      className="w-full px-3 py-2 bg-white/5 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-[#0C115B]/50"
                    />
                  </div>
                  {isYouTube && (
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Timestamp</label>
                      <input
                        type="text"
                        value={newCardData.timestamp}
                        onChange={(e) => setNewCardData({ ...newCardData, timestamp: e.target.value })}
                        className="w-full px-3 py-2 bg-white/5 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-[#0C115B]/50"
                        placeholder="00:00"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Explanation</label>
                  <textarea
                    value={newCardData.explanation}
                    onChange={(e) => setNewCardData({ ...newCardData, explanation: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-gray-200 rounded-lg text-gray-800 resize-none focus:outline-none focus:border-[#0C115B]/50"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Difficulty</label>
                  <select
                    value={newCardData.difficulty}
                    onChange={(e) => setNewCardData({ ...newCardData, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-[#0C115B]/50"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button onClick={() => setIsCreatingCard(false)} variant="secondary">Cancel</Button>
                <Button onClick={createCard} variant="primary" disabled={isSaving || !newCardData.question.trim() || !newCardData.answer.trim()}>
                  {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                  Create Card
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

