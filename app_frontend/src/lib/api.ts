import { AuthTokens, Chat, Message, CreateChatResponse, CreateMessageResponse, FlashcardsResponse, GradeResponse, GradeRequest, QuizResponse, KeyConcept, FlashcardGenerateRequest, QuizzesListResponse, QuizGenerateRequest, GeneratedQuizResponse } from '@/types';

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

  async createMessage(input: string, chatId: number): Promise<CreateMessageResponse> {
    return this.request<CreateMessageResponse>('/messages/', {
      method: 'POST',
      body: JSON.stringify({ input, chat_id: chatId }),
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
}

export const api = new ApiClient();
