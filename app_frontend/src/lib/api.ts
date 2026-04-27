import { AuthTokens, Chat, Message, CreateChatResponse, CreateMessageResponse, FlashcardsResponse, GradeResponse, GradeRequest, QuizResponse, KeyConcept, FlashcardGenerateRequest, QuizzesListResponse, QuizGenerateRequest, GeneratedQuizResponse, CodeProblemsResponse, CodeEvaluateRequest, CodeEvaluationResponse, Flashcard, FlashcardUpdateRequest, FlashcardCreateRequest, SetRenameRequest, Space, SpaceWithChats } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** Custom event dispatched when the API receives a 401. AuthContext listens
 *  for it so it can drop the user back to the login screen. */
export const AUTH_EXPIRED_EVENT = 'lumina-auth-expired';

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

  /** Called from request() on a 401. Clears local auth and signals the app. */
  private handleUnauthorized() {
    if (!this.token && (typeof window === 'undefined' || !localStorage.getItem('auth_token'))) {
      // Already cleared — nothing to broadcast.
      return;
    }
    this.setToken(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
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

    if (response.status === 401) {
      // Token is missing/expired/revoked. Clear local state and signal the
      // auth context so the user lands on the login screen instead of an
      // empty "logged in" home page.
      this.handleUnauthorized();
      const error = await response.json().catch(() => ({ detail: 'Session expired' }));
      throw new Error(error.detail || 'Session expired');
    }

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

  async createChat(youtubeLink: string, spaceId?: number): Promise<CreateChatResponse> {
    return this.request<CreateChatResponse>('/chats/', {
      method: 'POST',
      body: JSON.stringify({ youtube_link: youtubeLink, space_id: spaceId }),
    });
  }

  async uploadPdf(file: File, spaceId?: number): Promise<CreateChatResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (spaceId) {
      formData.append('space_id', spaceId.toString());
    }

    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/chats/pdf`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  }

  getPdfUrl(chatId: number): string {
    const token = this.getToken();
    // Return URL with token as query param for PDF embedding
    return `${API_BASE_URL}/chats/${chatId}/pdf?token=${token}`;
  }

  getDocxUrl(chatId: number): string {
    const token = this.getToken();
    // Return URL with token as query param for DOCX download
    return `${API_BASE_URL}/chats/${chatId}/docx?token=${token}`;
  }

  getAudioUrl(chatId: number): string {
    const token = this.getToken();
    return `${API_BASE_URL}/chats/${chatId}/audio?token=${token}`;
  }

  /** Create a chat from a website URL — backend fetches & extracts content. */
  async createChatFromWebsite(url: string, spaceId?: number): Promise<CreateChatResponse> {
    return this.request<CreateChatResponse>('/chats/website', {
      method: 'POST',
      body: JSON.stringify({ url, space_id: spaceId }),
    });
  }

  /** Upload an audio file (mp3/wav/m4a/ogg/webm/flac, up to 25MB). */
  async uploadAudio(file: File, spaceId?: number): Promise<CreateChatResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (spaceId) formData.append('space_id', spaceId.toString());

    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/chats/audio`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  }

  async deleteChat(chatId: number): Promise<void> {
    await this.request(`/chats/${chatId}`, { method: 'DELETE' });
  }

  // Spaces
  async getSpaces(): Promise<Space[]> {
    return this.request<Space[]>('/spaces/');
  }

  async createSpace(name: string): Promise<Space> {
    return this.request<Space>('/spaces/', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async getSpace(spaceId: number): Promise<SpaceWithChats> {
    return this.request<SpaceWithChats>(`/spaces/${spaceId}`);
  }

  async updateSpace(spaceId: number, name: string): Promise<Space> {
    return this.request<Space>(`/spaces/${spaceId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async deleteSpace(spaceId: number): Promise<{ message: string; id: number }> {
    return this.request<{ message: string; id: number }>(`/spaces/${spaceId}`, {
      method: 'DELETE',
    });
  }

  async moveChatToSpace(chatId: number, spaceId: number | null): Promise<{ message: string; chat_id: number; space_id: number | null }> {
    return this.request<{ message: string; chat_id: number; space_id: number | null }>('/spaces/move-chat', {
      method: 'POST',
      body: JSON.stringify({ chat_id: chatId, space_id: spaceId }),
    });
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

  // Manual Notes
  async updateManualNotes(chatId: number, content: string): Promise<{ message: string; chat_id: number; manual_notes: string }> {
    return this.request<{ message: string; chat_id: number; manual_notes: string }>(`/chats/${chatId}/manual-notes`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
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
