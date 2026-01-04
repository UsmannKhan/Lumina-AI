// 'use client';

// import React, { useState } from 'react';
// import { SparklesIcon } from './Icons';
// import Button from './Button';
// import { api } from '@/lib/api';
// import { Flashcard } from '@/types';
// import clsx from 'clsx';
// import { Shuffle, ChevronLeft, ChevronRight, RotateCcw, Loader2 } from 'lucide-react';

// interface FlashcardsViewProps {
//   chatId: number;
//   videoTitle: string;
// }

// export default function FlashcardsView({ chatId, videoTitle }: FlashcardsViewProps) {
//   const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [isFlipped, setIsFlipped] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [hasGenerated, setHasGenerated] = useState(false);

//   const generateFlashcards = async () => {
//     setIsLoading(true);
//     setError(null);
    
//     try {
//       const data = await api.getFlashcards(chatId);
//       setFlashcards(data.flashcards);
//       setCurrentIndex(0);
//       setIsFlipped(false);
//       setHasGenerated(true);
//     } catch (err) {
//       setError('Failed to generate flashcards. Please try again.');
//       console.error(err);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const nextCard = () => {
//     setIsFlipped(false);
//     setTimeout(() => {
//       setCurrentIndex((prev) => (prev + 1) % flashcards.length);
//     }, 150);
//   };

//   const prevCard = () => {
//     setIsFlipped(false);
//     setTimeout(() => {
//       setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
//     }, 150);
//   };

//   const shuffleCards = () => {
//     setIsFlipped(false);
//     const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
//     setFlashcards(shuffled);
//     setCurrentIndex(0);
//   };

//   const resetCards = () => {
//     setCurrentIndex(0);
//     setIsFlipped(false);
//   };

//   const currentCard = flashcards[currentIndex];

//   const difficultyColors = {
//     easy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
//     medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
//     hard: 'bg-red-500/20 text-red-400 border-red-500/30',
//   };

//   // Initial state - show generate button
//   if (!hasGenerated) {
//     return (
//       <div className="flex-1 flex items-center justify-center p-6">
//         <div className="text-center max-w-md">
//           <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500/10 to-violet-600/10 border border-violet-500/20 flex items-center justify-center">
//             <SparklesIcon size={36} className="text-violet-400" />
//           </div>
//           <h3 className="text-xl font-display font-semibold text-white mb-2">
//             Generate Flashcards
//           </h3>
//           <p className="text-void-400 mb-6">
//             Create flashcards from this video to test your knowledge and improve retention.
//           </p>
          
//           {error && (
//             <p className="text-red-400 text-sm mb-4">{error}</p>
//           )}
          
//           <Button
//             onClick={generateFlashcards}
//             variant="primary"
//             disabled={isLoading}
//           >
//             {isLoading ? (
//               <>
//                 <Loader2 size={18} className="animate-spin" />
//                 Generating...
//               </>
//             ) : (
//               <>
//                 <SparklesIcon size={18} />
//                 Generate Flashcards
//               </>
//             )}
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   // Loading state
//   if (isLoading) {
//     return (
//       <div className="flex-1 flex items-center justify-center p-6">
//         <div className="text-center">
//           <Loader2 size={40} className="animate-spin text-ember-400 mx-auto mb-4" />
//           <p className="text-void-400">Generating flashcards...</p>
//         </div>
//       </div>
//     );
//   }

//   // No flashcards generated
//   if (flashcards.length === 0) {
//     return (
//       <div className="flex-1 flex items-center justify-center p-6">
//         <div className="text-center">
//           <p className="text-void-400 mb-4">No flashcards could be generated for this video.</p>
//           <Button onClick={generateFlashcards} variant="ghost">
//             Try Again
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   // Flashcards view
//   return (
//     <div className="flex-1 flex flex-col p-6 overflow-hidden">
//       <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
//         {/* Header */}
//         <div className="flex items-center justify-between mb-6">
//           <div>
//             <h2 className="font-display font-semibold text-xl text-white">Flashcards</h2>
//             <p className="text-sm text-void-500 mt-1">
//               Card {currentIndex + 1} of {flashcards.length}
//             </p>
//           </div>
          
