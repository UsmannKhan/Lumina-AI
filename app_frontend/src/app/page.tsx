'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Chat, Message, Space } from '@/types';
import {
  ChatSidebar,
  ChatView,
  EmptyState,
  LibraryView,
  SpaceDetailView,
  NewChatModal,
  AuthPage,
} from '@/components';
import type { SourceKind } from '@/components/NewChatModal';
import { Aperture } from '@/components/Logo';

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading, login, register, logout, username } = useAuth();

  const [chats, setChats] = useState<Chat[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [activeSpaceId, setActiveSpaceId] = useState<number | null>(null);
  // Deep-link target for the next chat opened — e.g. when the user clicks
  // a flashcard set or quiz row in SpaceDetailView, this carries enough
  // info for ChatView to open on the right tab AND auto-start the exact
  // set/quiz the user clicked.
  type PendingDeepLink =
    | { tab: 'flashcards'; setName: string }
    | { tab: 'quiz'; quizId: number };
  const [pendingDeepLink, setPendingDeepLink] = useState<PendingDeepLink | null>(null);

  // Clear the deep-link target once a chat opens with it — its props are
  // captured on first render, and we don't want a stale value affecting
  // subsequent navigations from the sidebar/library.
  useEffect(() => {
    if (pendingDeepLink !== null) {
      setPendingDeepLink(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat?.id]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  // Optional source-type pre-selection for the new-chat modal.
  const [initialModalKind, setInitialModalKind] = useState<SourceKind | null>(null);

  const openNewChatModal = useCallback((kind?: SourceKind) => {
    setInitialModalKind(kind ?? null);
    setIsNewChatModalOpen(true);
  }, []);
  // Default to collapsed on small screens; expanded on lg+ (1024px)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024;
  });
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  // True when user has opened the Library view (overrides default empty state behavior)
  const [showLibrary, setShowLibrary] = useState(false);
  // The space whose detail page is currently visible. null means we are not
  // on the space-detail screen.
  const [viewingSpaceId, setViewingSpaceId] = useState<number | null>(null);

  const deletingSpaceIds = useRef<Set<number>>(new Set());

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [userChats, userSpaces] = await Promise.all([api.getChats(), api.getSpaces()]);
      setChats(userChats);
      setSpaces(userSpaces.filter((s) => !deletingSpaceIds.current.has(s.id)));
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!activeChat) {
        setMessages([]);
        return;
      }
      try {
        const chatMessages = await api.getMessages(activeChat.id);
        setMessages(chatMessages);
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };
    loadMessages();
  }, [activeChat]);

  const handleCreateChat = async (youtubeLink: string, spaceId?: number) => {
    const newChat = await api.createChat(youtubeLink, spaceId);
    await loadData();
    const fullChats = await api.getChats();
    const createdChat = fullChats.find((c) => c.id === newChat.id);
    if (createdChat) {
      setActiveChat(createdChat);
      setShowLibrary(false);
      setViewingSpaceId(null);
      setActiveSpaceId(spaceId || null);
    }
  };

  const handleUploadPdf = async (file: File, spaceId?: number) => {
    const newChat = await api.uploadPdf(file, spaceId);
    await loadData();
    const fullChats = await api.getChats();
    const createdChat = fullChats.find((c) => c.id === newChat.id);
    if (createdChat) {
      setActiveChat(createdChat);
      setShowLibrary(false);
      setViewingSpaceId(null);
      setActiveSpaceId(spaceId || null);
    }
  };

  const handleUploadAudio = async (file: File, spaceId?: number) => {
    const newChat = await api.uploadAudio(file, spaceId);
    await loadData();
    const fullChats = await api.getChats();
    const createdChat = fullChats.find((c) => c.id === newChat.id);
    if (createdChat) {
      setActiveChat(createdChat);
      setShowLibrary(false);
      setViewingSpaceId(null);
      setActiveSpaceId(spaceId || null);
    }
  };

  const handleCreateWebsiteChat = async (url: string, spaceId?: number) => {
    const newChat = await api.createChatFromWebsite(url, spaceId);
    await loadData();
    const fullChats = await api.getChats();
    const createdChat = fullChats.find((c) => c.id === newChat.id);
    if (createdChat) {
      setActiveChat(createdChat);
      setShowLibrary(false);
      setViewingSpaceId(null);
      setActiveSpaceId(spaceId || null);
    }
  };

  const handleDeleteChat = async (chatId: number) => {
    await api.deleteChat(chatId);
    if (activeChat?.id === chatId) setActiveChat(null);
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    const updatedSpaces = await api.getSpaces();
    setSpaces(updatedSpaces.filter((s) => !deletingSpaceIds.current.has(s.id)));
  };

  const handleCreateSpace = async (name: string) => {
    const tempId = -Date.now();
    const optimisticSpace: Space = {
      id: tempId,
      name,
      chat_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSpaces((prev) => [optimisticSpace, ...prev]);
    try {
      const newSpace = await api.createSpace(name);
      setSpaces((prev) => prev.map((s) => (s.id === tempId ? newSpace : s)));
      return newSpace;
    } catch (error) {
      setSpaces((prev) => prev.filter((s) => s.id !== tempId));
      console.error('Failed to create space:', error);
      throw error;
    }
  };

  const handleDeleteSpace = async (spaceId: number) => {
    deletingSpaceIds.current.add(spaceId);
    const deletedSpace = spaces.find((s) => s.id === spaceId);
    setSpaces((prev) => prev.filter((s) => s.id !== spaceId));
    setChats((prev) => prev.map((c) => (c.space_id === spaceId ? { ...c, space_id: null } : c)));
    if (activeSpaceId === spaceId) setActiveSpaceId(null);
    if (viewingSpaceId === spaceId) {
      setViewingSpaceId(null);
      setShowLibrary(true);
    }
    api
      .deleteSpace(spaceId)
      .then(() => {
        deletingSpaceIds.current.delete(spaceId);
      })
      .catch((error) => {
        console.error('Failed to delete space:', error);
        deletingSpaceIds.current.delete(spaceId);
        if (deletedSpace) setSpaces((prev) => [deletedSpace, ...prev]);
      });
  };

  const handleRenameSpace = async (spaceId: number, newName: string) => {
    const oldName = spaces.find((s) => s.id === spaceId)?.name;
    setSpaces((prev) => prev.map((s) => (s.id === spaceId ? { ...s, name: newName } : s)));
    api.updateSpace(spaceId, newName).catch((error) => {
      console.error('Failed to rename space:', error);
      if (oldName) setSpaces((prev) => prev.map((s) => (s.id === spaceId ? { ...s, name: oldName } : s)));
    });
  };

  const handleMoveChat = async (chatId: number, spaceId: number | null) => {
    await api.moveChatToSpace(chatId, spaceId);
    await loadData();
  };

  const handleSendMessage = async (input: string, useWebSearch: boolean = false) => {
    if (!activeChat) return;
    const tempId = Date.now();
    const userMessage: Message = {
      id: tempId,
      input,
      output: '',
      chat_id: activeChat.id,
      user_id: 0,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsSendingMessage(true);
    try {
      const response = await api.createMessage(input, activeChat.id, useWebSearch);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? response : m)));
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleLogout = () => {
    logout();
    setChats([]);
    setSpaces([]);
    setActiveChat(null);
    setActiveSpaceId(null);
    setMessages([]);
    setShowLibrary(false);
    setViewingSpaceId(null);
  };

  // Auth loading state
  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--lumina-bg)' }}
      >
        <div className="relative">
          <div
            className="animate-spin"
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: '2px solid rgba(0,122,255,0.18)',
              borderTopColor: 'var(--lumina-accent)',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Aperture size={20} />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onLogin={login} onRegister={register} />;
  }

  // Determine which view to show in the main pane
  const hasNoSources = chats.length === 0;
  const viewingSpace = viewingSpaceId != null ? spaces.find((s) => s.id === viewingSpaceId) ?? null : null;
  let mainContent: React.ReactNode;
  if (activeChat) {
    const activeSpaceName =
      activeChat.space_id != null
        ? spaces.find((s) => s.id === activeChat.space_id)?.name ?? null
        : null;
    mainContent = (
      <ChatView
        chat={activeChat}
        messages={messages}
        onSendMessage={handleSendMessage}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isSidebarCollapsed={isSidebarCollapsed}
        isSending={isSendingMessage}
        spaceName={activeSpaceName}
        spaceId={activeChat.space_id ?? null}
        initialTab={pendingDeepLink?.tab}
        initialFlashcardSetName={
          pendingDeepLink?.tab === 'flashcards' ? pendingDeepLink.setName : undefined
        }
        initialQuizId={
          pendingDeepLink?.tab === 'quiz' ? pendingDeepLink.quizId : undefined
        }
      />
    );
  } else if (viewingSpace) {
    mainContent = (
      <SpaceDetailView
        space={viewingSpace}
        chats={chats}
        spaces={spaces}
        onBack={() => {
          setViewingSpaceId(null);
          setShowLibrary(true);
        }}
        onSelectChat={(c, target) => {
          // `target` carries the deep-link tab + identifier when the user
          // clicked a flashcard set or quiz row. Plain source-tile clicks
          // pass undefined so the chat opens on Notes.
          setPendingDeepLink(target ?? null);
          setActiveChat(c);
          setActiveSpaceId(c.space_id ?? null);
          setViewingSpaceId(null);
          setShowLibrary(false);
        }}
        onNewChat={() => openNewChatModal()}
      />
    );
  } else if (hasNoSources && !showLibrary) {
    mainContent = <EmptyState onNewChat={(kind) => openNewChatModal(kind)} />;
  } else {
    mainContent = (
      <LibraryView
        chats={chats}
        spaces={spaces}
        username={username || undefined}
        onNewChat={() => openNewChatModal()}
        onSelectChat={(c) => {
          setActiveChat(c);
          setActiveSpaceId(c.space_id ?? null);
          setShowLibrary(false);
        }}
        onSelectSpace={(id) => {
          // Clicking a space tile from the library opens the dedicated
          // space-detail page.
          setActiveSpaceId(id);
          setViewingSpaceId(id);
          setShowLibrary(false);
        }}
        onCreateSpace={handleCreateSpace}
      />
    );
  }

  return (
    <div
      className="flex h-screen overflow-hidden lumina-app-shell"
      style={{ background: 'var(--lumina-bg)' }}
    >
      <ChatSidebar
        chats={chats}
        spaces={spaces}
        activeChat={activeChat}
        activeSpaceId={activeSpaceId}
        onSelectChat={(c) => {
          setActiveChat(c);
          setActiveSpaceId(c.space_id ?? null);
          setViewingSpaceId(null);
          setShowLibrary(false);
        }}
        onSelectSpace={(id) => {
          // Clicking a space in the sidebar opens its detail page (matches
          // the dashboard's space-tile behavior).
          setActiveSpaceId(id);
          setViewingSpaceId(id);
          setActiveChat(null);
          setShowLibrary(false);
        }}
        onNewChat={() => openNewChatModal()}
        onDeleteChat={handleDeleteChat}
        onCreateSpace={handleCreateSpace}
        onDeleteSpace={handleDeleteSpace}
        onRenameSpace={handleRenameSpace}
        onMoveChat={handleMoveChat}
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        username={username || undefined}
        onShowLibrary={() => {
          setActiveChat(null);
          setActiveSpaceId(null);
          setViewingSpaceId(null);
          setShowLibrary(true);
        }}
        isLibraryActive={!activeChat && !viewingSpaceId && (showLibrary || hasNoSources)}
      />

      {mainContent}

      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => {
          setIsNewChatModalOpen(false);
          setInitialModalKind(null);
        }}
        onSubmitYoutube={handleCreateChat}
        onSubmitPdf={handleUploadPdf}
        onSubmitAudio={handleUploadAudio}
        onSubmitWebsite={handleCreateWebsiteChat}
        spaces={spaces}
        activeSpaceId={activeSpaceId}
        initialKind={initialModalKind}
      />
    </div>
  );
}
