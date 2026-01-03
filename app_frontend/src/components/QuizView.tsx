// 'use client';

// import React, { useState } from 'react';
// import { SparklesIcon } from './Icons';
// import Button from './Button';
// import { api } from '@/lib/api';
// import { QuizQuestion, MCQQuestion, TrueFalseQuestion, ShortAnswerQuestion } from '@/types';
// import clsx from 'clsx';
// import { Loader2, CheckCircle, XCircle, ArrowRight, RotateCcw, Trophy } from 'lucide-react';

// interface QuizViewProps {
//   chatId: number;
//   videoTitle: string;
// }

// export default function QuizView({ chatId, videoTitle }: QuizViewProps) {
//   const [questions, setQuestions] = useState<QuizQuestion[]>([]);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [selectedAnswer, setSelectedAnswer] = useState<number | boolean | null>(null);
//   const [shortAnswer, setShortAnswer] = useState('');
//   const [isSubmitted, setIsSubmitted] = useState(false);
//   const [isCorrect, setIsCorrect] = useState(false);
//   const [feedback, setFeedback] = useState('');
//   const [score, setScore] = useState(0);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isGrading, setIsGrading] = useState(false);
//   const [isQuizComplete, setIsQuizComplete] = useState(false);
//   const [hasStarted, setHasStarted] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const startQuiz = async () => {
//     setIsLoading(true);
//     setError(null);
    
//     try {
//       const data = await api.getQuiz(chatId);
//       setQuestions(data.questions);
//       setHasStarted(true);
//       setCurrentIndex(0);
//       setScore(0);
//       setIsQuizComplete(false);
//     } catch (err) {
//       setError('Failed to generate quiz. Please try again.');
//       console.error(err);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const currentQuestion = questions[currentIndex];

//   const checkAnswer = async () => {
//     if (currentQuestion.type === 'short_answer') {
//       if (!shortAnswer.trim()) return;
      
//       setIsGrading(true);
//       try {
//         const q = currentQuestion as ShortAnswerQuestion;
//         const result = await api.gradeShortAnswer({
//           question: q.question,
//           ideal_answer: q.ideal_answer,
//           key_points: q.key_points,
//           user_answer: shortAnswer,
//         });
        
//         setIsCorrect(result.correct);
//         setFeedback(result.feedback);
//         if (result.correct) setScore(s => s + 1);
//       } catch (err) {
//         setFeedback('Failed to grade answer. Counted as incorrect.');
//         setIsCorrect(false);
//       } finally {
//         setIsGrading(false);
//         setIsSubmitted(true);
//       }
//       return;
//     }
    
//     if (selectedAnswer === null) return;
    
//     let correct = false;
//     let explanation = '';
    
//     if (currentQuestion.type === 'mcq') {
//       const q = currentQuestion as MCQQuestion;
//       correct = selectedAnswer === q.correct_index;
//       explanation = q.explanation;
//     } else if (currentQuestion.type === 'true_false') {
//       const q = currentQuestion as TrueFalseQuestion;
//       correct = selectedAnswer === q.correct_answer;
//       explanation = q.explanation;
//     }
    
//     setIsCorrect(correct);
//     setFeedback(explanation);
//     if (correct) setScore(s => s + 1);
//     setIsSubmitted(true);
//   };

//   const nextQuestion = () => {
//     if (currentIndex < questions.length - 1) {
//       setCurrentIndex(i => i + 1);
//       setSelectedAnswer(null);
//       setShortAnswer('');
//       setIsSubmitted(false);
//       setIsCorrect(false);
//       setFeedback('');
//     } else {
//       setIsQuizComplete(true);
//     }
//   };

//   const restartQuiz = () => {
//     setHasStarted(false);
//     setQuestions([]);
//     setCurrentIndex(0);
//     setScore(0);
//     setSelectedAnswer(null);
//     setShortAnswer('');
//     setIsSubmitted(false);
//     setIsQuizComplete(false);
//     setFeedback('');
//   };

//   // Start screen
//   if (!hasStarted) {
//     return (
//       <div className="flex-1 flex items-center justify-center p-6">
//         <div className="text-center max-w-md">
//           <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-azure-500/10 to-azure-600/10 border border-azure-500/20 flex items-center justify-center">
//             <Trophy size={36} className="text-azure-400" />
//           </div>
//           <h3 className="text-xl font-display font-semibold text-white mb-2">
//             Take a Quiz
//           </h3>
//           <p className="text-void-400 mb-2">
//             Test your knowledge with 10 questions:
//           </p>
//           <ul className="text-void-500 text-sm mb-6 space-y-1">
//             <li>• Multiple choice questions</li>
//             <li>• True or false statements</li>
//             <li>• Short answer (AI-graded)</li>
//           </ul>
          
//           {error && (
//             <p className="text-red-400 text-sm mb-4">{error}</p>
//           )}
          
