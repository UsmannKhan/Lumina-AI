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
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface FlashcardsResponse {
  chat_id: number;
  video_title: string;
  flashcards: Flashcard[];
}