//           <div className="flex items-center gap-2">
//             <Button onClick={shuffleCards} variant="ghost" size="sm" title="Shuffle cards">
//               <Shuffle size={16} />
//             </Button>
//             <Button onClick={resetCards} variant="ghost" size="sm" title="Reset to first card">
//               <RotateCcw size={16} />
//             </Button>
//           </div>
//         </div>

//         {/* Progress bar */}
//         <div className="h-1 bg-void-800 rounded-full mb-6 overflow-hidden">
//           <div 
//             className="h-full bg-gradient-to-r from-ember-500 to-ember-400 transition-all duration-300"
//             style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
//           />
//         </div>

//         {/* Flashcard */}
//         <div className="flex-1 flex items-center justify-center min-h-[300px]">
//           <div
//             onClick={() => setIsFlipped(!isFlipped)}
//             className={clsx(
//               "w-full max-w-lg cursor-pointer transition-all duration-300 transform",
//               isFlipped ? "scale-[0.98]" : "hover:scale-[1.02]"
//             )}
//           >
//             <div
//               className={clsx(
//                 "relative rounded-2xl p-8 min-h-[280px] flex flex-col transition-all duration-300",
//                 "border shadow-xl",
//                 isFlipped 
//                   ? "bg-gradient-to-br from-ember-500/10 to-ember-600/5 border-ember-500/20" 
//                   : "bg-gradient-to-br from-white/[0.03] to-white/[0.01] border-white/[0.08]"
//               )}
//             >
//               {/* Difficulty badge */}
//               <div className="absolute top-4 right-4">
//                 <span className={clsx(
//                   "px-2 py-1 rounded-full text-xs font-medium border",
//                   difficultyColors[currentCard.difficulty]
//                 )}>
//                   {currentCard.difficulty}
//                 </span>
//               </div>

//               {/* Card type label */}
//               <p className="text-xs text-void-500 uppercase tracking-wider mb-4">
//                 {isFlipped ? 'Answer' : 'Question'}
//               </p>

//               {/* Content */}
//               <div className="flex-1 flex items-center justify-center">
//                 <p className={clsx(
//                   "text-center leading-relaxed",
//                   isFlipped ? "text-void-200 text-base" : "text-white text-lg font-medium"
//                 )}>
//                   {isFlipped ? currentCard.answer : currentCard.question}
//                 </p>
//               </div>

//               {/* Flip hint */}
//               <p className="text-xs text-void-600 text-center mt-4">
//                 {isFlipped ? 'Click to see question' : 'Click to reveal answer'}
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* Navigation */}
//         <div className="flex items-center justify-center gap-4 mt-6">
//           <Button
//             onClick={prevCard}
//             variant="ghost"
//             size="sm"
//             disabled={flashcards.length <= 1}
//             className="!px-4"
//           >
//             <ChevronLeft size={20} />
//             Previous
//           </Button>
          
//           <span className="text-void-500 text-sm px-4">
//             {currentIndex + 1} / {flashcards.length}
//           </span>
          
//           <Button
//             onClick={nextCard}
//             variant="ghost"
//             size="sm"
//             disabled={flashcards.length <= 1}
//             className="!px-4"
//           >
//             Next
//             <ChevronRight size={20} />
//           </Button>
//         </div>

//         {/* Regenerate option */}
//         <div className="text-center mt-6">
//           <button
//             onClick={generateFlashcards}
//             className="text-xs text-void-500 hover:text-void-300 transition-colors"
//           >
//             Regenerate flashcards
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }



// 'use client';

// import React, { useState, useEffect } from 'react';
// import { SparklesIcon } from './Icons';
// import Button from './Button';
// import { api } from '@/lib/api';
// import { Flashcard } from '@/types';
// import clsx from 'clsx';
// import { Shuffle, ChevronLeft, ChevronRight, RotateCcw, Loader2, RefreshCw } from 'lucide-react';

// interface FlashcardsViewProps {
//   chatId: number;
//   videoTitle: string;
// }