//           <Button onClick={startQuiz} variant="primary" disabled={isLoading}>
//             {isLoading ? (
//               <>
//                 <Loader2 size={18} className="animate-spin" />
//                 Generating Quiz...
//               </>
//             ) : (
//               <>
//                 <SparklesIcon size={18} />
//                 Start Quiz
//               </>
//             )}
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   // Loading
//   if (isLoading) {
//     return (
//       <div className="flex-1 flex items-center justify-center p-6">
//         <div className="text-center">
//           <Loader2 size={40} className="animate-spin text-azure-400 mx-auto mb-4" />
//           <p className="text-void-400">Generating your quiz...</p>
//         </div>
//       </div>
//     );
//   }

//   // Quiz complete screen
//   if (isQuizComplete) {
//     const percentage = Math.round((score / questions.length) * 100);
    
//     return (
//       <div className="flex-1 flex items-center justify-center p-6">
//         <div className="text-center max-w-md">
//           <div className={clsx(
//             "w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center",
//             percentage >= 70 
//               ? "bg-emerald-500/20 border-2 border-emerald-500/40" 
//               : "bg-amber-500/20 border-2 border-amber-500/40"
//           )}>
//             <span className={clsx(
//               "text-3xl font-display font-bold",
//               percentage >= 70 ? "text-emerald-400" : "text-amber-400"
//             )}>
//               {percentage}%
//             </span>
//           </div>
          
//           <h3 className="text-2xl font-display font-semibold text-white mb-2">
//             {percentage >= 90 ? "Excellent!" : 
//              percentage >= 70 ? "Great job!" : 
//              percentage >= 50 ? "Good effort!" : "Keep studying!"}
//           </h3>
          
//           <p className="text-void-400 mb-2">
//             You scored {score} out of {questions.length}
//           </p>
          
//           <p className="text-void-500 text-sm mb-8">
//             {percentage >= 70 
//               ? "You have a solid understanding of this video's content." 
//               : "Review the flashcards and try again to improve your score."}
//           </p>
          
//           <div className="flex gap-3 justify-center">
//             <Button onClick={restartQuiz} variant="ghost">
//               <RotateCcw size={18} />
//               Try Again
//             </Button>
//             <Button onClick={startQuiz} variant="primary">
//               New Quiz
//             </Button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Quiz question screen
//   return (
//     <div className="flex-1 flex flex-col p-6 overflow-hidden">
//       <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
//         {/* Header */}
//         <div className="flex items-center justify-between mb-4">
//           <div>
//             <h2 className="font-display font-semibold text-xl text-white">Quiz</h2>
//             <p className="text-sm text-void-500 mt-1">
//               Question {currentIndex + 1} of {questions.length}
//             </p>
//           </div>
//           <div className="text-right">
//             <p className="text-sm text-void-500">Score</p>
//             <p className="text-xl font-display font-bold text-white">{score}/{currentIndex + (isSubmitted ? 1 : 0)}</p>
//           </div>
//         </div>

//         {/* Progress bar */}
//         <div className="h-1.5 bg-void-800 rounded-full mb-8 overflow-hidden">
//           <div 
//             className="h-full bg-gradient-to-r from-azure-500 to-azure-400 transition-all duration-300"
//             style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
//           />
//         </div>

//         {/* Question type badge */}
//         <div className="mb-4">
//           <span className={clsx(
//             "px-3 py-1 rounded-full text-xs font-medium",
//             currentQuestion.type === 'mcq' && "bg-violet-500/20 text-violet-400",
//             currentQuestion.type === 'true_false' && "bg-amber-500/20 text-amber-400",
//             currentQuestion.type === 'short_answer' && "bg-emerald-500/20 text-emerald-400"
//           )}>
//             {currentQuestion.type === 'mcq' && "Multiple Choice"}
//             {currentQuestion.type === 'true_false' && "True or False"}
//             {currentQuestion.type === 'short_answer' && "Short Answer"}
//           </span>
//         </div>

