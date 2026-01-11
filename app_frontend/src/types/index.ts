export interface User {
  id: number;
  username: string;
  email: string;
}

export interface TranscriptSegment {
  text: string;
  start: number;  // seconds
  duration: number;  // seconds
}

export interface Chat {
  id: number;
  session_name: string;
  source_type: string;  // 'youtube', 'pdf', 'text'
  source_id?: string | null;  // YouTube ID, or null for pdf/text
  source_url?: string | null;  // YouTube URL, PDF storage URL, or null
  source_content: string;  // Transcript, PDF text, or pasted text
  timed_content?: string;  // JSON string of TranscriptSegment[] (YouTube only)
  prompt: string;
  notes: string;
  user_id: number;
  space_id?: number | null;
  chat_style?: string;  // study, conversational, concise, custom
  custom_instructions?: string;
  manual_notes?: string;  // User's own notes
  created_at?: string;
}

// ============== Spaces ==============

export interface Space {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  chat_count: number;
}

export interface SpaceWithChats {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  chats: ChatBrief[];
}

export interface ChatBrief {
  id: number;
  session_name: string;
  source_type: string;
  source_id?: string | null;
  created_at?: string;
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
  transcript_timed?: TranscriptSegment[];
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
  hint?: string;
  timestamp?: string;
  explanation?: string;
  set_name?: string;
  review_count: number;
}

export interface KeyConcept {
  id: number;
  title: string;
  description?: string;
  start_time?: number;  // seconds
  end_time?: number;    // seconds
  importance?: number;  // 1-3
}

export interface FlashcardGenerateRequest {
  count: number;
  topic_ids?: number[];
  focus_prompt?: string;
  set_name?: string;
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

// Old response (for single quiz generation)
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

// New Quiz types for config-based generation
export interface QuizGenerateRequest {
  mcq_count: number;
  tf_count: number;
  short_answer_count: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  topic_ids?: number[];
  focus_prompt?: string;
  set_name?: string;
}

export interface SavedQuizQuestion {
  id: number;
  type: string;
  question: string;
  options?: string[];
  correct_answer: string;
  explanation?: string;
  user_answer?: string;
  is_correct?: number;
}

export interface SavedQuiz {
  id: number;
  set_name: string;
  total_questions: number;
  score?: number;
  completed: number;
  difficulty: string;
  created_at: string;
  questions: SavedQuizQuestion[];
}

export interface QuizzesListResponse {
  chat_id: number;
  video_title: string;
  quizzes: SavedQuiz[];
}

export interface GeneratedQuizResponse {
  id: number;
  chat_id: number;
  set_name: string;
  total_questions: number;
  questions: SavedQuizQuestion[];
}


// ============== Code Practice Types ==============

export interface CodeExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface CodingProblem {
  id: number;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  examples: CodeExample[];
  hints: string[];
  solution?: string;
}

export interface CodeProblemsResponse {
  is_cs_video: boolean;
  problems: CodingProblem[];
}

export interface CodeEvaluateRequest {
  problem_id: number;
  code: string;
  language: string;
}

export interface CodeEvaluationResponse {
  score: number;
  is_correct: boolean;
  feedback: string;
  suggestions: string[];
}


// ============== Flashcard CRUD Types ==============

export interface FlashcardUpdateRequest {
  question?: string;
  answer?: string;
  hint?: string;
  explanation?: string;
  timestamp?: string;
  difficulty?: string;
}

export interface FlashcardCreateRequest {
  question: string;
  answer: string;
  hint?: string;
  explanation?: string;
  timestamp?: string;
  difficulty?: string;
  set_name: string;
}

export interface SetRenameRequest {
  chat_id: number;
  old_name: string;
  new_name: string;
}











