// export default function FlashcardsView({ chatId, videoTitle }: FlashcardsViewProps) {
//   const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [isFlipped, setIsFlipped] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isRegenerating, setIsRegenerating] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     loadFlashcards();
//   }, [chatId]);

//   const loadFlashcards = async () => {
//     setIsLoading(true);
//     setError(null);
    
//     try {
//       const data = await api.getFlashcards(chatId);
//       setFlashcards(data.flashcards);
//       setCurrentIndex(0);
//       setIsFlipped(false);
//     } catch (err) {
//       setError('Failed to load flashcards. Please try again.');
//       console.error(err);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const regenerateFlashcards = async () => {
//     setIsRegenerating(true);
//     setError(null);
    
//     try {
//       const data = await api.regenerateFlashcards(chatId);
//       setFlashcards(data.flashcards);
//       setCurrentIndex(0);
//       setIsFlipped(false);
//     } catch (err) {
//       setError('Failed to regenerate flashcards. Please try again.');
//       console.error(err);
//     } finally {
//       setIsRegenerating(false);
//     }
//   };

//   const nextCard = () => {
//     setIsFlipped(false);
//     setTimeout(() => {
//       setCurrentIndex((prev) => (prev + 1) % flashcards.length);
//     }, 150);
//   };

//   const prevCard = () => {
//     setIsFlipped(false);
//     setTimeout(() => {
//       setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
//     }, 150);
//   };

//   const shuffleCards = () => {
//     setIsFlipped(false);
//     const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
//     setFlashcards(shuffled);
//     setCurrentIndex(0);
//   };

//   const resetCards = () => {
//     setCurrentIndex(0);
//     setIsFlipped(false);
//   };

//   const currentCard = flashcards[currentIndex];

//   const difficultyColors = {
//     easy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
//     medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
//     hard: 'bg-red-500/20 text-red-400 border-red-500/30',
//   };