//         {/* Question */}
//         <div className="flex-1">
//           {/* MCQ */}
//           {currentQuestion.type === 'mcq' && (
//             <div>
//               <h3 className="text-lg text-white font-medium mb-6">
//                 {(currentQuestion as MCQQuestion).question}
//               </h3>
//               <div className="space-y-3">
//                 {(currentQuestion as MCQQuestion).options.map((option, i) => (
//                   <button
//                     key={i}
//                     onClick={() => !isSubmitted && setSelectedAnswer(i)}
//                     disabled={isSubmitted}
//                     className={clsx(
//                       "w-full p-4 rounded-xl border text-left transition-all",
//                       !isSubmitted && selectedAnswer === i && "bg-azure-500/20 border-azure-500/50 text-white",
//                       !isSubmitted && selectedAnswer !== i && "bg-white/[0.02] border-white/[0.08] text-void-300 hover:bg-white/[0.05] hover:border-white/[0.15]",
//                       isSubmitted && i === (currentQuestion as MCQQuestion).correct_index && "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
//                       isSubmitted && selectedAnswer === i && i !== (currentQuestion as MCQQuestion).correct_index && "bg-red-500/20 border-red-500/50 text-red-300",
//                       isSubmitted && selectedAnswer !== i && i !== (currentQuestion as MCQQuestion).correct_index && "bg-white/[0.02] border-white/[0.08] text-void-500"
//                     )}
//                   >
//                     <span className="font-medium mr-3">{String.fromCharCode(65 + i)}.</span>
//                     {option}
//                   </button>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* True/False */}
//           {currentQuestion.type === 'true_false' && (
//             <div>
//               <h3 className="text-lg text-white font-medium mb-6">
//                 "{(currentQuestion as TrueFalseQuestion).statement}"
//               </h3>
//               <div className="flex gap-4">
//                 {[true, false].map((value) => (
//                   <button
//                     key={String(value)}
//                     onClick={() => !isSubmitted && setSelectedAnswer(value)}
//                     disabled={isSubmitted}
//                     className={clsx(
//                       "flex-1 p-6 rounded-xl border text-center font-semibold transition-all",
//                       !isSubmitted && selectedAnswer === value && "bg-azure-500/20 border-azure-500/50 text-white",
//                       !isSubmitted && selectedAnswer !== value && "bg-white/[0.02] border-white/[0.08] text-void-300 hover:bg-white/[0.05] hover:border-white/[0.15]",
//                       isSubmitted && value === (currentQuestion as TrueFalseQuestion).correct_answer && "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
//                       isSubmitted && selectedAnswer === value && value !== (currentQuestion as TrueFalseQuestion).correct_answer && "bg-red-500/20 border-red-500/50 text-red-300",
//                       isSubmitted && selectedAnswer !== value && value !== (currentQuestion as TrueFalseQuestion).correct_answer && "bg-white/[0.02] border-white/[0.08] text-void-500"
//                     )}
//                   >
//                     {value ? 'TRUE' : 'FALSE'}
//                   </button>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Short Answer */}
//           {currentQuestion.type === 'short_answer' && (
//             <div>
//               <h3 className="text-lg text-white font-medium mb-6">
//                 {(currentQuestion as ShortAnswerQuestion).question}
//               </h3>
//               <textarea
//                 value={shortAnswer}
//                 onChange={(e) => setShortAnswer(e.target.value)}
//                 disabled={isSubmitted}
//                 placeholder="Type your answer here..."
//                 rows={4}
//                 className={clsx(
//                   "w-full p-4 rounded-xl border bg-white/[0.02] text-white placeholder:text-void-500 transition-all focus:outline-none resize-none",
//                   !isSubmitted && "border-white/[0.08] focus:border-azure-500/50",
//                   isSubmitted && isCorrect && "border-emerald-500/50 bg-emerald-500/10",
//                   isSubmitted && !isCorrect && "border-amber-500/50 bg-amber-500/10"
//                 )}
//               />
//               {isSubmitted && (
//                 <div className="mt-3 p-3 rounded-lg bg-void-900/50 border border-white/[0.05]">
//                   <p className="text-xs text-void-500 uppercase tracking-wider mb-1">Ideal Answer</p>
//                   <p className="text-sm text-void-300">
//                     {(currentQuestion as ShortAnswerQuestion).ideal_answer}
//                   </p>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Feedback */}
//           {isSubmitted && (
//             <div className={clsx(
//               "mt-6 p-4 rounded-xl border",
//               isCorrect 
//                 ? "bg-emerald-500/10 border-emerald-500/30" 
//                 : "bg-red-500/10 border-red-500/30"
//             )}>
//               <div className="flex items-center gap-2 mb-2">
//                 {isCorrect ? (
//                   <CheckCircle size={20} className="text-emerald-400" />
//                 ) : (
//                   <XCircle size={20} className="text-red-400" />
//                 )}
//                 <span className={clsx(
//                   "font-semibold",
//                   isCorrect ? "text-emerald-400" : "text-red-400"
//                 )}>
//                   {isCorrect ? "Correct!" : "Incorrect"}
//                 </span>
//               </div>
//               <p className="text-void-300 text-sm">
//                 {feedback}
//               </p>
//             </div>
//           )}
//         </div>

//         {/* Actions */}
//         <div className="mt-6 flex justify-end">
//           {!isSubmitted ? (
//             <Button 
//               onClick={checkAnswer} 
//               variant="primary"
//               disabled={(currentQuestion.type === 'short_answer' ? !shortAnswer.trim() : selectedAnswer === null) || isGrading}
//             >
//               {isGrading ? (
//                 <>
//                   <Loader2 size={18} className="animate-spin" />
//                   Grading...
//                 </>
//               ) : (
//                 'Submit Answer'
//               )}
//             </Button>
//           ) : (
//             <Button onClick={nextQuestion} variant="primary">
//               {currentIndex < questions.length - 1 ? (
//                 <>
//                   Next Question
//                   <ArrowRight size={18} />
//                 </>
//               ) : (
//                 'See Results'
//               )}
//             </Button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }



// 'use client';

// import React, { useState } from 'react';
// import { SparklesIcon } from './Icons';
// import Button from './Button';
// import { api } from '@/lib/api';
// import { QuizQuestion, MCQQuestion, TrueFalseQuestion, ShortAnswerQuestion } from '@/types';
// import clsx from 'clsx';
// import { Loader2, CheckCircle, XCircle, ArrowRight, RotateCcw, Trophy } from 'lucide-react';

// interface QuizViewProps {
//   chatId: number;
//   videoTitle: string;
// }

