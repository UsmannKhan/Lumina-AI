export interface User {
  id: number;
  username: string;
  email: string;
}

export interface Chat {
  id: number;
  session_name: string;
  youtube_id: string;
  youtube_transcript: string;
  prompt: string;
  notes: string;
  user_id: number;
}

export interface Message {
  id: number;
  input: string;
  output: string;
  chat_id: number;
  user_id: number;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
}

export interface CreateChatResponse {
  id: number;
  video_id: string;
  notes: string;
  transcript: string;
  session_name: string;
}

export interface CreateMessageResponse {
  id: number;
  input: string;
  output: string;
  chat_id: number;
  user_id: number;
}

export interface Flashcard {
  id: number;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  review_count: number;
}

export interface FlashcardsResponse {
  chat_id: number;
  video_title: string;
  flashcards: Flashcard[];
  generated_now: boolean;
}

export interface MCQQuestion {
  type: 'mcq';
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface TrueFalseQuestion {
  type: 'true_false';
  statement: string;
  correct_answer: boolean;
  explanation: string;
}

export interface ShortAnswerQuestion {
  type: 'short_answer';
  question: string;
  ideal_answer: string;
  key_points: string[];
}

export type QuizQuestion = MCQQuestion | TrueFalseQuestion | ShortAnswerQuestion;

export interface QuizResponse {
  chat_id: number;
  video_title: string;
  questions: QuizQuestion[];
}

export interface GradeRequest {
  question: string;
  ideal_answer: string;
  key_points: string[];
  user_answer: string;
}

export interface GradeResponse {
  correct: boolean;
  score: number;
  feedback: string;
}



















