//   if (isLoading) {
//     return (
//       <div className="flex-1 flex items-center justify-center p-6">
//         <div className="text-center">
//           <Loader2 size={40} className="animate-spin text-ember-400 mx-auto mb-4" />
//           <p className="text-void-400">Loading flashcards...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error && flashcards.length === 0) {
//     return (
//       <div className="flex-1 flex items-center justify-center p-6">
//         <div className="text-center max-w-md">
//           <p className="text-red-400 mb-4">{error}</p>
//           <Button onClick={loadFlashcards} variant="primary">
//             Try Again
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   if (flashcards.length === 0) {
//     return (
//       <div className="flex-1 flex items-center justify-center p-6">
//         <div className="text-center">
//           <p className="text-void-400 mb-4">No flashcards could be generated for this video.</p>
//           <Button onClick={loadFlashcards} variant="ghost">
//             Try Again
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex-1 flex flex-col p-6 overflow-hidden">
//       <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
//         {/* Header */}
//         <div className="flex items-center justify-between mb-6">
//           <div>
//             <h2 className="font-display font-semibold text-xl text-white">Flashcards</h2>
//             <p className="text-sm text-void-500 mt-1">
//               Card {currentIndex + 1} of {flashcards.length}
//             </p>
//           </div>
          
//           <div className="flex items-center gap-2">
//             <Button onClick={shuffleCards} variant="ghost" size="sm" title="Shuffle cards">
//               <Shuffle size={16} />
//             </Button>
//             <Button onClick={resetCards} variant="ghost" size="sm" title="Reset to first card">
//               <RotateCcw size={16} />
//             </Button>
//             <Button 
//               onClick={regenerateFlashcards} 
//               variant="ghost" 
//               size="sm" 
//               title="Regenerate flashcards"
//               disabled={isRegenerating}
//             >
//               <RefreshCw size={16} className={isRegenerating ? 'animate-spin' : ''} />
//             </Button>
//           </div>
//         </div>

//         {/* Progress bar */}
//         <div className="h-1 bg-void-800 rounded-full mb-6 overflow-hidden">
//           <div 
//             className="h-full bg-gradient-to-r from-ember-500 to-ember-400 transition-all duration-300"
//             style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
//           />
//         </div>

//         {error && (
//           <p className="text-red-400 text-sm text-center mb-4">{error}</p>
//         )}

//         {/* Flashcard */}
//         <div className="flex-1 flex items-center justify-center min-h-[300px]">
//           <div
//             onClick={() => setIsFlipped(!isFlipped)}
//             className={clsx(
//               "w-full max-w-lg cursor-pointer transition-all duration-300 transform",
//               isFlipped ? "scale-[0.98]" : "hover:scale-[1.02]"
//             )}
//           >
//             <div
//               className={clsx(
//                 "relative rounded-2xl p-8 min-h-[280px] flex flex-col transition-all duration-300",
//                 "border shadow-xl",
//                 isFlipped 
//                   ? "bg-gradient-to-br from-ember-500/10 to-ember-600/5 border-ember-500/20" 
//                   : "bg-gradient-to-br from-white/[0.03] to-white/[0.01] border-white/[0.08]"
//               )}
//             >
//               {/* Difficulty badge */}
//               <div className="absolute top-4 right-4">
//                 <span className={clsx(
//                   "px-2 py-1 rounded-full text-xs font-medium border",
//                   difficultyColors[currentCard.difficulty]
//                 )}>
//                   {currentCard.difficulty}
//                 </span>
//               </div>

//               {/* Label */}
//               <p className="text-xs text-void-500 uppercase tracking-wider mb-4">
//                 {isFlipped ? 'Answer' : 'Question'}
//               </p>

//               {/* Content */}
//               <div className="flex-1 flex items-center justify-center">
//                 <p className={clsx(
//                   "text-center leading-relaxed",
//                   isFlipped ? "text-void-200 text-base" : "text-white text-lg font-medium"
//                 )}>
//                   {isFlipped ? currentCard.answer : currentCard.question}
//                 </p>
//               </div>

//               {/* Hint */}
//               <p className="text-xs text-void-600 text-center mt-4">
//                 {isFlipped ? 'Click to see question' : 'Click to reveal answer'}
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* Navigation */}
//         <div className="flex items-center justify-center gap-4 mt-6">
//           <Button
//             onClick={prevCard}
//             variant="ghost"
//             size="sm"
//             disabled={flashcards.length <= 1}
//             className="!px-4"
//           >
//             <ChevronLeft size={20} />
//             Previous
//           </Button>
          
//           <span className="text-void-500 text-sm px-4">
//             {currentIndex + 1} / {flashcards.length}
//           </span>
          
//           <Button
//             onClick={nextCard}
//             variant="ghost"
//             size="sm"
//             disabled={flashcards.length <= 1}
//             className="!px-4"
//           >
//             Next
//             <ChevronRight size={20} />
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// }

// 'use client';

// import React, { useState, useEffect } from 'react';
// import { SparklesIcon } from './Icons';
// import Button from './Button';
// import { api } from '@/lib/api';
// import { Flashcard } from '@/types';
// import clsx from 'clsx';
// import { Shuffle, ChevronLeft, ChevronRight, RotateCcw, Loader2, RefreshCw } from 'lucide-react';

// interface FlashcardsViewProps {
//   chatId: number;
//   videoTitle: string;
// }

// export default function FlashcardsView({ chatId, videoTitle }: FlashcardsViewProps) {
//   const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [isFlipped, setIsFlipped] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isRegenerating, setIsRegenerating] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     // Reset state and load new flashcards when video changes
//     setFlashcards([]);
//     setCurrentIndex(0);
//     setIsFlipped(false);
//     setError(null);
//     loadFlashcards();
//   }, [chatId]);

//   // Keyboard shortcuts
//   useEffect(() => {
//     const handleKeyDown = (e: KeyboardEvent) => {
//       // Don't trigger if user is typing in an input
//       if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
//       if (flashcards.length === 0) return;