// export default function QuizView({ chatId, videoTitle }: QuizViewProps) {
//   const [questions, setQuestions] = useState<QuizQuestion[]>([]);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [selectedAnswer, setSelectedAnswer] = useState<number | boolean | null>(null);
//   const [shortAnswer, setShortAnswer] = useState('');
//   const [isSubmitted, setIsSubmitted] = useState(false);
//   const [isCorrect, setIsCorrect] = useState(false);
//   const [feedback, setFeedback] = useState('');
//   const [score, setScore] = useState(0);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isGrading, setIsGrading] = useState(false);
//   const [isQuizComplete, setIsQuizComplete] = useState(false);
//   const [hasStarted, setHasStarted] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const startQuiz = async () => {
//     setIsLoading(true);
//     setError(null);
    
//     try {
//       const data = await api.getQuiz(chatId);
//       setQuestions(data.questions);
//       setHasStarted(true);
//       setCurrentIndex(0);
//       setScore(0);
//       setIsQuizComplete(false);
//     } catch (err) {
//       setError('Failed to generate quiz. Please try again.');
//       console.error(err);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const currentQuestion = questions[currentIndex];

//   const checkAnswer = async () => {
//     if (currentQuestion.type === 'short_answer') {
//       if (!shortAnswer.trim()) return;
      
//       setIsGrading(true);
//       try {
//         const q = currentQuestion as ShortAnswerQuestion;
//         const result = await api.gradeShortAnswer({
//           question: q.question,
//           ideal_answer: q.ideal_answer,
//           key_points: q.key_points,
//           user_answer: shortAnswer,
//         });
        
//         setIsCorrect(result.correct);
//         setFeedback(result.feedback);
//         if (result.correct) setScore(s => s + 1);
//       } catch (err) {
//         setFeedback('Failed to grade answer. Counted as incorrect.');
//         setIsCorrect(false);
//       } finally {
//         setIsGrading(false);
//         setIsSubmitted(true);
//       }
//       return;
//     }
    
//     if (selectedAnswer === null) return;
    
//     let correct = false;
//     let explanation = '';
    
//     if (currentQuestion.type === 'mcq') {
//       const q = currentQuestion as MCQQuestion;
//       correct = selectedAnswer === q.correct_index;
//       explanation = q.explanation;
//     } else if (currentQuestion.type === 'true_false') {
//       const q = currentQuestion as TrueFalseQuestion;
//       correct = selectedAnswer === q.correct_answer;
//       explanation = q.explanation;
//     }
    
//     setIsCorrect(correct);
//     setFeedback(explanation);
//     if (correct) setScore(s => s + 1);
//     setIsSubmitted(true);
//   };

//   const nextQuestion = () => {
//     if (currentIndex < questions.length - 1) {
//       setCurrentIndex(i => i + 1);
//       setSelectedAnswer(null);
//       setShortAnswer('');
//       setIsSubmitted(false);
//       setIsCorrect(false);
//       setFeedback('');
//     } else {
//       setIsQuizComplete(true);
//     }
//   };

//   const restartQuiz = () => {
//     setHasStarted(false);
//     setQuestions([]);
//     setCurrentIndex(0);
//     setScore(0);
//     setSelectedAnswer(null);
//     setShortAnswer('');
//     setIsSubmitted(false);
//     setIsQuizComplete(false);
//     setFeedback('');
//   };

//   // Start screen
//   if (!hasStarted) {
//     return (
//       <div className="flex-1 flex items-center justify-center p-6">
//         <div className="text-center max-w-md">
//           <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-azure-500/10 to-azure-600/10 border border-azure-500/20 flex items-center justify-center">
//             <Trophy size={36} className="text-azure-400" />
//           </div>
//           <h3 className="text-xl font-display font-semibold text-white mb-2">
//             Take a Quiz
//           </h3>
//           <p className="text-void-400 mb-2">
//             Test your knowledge with 10 questions:
//           </p>
//           <ul className="text-void-500 text-sm mb-6 space-y-1">
//             <li>• Multiple choice questions</li>
//             <li>• True or false statements</li>
//             <li>• Short answer (AI-graded)</li>
//           </ul>
          
//           {error && (
//             <p className="text-red-400 text-sm mb-4">{error}</p>
//           )}
          
//           <Button onClick={startQuiz} variant="primary" disabled={isLoading}>
//             {isLoading ? (
//               <>
//                 <Loader2 size={18} className="animate-spin" />
//                 Generating Quiz...
//               </>
//             ) : (
//               <>
//                 <SparklesIcon size={18} />
//                 Start Quiz
//               </>
//             )}
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   // Loading
//   if (isLoading) {
//     return (
//       <div className="flex-1 flex items-center justify-center p-6">
//         <div className="text-center">
//           <Loader2 size={40} className="animate-spin text-azure-400 mx-auto mb-4" />
//           <p className="text-void-400">Generating your quiz...</p>
//         </div>
//       </div>
//     );
//   }

//   // Quiz complete screen
//   if (isQuizComplete) {
//     const percentage = Math.round((score / questions.length) * 100);
    
