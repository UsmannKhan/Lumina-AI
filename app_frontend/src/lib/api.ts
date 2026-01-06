import { AuthTokens, Chat, Message, CreateChatResponse, CreateMessageResponse, FlashcardsResponse, GradeResponse, GradeRequest, QuizResponse, KeyConcept, FlashcardGenerateRequest, QuizzesListResponse, QuizGenerateRequest, GeneratedQuizResponse, CodeProblemsResponse, CodeEvaluateRequest, CodeEvaluationResponse, Flashcard, FlashcardUpdateRequest, FlashcardCreateRequest, SetRenameRequest } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || 'An error occurred');
    }

    const text = await response.text();
    if (!text) return {} as T;

    return JSON.parse(text);
  }

  // Auth
  async register(email: string, username: string, password: string): Promise<void> {
    await this.request('/auth/', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
  }

  async login(username: string, password: string): Promise<AuthTokens> {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(error.detail || 'Login failed');
    }

    const tokens: AuthTokens = await response.json();
    this.setToken(tokens.access_token);
    return tokens;
  }

  logout() {
    this.setToken(null);
  }

  // Chats
  async getChats(): Promise<Chat[]> {
    return this.request<Chat[]>('/chats/');
  }

  async createChat(youtubeLink: string): Promise<CreateChatResponse> {
    return this.request<CreateChatResponse>('/chats/', {
      method: 'POST',
      body: JSON.stringify({ youtube_link: youtubeLink }),
    });
  }

  async deleteChat(chatId: number): Promise<void> {
    await this.request(`/chats/${chatId}`, { method: 'DELETE' });
  }

  // Messages
  async getMessages(chatId: number): Promise<Message[]> {
    return this.request<Message[]>(`/messages/${chatId}`);
  }

  async createMessage(input: string, chatId: number, useWebSearch: boolean = false): Promise<CreateMessageResponse> {
    return this.request<CreateMessageResponse>('/messages/', {
      method: 'POST',
      body: JSON.stringify({ input, chat_id: chatId, use_web_search: useWebSearch }),
    });
  }

  // Flashcards
  async getFlashcards(chatId: number): Promise<FlashcardsResponse> {
    return this.request<FlashcardsResponse>(`/flashcards/${chatId}`);
  }

  async deleteFlashcards(chatId: number): Promise<void> {
    await this.request(`/flashcards/${chatId}`, { method: 'DELETE' });
  }

  async regenerateFlashcards(chatId: number): Promise<FlashcardsResponse> {
    // Delete existing, then get (which will generate new ones)
    await this.deleteFlashcards(chatId);
    return this.getFlashcards(chatId);
  }

  // Quiz
  async getQuiz(chatId: number): Promise<QuizResponse> {
    return this.request<QuizResponse>(`/quiz/${chatId}`);
  }

  async getQuizzes(chatId: number): Promise<QuizzesListResponse> {
    return this.request<QuizzesListResponse>(`/quiz/${chatId}`);
  }

  async generateQuizWithOptions(
    chatId: number,
    options: QuizGenerateRequest
  ): Promise<GeneratedQuizResponse> {
    return this.request<GeneratedQuizResponse>(`/quiz/${chatId}/generate`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async gradeShortAnswer(data: GradeRequest): Promise<GradeResponse> {
    return this.request<GradeResponse>('/quiz/grade', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async completeQuiz(quizId: number, score: number): Promise<{ message: string; quiz_id: number; score: number }> {
    return this.request<{ message: string; quiz_id: number; score: number }>(`/quiz/${quizId}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ score }),
    });
  }

  // Key Concepts
  async getConcepts(chatId: number): Promise<KeyConcept[]> {
    return this.request<KeyConcept[]>(`/chats/${chatId}/concepts`);
  }

  // Generate flashcards with options
  async generateFlashcardsWithOptions(
    chatId: number,
    options: FlashcardGenerateRequest
  ): Promise<FlashcardsResponse> {
    return this.request<FlashcardsResponse>(`/flashcards/${chatId}/generate`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  // Code Practice
  async getCodeProblems(chatId: number): Promise<CodeProblemsResponse> {
    return this.request<CodeProblemsResponse>(`/code/${chatId}`);
  }

  async generateCodeProblems(chatId: number): Promise<CodeProblemsResponse> {
    return this.request<CodeProblemsResponse>(`/code/${chatId}/generate`, {
      method: 'POST',
    });
  }

  async evaluateCode(
    chatId: number,
    request: CodeEvaluateRequest
  ): Promise<CodeEvaluationResponse> {
    return this.request<CodeEvaluationResponse>(`/code/${chatId}/evaluate`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Flashcard CRUD
  async updateFlashcard(cardId: number, updates: FlashcardUpdateRequest): Promise<Flashcard> {
    return this.request<Flashcard>(`/flashcards/card/${cardId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteFlashcard(cardId: number): Promise<{ message: string; id: number }> {
    return this.request<{ message: string; id: number }>(`/flashcards/card/${cardId}`, {
      method: 'DELETE',
    });
  }

  async createFlashcard(chatId: number, card: FlashcardCreateRequest): Promise<Flashcard> {
    return this.request<Flashcard>(`/flashcards/${chatId}/card`, {
      method: 'POST',
      body: JSON.stringify(card),
    });
  }

  async renameSet(request: SetRenameRequest): Promise<{ message: string; updated_count: number }> {
    return this.request<{ message: string; updated_count: number }>('/flashcards/set/rename', {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  async deleteSet(chatId: number, setName: string): Promise<{ message: string; deleted_count: number }> {
    return this.request<{ message: string; deleted_count: number }>(`/flashcards/set/${chatId}/${encodeURIComponent(setName)}`, {
      method: 'DELETE',
    });
  }

  async deleteQuiz(quizId: number): Promise<{ message: string; id: number }> {
    return this.request<{ message: string; id: number }>(`/quiz/${quizId}`, {
      method: 'DELETE',
    });
  }

  async updateChatStyle(chatId: number, style: string, customInstructions?: string): Promise<{ message: string; chat_id: number; style: string; custom_instructions: string | null }> {
    return this.request<{ message: string; chat_id: number; style: string; custom_instructions: string | null }>(`/chats/${chatId}/style`, {
      method: 'PUT',
      body: JSON.stringify({ style, custom_instructions: customInstructions }),
    });
  }

  async reorderFlashcards(cardIds: number[]): Promise<FlashcardsResponse> {
    return this.request<FlashcardsResponse>('/flashcards/reorder', {
      method: 'PUT',
      body: JSON.stringify({ card_ids: cardIds }),
    });
  }
}

export const api = new ApiClient();