//       switch (e.key) {
//         case ' ':
//         case 'Enter':
//           e.preventDefault();
//           setIsFlipped(f => !f);
//           break;
//         case 'ArrowRight':
//         case 'j':
//           e.preventDefault();
//           setIsFlipped(false);
//           setTimeout(() => setCurrentIndex(i => (i + 1) % flashcards.length), 150);
//           break;
//         case 'ArrowLeft':
//         case 'k':
//           e.preventDefault();
//           setIsFlipped(false);
//           setTimeout(() => setCurrentIndex(i => (i - 1 + flashcards.length) % flashcards.length), 150);
//           break;
//         case 's':
//           e.preventDefault();
//           shuffleCards();
//           break;
//         case 'r':
//           e.preventDefault();
//           resetCards();
//           break;
//       }
//     };

//     window.addEventListener('keydown', handleKeyDown);
//     return () => window.removeEventListener('keydown', handleKeyDown);
//   }, [flashcards.length]);

//   const loadFlashcards = async () => {
//     setIsLoading(true);
//     setError(null);
    
//     try {
//       const data = await api.getFlashcards(chatId);
//       setFlashcards(data.flashcards);
//       setCurrentIndex(0);
//       setIsFlipped(false);
//     } catch (err) {
//       setError('Failed to load flashcards. Please try again.');
//       console.error(err);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const regenerateFlashcards = async () => {
//     setIsRegenerating(true);
//     setError(null);
    
//     try {
//       const data = await api.regenerateFlashcards(chatId);
//       setFlashcards(data.flashcards);
//       setCurrentIndex(0);
//       setIsFlipped(false);
//     } catch (err) {
//       setError('Failed to regenerate flashcards. Please try again.');
//       console.error(err);
//     } finally {
//       setIsRegenerating(false);
//     }
//   };

//   const nextCard = () => {
//     setIsFlipped(false);
//     setTimeout(() => {
//       setCurrentIndex((prev) => (prev + 1) % flashcards.length);
//     }, 150);
//   };

//   const prevCard = () => {
//     setIsFlipped(false);
//     setTimeout(() => {
//       setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
//     }, 150);
//   };

//   const shuffleCards = () => {
//     setIsFlipped(false);
//     const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
//     setFlashcards(shuffled);
//     setCurrentIndex(0);
//   };

//   const resetCards = () => {
//     setCurrentIndex(0);
//     setIsFlipped(false);
//   };

//   const currentCard = flashcards[currentIndex];

//   const difficultyColors = {
//     easy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
//     medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
//     hard: 'bg-red-500/20 text-red-400 border-red-500/30',
//   };