//     return (
//       <div className="flex-1 flex items-center justify-center p-6">
//         <div className="text-center max-w-md">
//           <div className={clsx(
//             "w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center",
//             percentage >= 70 
//               ? "bg-emerald-500/20 border-2 border-emerald-500/40" 
//               : "bg-amber-500/20 border-2 border-amber-500/40"
//           )}>
//             <span className={clsx(
//               "text-3xl font-display font-bold",
//               percentage >= 70 ? "text-emerald-400" : "text-amber-400"
//             )}>
//               {percentage}%
//             </span>
//           </div>
          
//           <h3 className="text-2xl font-display font-semibold text-white mb-2">
//             {percentage >= 90 ? "Excellent!" : 
//              percentage >= 70 ? "Great job!" : 
//              percentage >= 50 ? "Good effort!" : "Keep studying!"}
//           </h3>
          
//           <p className="text-void-400 mb-2">
//             You scored {score} out of {questions.length}
//           </p>
          
//           <p className="text-void-500 text-sm mb-8">
//             {percentage >= 70 
//               ? "You have a solid understanding of this video's content." 
//               : "Review the flashcards and try again to improve your score."}
//           </p>
          
//           <div className="flex gap-3 justify-center">
//             <Button onClick={restartQuiz} variant="ghost">
//               <RotateCcw size={18} />
//               Try Again
//             </Button>
//             <Button onClick={startQuiz} variant="primary">
//               New Quiz
//             </Button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Quiz question screen
//   return (
//     <div className="flex-1 flex flex-col overflow-hidden">
//       {/* Scrollable content area */}
//       <div className="flex-1 overflow-y-auto p-6">
//         <div className="max-w-2xl mx-auto">
//           {/* Header */}
//           <div className="flex items-center justify-between mb-4">
//             <div>
//               <h2 className="font-display font-semibold text-xl text-white">Quiz</h2>
//               <p className="text-sm text-void-500 mt-1">
//                 Question {currentIndex + 1} of {questions.length}
//               </p>
//             </div>
//             <div className="text-right">
//               <p className="text-sm text-void-500">Score</p>
//               <p className="text-xl font-display font-bold text-white">{score}/{currentIndex + (isSubmitted ? 1 : 0)}</p>
//             </div>
//           </div>

//           {/* Progress bar */}
//           <div className="h-1.5 bg-void-800 rounded-full mb-6 overflow-hidden">
//             <div 
//               className="h-full bg-gradient-to-r from-azure-500 to-azure-400 transition-all duration-300"
//               style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
//             />
//           </div>

//           {/* Question type badge */}
//           <div className="mb-4">
//             <span className={clsx(
//               "px-3 py-1 rounded-full text-xs font-medium",
//               currentQuestion.type === 'mcq' && "bg-violet-500/20 text-violet-400",
//               currentQuestion.type === 'true_false' && "bg-amber-500/20 text-amber-400",
//               currentQuestion.type === 'short_answer' && "bg-emerald-500/20 text-emerald-400"
//             )}>
//               {currentQuestion.type === 'mcq' && "Multiple Choice"}
//               {currentQuestion.type === 'true_false' && "True or False"}
//               {currentQuestion.type === 'short_answer' && "Short Answer"}
//             </span>
//           </div>