//   if (isLoading) {
//     return (
//       <div className="flex-1 flex items-center justify-center p-6">
//         <div className="text-center">
//           <Loader2 size={40} className="animate-spin text-ember-400 mx-auto mb-4" />
//           <p className="text-void-400">Loading flashcards...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error && flashcards.length === 0) {
//     return (
//       <div className="flex-1 flex items-center justify-center p-6">
//         <div className="text-center max-w-md">
//           <p className="text-red-400 mb-4">{error}</p>
//           <Button onClick={loadFlashcards} variant="primary">
//             Try Again
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   if (flashcards.length === 0) {
//     return (
//       <div className="flex-1 flex items-center justify-center p-6">
//         <div className="text-center">
//           <p className="text-void-400 mb-4">No flashcards could be generated for this video.</p>
//           <Button onClick={loadFlashcards} variant="ghost">
//             Try Again
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex-1 flex flex-col p-6 overflow-hidden">
//       <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
//         {/* Header */}
//         <div className="flex items-center justify-between mb-6">
//           <div>
//             <h2 className="font-display font-semibold text-xl text-white">Flashcards</h2>
//             <p className="text-sm text-void-500 mt-1">
//               Card {currentIndex + 1} of {flashcards.length}
//             </p>
//           </div>
          
//           <div className="flex items-center gap-2">
//             <Button onClick={shuffleCards} variant="ghost" size="sm" title="Shuffle cards">
//               <Shuffle size={16} />
//             </Button>
//             <Button onClick={resetCards} variant="ghost" size="sm" title="Reset to first card">
//               <RotateCcw size={16} />
//             </Button>
//             <Button 
//               onClick={regenerateFlashcards} 
//               variant="ghost" 
//               size="sm" 
//               title="Regenerate flashcards"
//               disabled={isRegenerating}
//             >
//               <RefreshCw size={16} className={isRegenerating ? 'animate-spin' : ''} />
//             </Button>
//           </div>
//         </div>

//         {/* Progress bar */}
//         <div className="h-1 bg-void-800 rounded-full mb-6 overflow-hidden">
//           <div 
//             className="h-full bg-gradient-to-r from-ember-500 to-ember-400 transition-all duration-300"
//             style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
//           />
//         </div>

//         {error && (
//           <p className="text-red-400 text-sm text-center mb-4">{error}</p>
//         )}

//         {/* Flashcard */}
//         <div className="flex-1 flex items-center justify-center min-h-[300px]">
//           <div
//             onClick={() => setIsFlipped(!isFlipped)}
//             className={clsx(
//               "w-full max-w-lg cursor-pointer transition-all duration-300 transform",
//               isFlipped ? "scale-[0.98]" : "hover:scale-[1.02]"
//             )}
//           >
//             <div
//               className={clsx(
//                 "relative rounded-2xl p-8 min-h-[280px] flex flex-col transition-all duration-300",
//                 "border shadow-xl",
//                 isFlipped 
//                   ? "bg-gradient-to-br from-ember-500/10 to-ember-600/5 border-ember-500/20" 
//                   : "bg-gradient-to-br from-white/[0.03] to-white/[0.01] border-white/[0.08]"
//               )}
//             >
//               {/* Difficulty badge */}
//               <div className="absolute top-4 right-4">
//                 <span className={clsx(
//                   "px-2 py-1 rounded-full text-xs font-medium border",
//                   difficultyColors[currentCard.difficulty]
//                 )}>
//                   {currentCard.difficulty}
//                 </span>
//               </div>

//               {/* Label */}
//               <p className="text-xs text-void-500 uppercase tracking-wider mb-4">
//                 {isFlipped ? 'Answer' : 'Question'}
//               </p>

//               {/* Content */}
//               <div className="flex-1 flex items-center justify-center">
//                 <p className={clsx(
//                   "text-center leading-relaxed",
//                   isFlipped ? "text-void-200 text-base" : "text-white text-lg font-medium"
//                 )}>
//                   {isFlipped ? currentCard.answer : currentCard.question}
//                 </p>
//               </div>

//               {/* Hint */}
//               <p className="text-xs text-void-600 text-center mt-4">
//                 {isFlipped ? 'Click to see question' : 'Click to reveal answer'}
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* Navigation */}
//         <div className="flex items-center justify-center gap-4 mt-6">
//           <Button
//             onClick={prevCard}
//             variant="ghost"
//             size="sm"
//             disabled={flashcards.length <= 1}
//             className="!px-4"
//           >
//             <ChevronLeft size={20} />
//             Previous
//           </Button>
          
//           <span className="text-void-500 text-sm px-4">
//             {currentIndex + 1} / {flashcards.length}
//           </span>
          
//           <Button
//             onClick={nextCard}
//             variant="ghost"
//             size="sm"
//             disabled={flashcards.length <= 1}
//             className="!px-4"
//           >
//             Next
//             <ChevronRight size={20} />
//           </Button>
//         </div>

//         {/* Keyboard hint */}
//         <p className="text-center text-xs text-void-600 mt-2">
//           <span className="hidden sm:inline">Space to flip • Arrow keys to navigate • S to shuffle • R to reset</span>
//           <span className="sm:hidden">Tap card to flip</span>
//         </p>
//       </div>
//     </div>
//   );
// }


'use client';