//           {/* Question content */}
//           <div>
//             {/* MCQ */}
//             {currentQuestion.type === 'mcq' && (
//               <div>
//                 <h3 className="text-lg text-white font-medium mb-6">
//                   {(currentQuestion as MCQQuestion).question}
//                 </h3>
//                 <div className="space-y-3">
//                   {(currentQuestion as MCQQuestion).options.map((option, i) => (
//                     <button
//                       key={i}
//                       onClick={() => !isSubmitted && setSelectedAnswer(i)}
//                       disabled={isSubmitted}
//                       className={clsx(
//                         "w-full p-4 rounded-xl border text-left transition-all",
//                         !isSubmitted && selectedAnswer === i && "bg-azure-500/20 border-azure-500/50 text-white",
//                         !isSubmitted && selectedAnswer !== i && "bg-white/[0.02] border-white/[0.08] text-void-300 hover:bg-white/[0.05] hover:border-white/[0.15]",
//                         isSubmitted && i === (currentQuestion as MCQQuestion).correct_index && "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
//                         isSubmitted && selectedAnswer === i && i !== (currentQuestion as MCQQuestion).correct_index && "bg-red-500/20 border-red-500/50 text-red-300",
//                         isSubmitted && selectedAnswer !== i && i !== (currentQuestion as MCQQuestion).correct_index && "bg-white/[0.02] border-white/[0.08] text-void-500"
//                       )}
//                     >
//                       <span className="font-medium mr-3">{String.fromCharCode(65 + i)}.</span>
//                       {option}
//                     </button>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {/* True/False */}
//             {currentQuestion.type === 'true_false' && (
//               <div>
//                 <h3 className="text-lg text-white font-medium mb-6">
//                   "{(currentQuestion as TrueFalseQuestion).statement}"
//                 </h3>
//                 <div className="flex gap-4">
//                   {[true, false].map((value) => (
//                     <button
//                       key={String(value)}
//                       onClick={() => !isSubmitted && setSelectedAnswer(value)}
//                       disabled={isSubmitted}
//                       className={clsx(
//                         "flex-1 p-6 rounded-xl border text-center font-semibold transition-all",
//                         !isSubmitted && selectedAnswer === value && "bg-azure-500/20 border-azure-500/50 text-white",
//                         !isSubmitted && selectedAnswer !== value && "bg-white/[0.02] border-white/[0.08] text-void-300 hover:bg-white/[0.05] hover:border-white/[0.15]",
//                         isSubmitted && value === (currentQuestion as TrueFalseQuestion).correct_answer && "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
//                         isSubmitted && selectedAnswer === value && value !== (currentQuestion as TrueFalseQuestion).correct_answer && "bg-red-500/20 border-red-500/50 text-red-300",
//                         isSubmitted && selectedAnswer !== value && value !== (currentQuestion as TrueFalseQuestion).correct_answer && "bg-white/[0.02] border-white/[0.08] text-void-500"
//                       )}
//                     >
//                       {value ? 'TRUE' : 'FALSE'}
//                     </button>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {/* Short Answer */}
//             {currentQuestion.type === 'short_answer' && (
//               <div>
//                 <h3 className="text-lg text-white font-medium mb-6">
//                   {(currentQuestion as ShortAnswerQuestion).question}
//                 </h3>
//                 <textarea
//                   value={shortAnswer}
//                   onChange={(e) => setShortAnswer(e.target.value)}
//                   disabled={isSubmitted}
//                   placeholder="Type your answer here..."
//                   rows={4}
//                   className={clsx(
//                     "w-full p-4 rounded-xl border bg-white/[0.02] text-white placeholder:text-void-500 transition-all focus:outline-none resize-none",
//                     !isSubmitted && "border-white/[0.08] focus:border-azure-500/50",
//                     isSubmitted && isCorrect && "border-emerald-500/50 bg-emerald-500/10",
//                     isSubmitted && !isCorrect && "border-amber-500/50 bg-amber-500/10"
//                   )}
//                 />
//                 {isSubmitted && (
//                   <div className="mt-3 p-3 rounded-lg bg-void-900/50 border border-white/[0.05]">
//                     <p className="text-xs text-void-500 uppercase tracking-wider mb-1">Ideal Answer</p>
//                     <p className="text-sm text-void-300">
//                       {(currentQuestion as ShortAnswerQuestion).ideal_answer}
//                     </p>
//                   </div>
//                 )}
//               </div>
//             )}

//             {/* Feedback */}
//             {isSubmitted && (
//               <div className={clsx(
//                 "mt-6 p-4 rounded-xl border",
//                 isCorrect 
//                   ? "bg-emerald-500/10 border-emerald-500/30" 
//                   : "bg-red-500/10 border-red-500/30"
//               )}>
//                 <div className="flex items-center gap-2 mb-2">
//                   {isCorrect ? (
//                     <CheckCircle size={20} className="text-emerald-400" />
//                   ) : (
//                     <XCircle size={20} className="text-red-400" />
//                   )}
//                   <span className={clsx(
//                     "font-semibold",
//                     isCorrect ? "text-emerald-400" : "text-red-400"
//                   )}>
//                     {isCorrect ? "Correct!" : "Incorrect"}
//                   </span>
//                 </div>
//                 <p className="text-void-300 text-sm">
//                   {feedback}
//                 </p>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Fixed bottom action bar */}
//       <div className="flex-shrink-0 p-4 border-t border-white/[0.06] bg-void-950">
//         <div className="max-w-2xl mx-auto flex justify-end">
//           {!isSubmitted ? (
//             <Button 
//               onClick={checkAnswer} 
//               variant="primary"
//               disabled={(currentQuestion.type === 'short_answer' ? !shortAnswer.trim() : selectedAnswer === null) || isGrading}
//             >
//               {isGrading ? (
//                 <>
//                   <Loader2 size={18} className="animate-spin" />
//                   Grading...
//                 </>
//               ) : (
//                 'Submit Answer'
//               )}
//             </Button>
//           ) : (
//             <Button onClick={nextQuestion} variant="primary">
//               {currentIndex < questions.length - 1 ? (
//                 <>
//                   Next Question
//                   <ArrowRight size={18} />
//                 </>
//               ) : (
//                 'See Results'
//               )}
//             </Button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }


'use client';

import React, { useEffect, useState } from 'react';
import { SparklesIcon } from './Icons';
import Button from './Button';
import { api } from '@/lib/api';
import { QuizQuestion, MCQQuestion, TrueFalseQuestion, ShortAnswerQuestion } from '@/types';
import clsx from 'clsx';
import { Loader2, CheckCircle, XCircle, ArrowRight, RotateCcw, Trophy } from 'lucide-react';

interface QuizViewProps {
  chatId: number;
  videoTitle: string;
}