import React, { useState, useEffect } from 'react';
import { SparklesIcon } from './Icons';
import Button from './Button';
import { api } from '@/lib/api';
import { Flashcard } from '@/types';
import clsx from 'clsx';
import { Shuffle, ChevronLeft, ChevronRight, RotateCcw, Loader2, RefreshCw, Lightbulb, Clock, Info } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFlashcards([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setShowExplanation(false);
    setError(null);
    loadFlashcards();
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

  const loadFlashcards = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await api.getFlashcards(chatId);
      setFlashcards(data.flashcards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowHint(false);
      setShowExplanation(false);
    } catch (err) {
      setError('Failed to load flashcards. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-ember-400 mx-auto mb-4" />
          <p className="text-void-400">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  if (error && flashcards.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={loadFlashcards} variant="primary">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-void-400 mb-4">No flashcards could be generated for this video.</p>
          <Button onClick={loadFlashcards} variant="ghost">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display font-semibold text-xl text-white">Flashcards</h2>
            <p className="text-sm text-void-500 mt-1">
              Card {currentIndex + 1} of {flashcards.length}
            </p>
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
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <div className="w-full max-w-lg">
            {/* Main Card */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className={clsx(
                "cursor-pointer transition-all duration-300 transform",
                isFlipped ? "scale-[0.98]" : "hover:scale-[1.02]"
              )}
            >
              <div
                className={clsx(
                  "relative rounded-2xl p-8 min-h-[280px] flex flex-col transition-all duration-300",
                  "border shadow-xl",
                  isFlipped 
                    ? "bg-gradient-to-br from-ember-500/10 to-ember-600/5 border-ember-500/20" 
                    : "bg-gradient-to-br from-white/[0.03] to-white/[0.01] border-white/[0.08]"
                )}
              >
                {/* Difficulty badge */}
                <div className="absolute top-4 right-4">
                  <span className={clsx(
                    "px-2 py-1 rounded-full text-xs font-medium border",
                    difficultyColors[currentCard.difficulty]
                  )}>
                    {currentCard.difficulty}
                  </span>
                </div>

                {/* Timestamp (if available) */}
                {currentCard.timestamp && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTimestampClick(currentCard.timestamp!);
                    }}
                    className="absolute top-4 left-4 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-azure-500/20 text-azure-400 hover:bg-azure-500/30 transition-colors text-xs"
                    title="Jump to this moment in video"
                  >
                    <Clock size={12} />
                    {currentCard.timestamp}
                  </button>
                )}

                {/* Label */}
                <p className="text-xs text-void-500 uppercase tracking-wider mb-4 mt-8">
                  {isFlipped ? 'Answer' : 'Question'}
                </p>

                {/* Content */}
                <div className="flex-1 flex items-center justify-center">
                  <p className={clsx(
                    "text-center leading-relaxed",
                    isFlipped ? "text-void-200 text-base" : "text-white text-lg font-medium"
                  )}>
                    {isFlipped ? currentCard.answer : currentCard.question}
                  </p>
                </div>

                {/* Hint */}
                <p className="text-xs text-void-600 text-center mt-4">
                  {isFlipped ? 'Click to see question' : 'Click to reveal answer'}
                </p>
              </div>
            </div>

            {/* Hint Section */}
            {!isFlipped && currentCard.hint && (
              <div className="mt-4">
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors mx-auto"
                >
                  <Lightbulb size={16} />
                  {showHint ? 'Hide hint' : 'Show hint (H)'}
                </button>
                {showHint && (
                  <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-200 text-center">{currentCard.hint}</p>
                  </div>
                )}
              </div>
            )}

            {/* Explanation Section */}
            {isFlipped && currentCard.explanation && (
              <div className="mt-4">
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="flex items-center gap-2 text-sm text-azure-400 hover:text-azure-300 transition-colors mx-auto"
                >
                  <Info size={16} />
                  {showExplanation ? 'Hide explanation' : 'Show explanation (E)'}
                </button>
                {showExplanation && (
                  <div className="mt-2 p-4 rounded-lg bg-azure-500/10 border border-azure-500/20">
                    <p className="text-sm text-azure-100 leading-relaxed">{currentCard.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-6">
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
        <p className="text-center text-xs text-void-600 mt-2">
          <span className="hidden sm:inline">
            Space to flip • Arrow keys to navigate • H for hint • E for explanation • S to shuffle • R to reset
          </span>
          <span className="sm:hidden">Tap card to flip • Tap timestamp to jump to video</span>
        </p>
      </div>
    </div>
  );
}