export default function QuizView({ chatId, videoTitle }: QuizViewProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | boolean | null>(null);
  const [shortAnswer, setShortAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset quiz when switching to a different video
  useEffect(() => {
    setHasStarted(false);
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShortAnswer('');
    setIsSubmitted(false);
    setIsQuizComplete(false);
    setFeedback('');
    setError(null);
  }, [chatId]);

  const startQuiz = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await api.getQuiz(chatId);
      setQuestions(data.questions);
      setHasStarted(true);
      setCurrentIndex(0);
      setScore(0);
      setIsQuizComplete(false);
    } catch (err) {
      setError('Failed to generate quiz. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuestion = questions[currentIndex];

  const checkAnswer = async () => {
    if (currentQuestion.type === 'short_answer') {
      if (!shortAnswer.trim()) return;
      
      setIsGrading(true);
      try {
        const q = currentQuestion as ShortAnswerQuestion;
        const result = await api.gradeShortAnswer({
          question: q.question,
          ideal_answer: q.ideal_answer,
          key_points: q.key_points,
          user_answer: shortAnswer,
        });
        
        setIsCorrect(result.correct);
        setFeedback(result.feedback);
        if (result.correct) setScore(s => s + 1);
      } catch (err) {
        setFeedback('Failed to grade answer. Counted as incorrect.');
        setIsCorrect(false);
      } finally {
        setIsGrading(false);
        setIsSubmitted(true);
      }
      return;
    }
    
    if (selectedAnswer === null) return;
    
    let correct = false;
    let explanation = '';
    
    if (currentQuestion.type === 'mcq') {
      const q = currentQuestion as MCQQuestion;
      correct = selectedAnswer === q.correct_index;
      explanation = q.explanation;
    } else if (currentQuestion.type === 'true_false') {
      const q = currentQuestion as TrueFalseQuestion;
      correct = selectedAnswer === q.correct_answer;
      explanation = q.explanation;
    }
    
    setIsCorrect(correct);
    setFeedback(explanation);
    if (correct) setScore(s => s + 1);
    setIsSubmitted(true);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelectedAnswer(null);
      setShortAnswer('');
      setIsSubmitted(false);
      setIsCorrect(false);
      setFeedback('');
    } else {
      setIsQuizComplete(true);
    }
  };

  const restartQuiz = () => {
    setHasStarted(false);
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShortAnswer('');
    setIsSubmitted(false);
    setIsQuizComplete(false);
    setFeedback('');
  };

  // Start screen
  if (!hasStarted) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-azure-500/10 to-azure-600/10 border border-azure-500/20 flex items-center justify-center">
            <Trophy size={36} className="text-azure-400" />
          </div>
          <h3 className="text-xl font-display font-semibold text-white mb-2">
            Take a Quiz
          </h3>
          <p className="text-void-400 mb-2">
            Test your knowledge with 10 questions:
          </p>
          <ul className="text-void-500 text-sm mb-6 space-y-1">
            <li>• Multiple choice questions</li>
            <li>• True or false statements</li>
            <li>• Short answer (AI-graded)</li>
          </ul>
          
          {error && (
            <p className="text-red-400 text-sm mb-4">{error}</p>
          )}
          
          <Button onClick={startQuiz} variant="primary" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Generating Quiz...
              </>
            ) : (
              <>
                <SparklesIcon size={18} />
                Start Quiz
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-azure-400 mx-auto mb-4" />
          <p className="text-void-400">Generating your quiz...</p>
        </div>
      </div>
    );
  }

  // Quiz complete screen
  if (isQuizComplete) {
    const percentage = Math.round((score / questions.length) * 100);
    
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className={clsx(
            "w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center",
            percentage >= 70 
              ? "bg-emerald-500/20 border-2 border-emerald-500/40" 
              : "bg-amber-500/20 border-2 border-amber-500/40"
          )}>
            <span className={clsx(
              "text-3xl font-display font-bold",
              percentage >= 70 ? "text-emerald-400" : "text-amber-400"
            )}>
              {percentage}%
            </span>
          </div>
          
          <h3 className="text-2xl font-display font-semibold text-white mb-2">
            {percentage >= 90 ? "Excellent!" : 
             percentage >= 70 ? "Great job!" : 
             percentage >= 50 ? "Good effort!" : "Keep studying!"}
          </h3>
          
          <p className="text-void-400 mb-2">
            You scored {score} out of {questions.length}
          </p>
          
          <p className="text-void-500 text-sm mb-8">
            {percentage >= 70 
              ? "You have a solid understanding of this video's content." 
              : "Review the flashcards and try again to improve your score."}
          </p>
          
          <div className="flex gap-3 justify-center">
            <Button onClick={restartQuiz} variant="ghost">
              <RotateCcw size={18} />
              Try Again
            </Button>
            <Button onClick={startQuiz} variant="primary">
              New Quiz
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz question screen
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-semibold text-xl text-white">Quiz</h2>
              <p className="text-sm text-void-500 mt-1">
                Question {currentIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-void-500">Score</p>
              <p className="text-xl font-display font-bold text-white">{score}/{currentIndex + (isSubmitted ? 1 : 0)}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-void-800 rounded-full mb-6 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-azure-500 to-azure-400 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
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

          {/* Question content */}
          <div>
            {/* MCQ */}
            {currentQuestion.type === 'mcq' && (
              <div>
                <h3 className="text-lg text-white font-medium mb-6">
                  {(currentQuestion as MCQQuestion).question}
                </h3>
                <div className="space-y-3">
                  {(currentQuestion as MCQQuestion).options.map((option, i) => (
                    <button
                      key={i}
                      onClick={() => !isSubmitted && setSelectedAnswer(i)}
                      disabled={isSubmitted}
                      className={clsx(
                        "w-full p-4 rounded-xl border text-left transition-all",
                        !isSubmitted && selectedAnswer === i && "bg-azure-500/20 border-azure-500/50 text-white",
                        !isSubmitted && selectedAnswer !== i && "bg-white/[0.02] border-white/[0.08] text-void-300 hover:bg-white/[0.05] hover:border-white/[0.15]",
                        isSubmitted && i === (currentQuestion as MCQQuestion).correct_index && "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
                        isSubmitted && selectedAnswer === i && i !== (currentQuestion as MCQQuestion).correct_index && "bg-red-500/20 border-red-500/50 text-red-300",
                        isSubmitted && selectedAnswer !== i && i !== (currentQuestion as MCQQuestion).correct_index && "bg-white/[0.02] border-white/[0.08] text-void-500"
                      )}
                    >
                      <span className="font-medium mr-3">{String.fromCharCode(65 + i)}.</span>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* True/False */}
            {currentQuestion.type === 'true_false' && (
              <div>
                <h3 className="text-lg text-white font-medium mb-6">
                  "{(currentQuestion as TrueFalseQuestion).statement}"
                </h3>
                <div className="flex gap-4">
                  {[true, false].map((value) => (
                    <button
                      key={String(value)}
                      onClick={() => !isSubmitted && setSelectedAnswer(value)}
                      disabled={isSubmitted}
                      className={clsx(
                        "flex-1 p-6 rounded-xl border text-center font-semibold transition-all",
                        !isSubmitted && selectedAnswer === value && "bg-azure-500/20 border-azure-500/50 text-white",
                        !isSubmitted && selectedAnswer !== value && "bg-white/[0.02] border-white/[0.08] text-void-300 hover:bg-white/[0.05] hover:border-white/[0.15]",
                        isSubmitted && value === (currentQuestion as TrueFalseQuestion).correct_answer && "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
                        isSubmitted && selectedAnswer === value && value !== (currentQuestion as TrueFalseQuestion).correct_answer && "bg-red-500/20 border-red-500/50 text-red-300",
                        isSubmitted && selectedAnswer !== value && value !== (currentQuestion as TrueFalseQuestion).correct_answer && "bg-white/[0.02] border-white/[0.08] text-void-500"
                      )}
                    >
                      {value ? 'TRUE' : 'FALSE'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Short Answer */}
            {currentQuestion.type === 'short_answer' && (
              <div>
                <h3 className="text-lg text-white font-medium mb-6">
                  {(currentQuestion as ShortAnswerQuestion).question}
                </h3>
                <textarea
                  value={shortAnswer}
                  onChange={(e) => setShortAnswer(e.target.value)}
                  disabled={isSubmitted}
                  placeholder="Type your answer here..."
                  rows={4}
                  className={clsx(
                    "w-full p-4 rounded-xl border bg-white/[0.02] text-white placeholder:text-void-500 transition-all focus:outline-none resize-none",
                    !isSubmitted && "border-white/[0.08] focus:border-azure-500/50",
                    isSubmitted && isCorrect && "border-emerald-500/50 bg-emerald-500/10",
                    isSubmitted && !isCorrect && "border-amber-500/50 bg-amber-500/10"
                  )}
                />
                {isSubmitted && (
                  <div className="mt-3 p-3 rounded-lg bg-void-900/50 border border-white/[0.05]">
                    <p className="text-xs text-void-500 uppercase tracking-wider mb-1">Ideal Answer</p>
                    <p className="text-sm text-void-300">
                      {(currentQuestion as ShortAnswerQuestion).ideal_answer}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Feedback */}
            {isSubmitted && (
              <div className={clsx(
                "mt-6 p-4 rounded-xl border",
                isCorrect 
                  ? "bg-emerald-500/10 border-emerald-500/30" 
                  : "bg-red-500/10 border-red-500/30"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  {isCorrect ? (
                    <CheckCircle size={20} className="text-emerald-400" />
                  ) : (
                    <XCircle size={20} className="text-red-400" />
                  )}
                  <span className={clsx(
                    "font-semibold",
                    isCorrect ? "text-emerald-400" : "text-red-400"
                  )}>
                    {isCorrect ? "Correct!" : "Incorrect"}
                  </span>
                </div>
                <p className="text-void-300 text-sm">
                  {feedback}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed bottom action bar */}
      <div className="flex-shrink-0 p-4 border-t border-white/[0.06] bg-void-950">
        <div className="max-w-2xl mx-auto flex justify-end">
          {!isSubmitted ? (
            <Button 
              onClick={checkAnswer} 
              variant="primary"
              disabled={(currentQuestion.type === 'short_answer' ? !shortAnswer.trim() : selectedAnswer === null) || isGrading}
            >
              {isGrading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Grading...
                </>
              ) : (
                'Submit Answer'
              )}
            </Button>
          ) : (
            <Button onClick={nextQuestion} variant="primary">
              {currentIndex < questions.length - 1 ? (
                <>
                  Next Question
                  <ArrowRight size={18} />
                </>
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