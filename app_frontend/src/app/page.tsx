'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Chat, Message, Space } from '@/types';
import {
  ChatSidebar,
  ChatView,
  EmptyState,
  NewChatModal,
  AuthPage,
} from '@/components';

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading, login, register, logout } = useAuth();

  const [chats, setChats] = useState<Chat[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [activeSpaceId, setActiveSpaceId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);

  // Track spaces being deleted to prevent them from reappearing on reload
  const deletingSpaceIds = useRef<Set<number>>(new Set());

  // Load chats and spaces when authenticated
  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoadingChats(true);
    try {
      const [userChats, userSpaces] = await Promise.all([
        api.getChats(),
        api.getSpaces()
      ]);
      setChats(userChats);
      // Filter out any spaces that are currently being deleted
      setSpaces(userSpaces.filter(s => !deletingSpaceIds.current.has(s.id)));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoadingChats(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load messages when active chat changes
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

    // Reload data to get full data
    await loadData();

    // Find and select the new chat
    const fullChats = await api.getChats();
    const createdChat = fullChats.find(c => c.id === newChat.id);
    if (createdChat) {
      setActiveChat(createdChat);
      setActiveSpaceId(spaceId || null);
    }
  };

  const handleUploadPdf = async (file: File, spaceId?: number) => {
    const newChat = await api.uploadPdf(file, spaceId);

    // Reload data to get full data
    await loadData();

    // Find and select the new chat
    const fullChats = await api.getChats();
    const createdChat = fullChats.find(c => c.id === newChat.id);
    if (createdChat) {
      setActiveChat(createdChat);
      setActiveSpaceId(spaceId || null);
    }
  };

  const handleDeleteChat = async (chatId: number) => {
    await api.deleteChat(chatId);

    if (activeChat?.id === chatId) {
      setActiveChat(null);
    }

    setChats(prev => prev.filter(c => c.id !== chatId));
    // Reload spaces to update chat counts, but filter out any being deleted
    const updatedSpaces = await api.getSpaces();
    setSpaces(updatedSpaces.filter(s => !deletingSpaceIds.current.has(s.id)));
  };

  const handleCreateSpace = async (name: string) => {
    // Optimistic: add space immediately with a temporary negative ID
    const tempId = -Date.now();
    const optimisticSpace: Space = {
      id: tempId,
      name,
      chat_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSpaces(prev => [optimisticSpace, ...prev]);

    // Call API in background and replace temp with real space
    try {
      const newSpace = await api.createSpace(name);
      setSpaces(prev => prev.map(s => s.id === tempId ? newSpace : s));
      return newSpace;
    } catch (error) {
      // Remove optimistic space on error
      setSpaces(prev => prev.filter(s => s.id !== tempId));
      console.error('Failed to create space:', error);
      throw error;
    }
  };

  const handleDeleteSpace = async (spaceId: number) => {
    // Track this space as being deleted to prevent it from reappearing on reload
    deletingSpaceIds.current.add(spaceId);

    // Optimistic: remove space immediately
    const deletedSpace = spaces.find(s => s.id === spaceId);
    setSpaces(prev => prev.filter(s => s.id !== spaceId));

    // Optimistic: unassign chats from this space
    setChats(prev => prev.map(c => c.space_id === spaceId ? { ...c, space_id: null } : c));

    if (activeSpaceId === spaceId) {
      setActiveSpaceId(null);
    }

    // Call API in background
    api.deleteSpace(spaceId).then(() => {
      // Successfully deleted, remove from tracking
      deletingSpaceIds.current.delete(spaceId);
    }).catch(error => {
      console.error('Failed to delete space:', error);
      // Remove from tracking and restore space on error
      deletingSpaceIds.current.delete(spaceId);
      if (deletedSpace) {
        setSpaces(prev => [deletedSpace, ...prev]);
      }
    });
  };

  const handleRenameSpace = async (spaceId: number, newName: string) => {
    // Optimistic: update name immediately
    const oldName = spaces.find(s => s.id === spaceId)?.name;
    setSpaces(prev => prev.map(s => s.id === spaceId ? { ...s, name: newName } : s));

    // Call API in background
    api.updateSpace(spaceId, newName).catch(error => {
      console.error('Failed to rename space:', error);
      // Restore old name on error
      if (oldName) {
        setSpaces(prev => prev.map(s => s.id === spaceId ? { ...s, name: oldName } : s));
      }
    });
  };

  const handleMoveChat = async (chatId: number, spaceId: number | null) => {
    await api.moveChatToSpace(chatId, spaceId);
    await loadData();
  };

  const handleSendMessage = async (input: string, useWebSearch: boolean = false) => {
    if (!activeChat) return;

    // Add user message optimistically so it shows immediately
    const tempId = Date.now();
    const userMessage: Message = { id: tempId, input, output: '', chat_id: activeChat.id, user_id: 0 };
    setMessages(prev => [...prev, userMessage]);

    setIsSendingMessage(true);
    try {
      const response = await api.createMessage(input, activeChat.id, useWebSearch);
      // Replace temp message with actual response (same input, now with output)
      setMessages(prev => prev.map(m => m.id === tempId ? response : m));
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
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
  };

  // Auth loading state
  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: 'url(/images/app-background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-[#0C115B]/20 border-t-[#0C115B] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-[#0C115B]/10" />
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - show auth page
  if (!isAuthenticated) {
    return <AuthPage onLogin={login} onRegister={register} />;
  }

  // Main dashboard
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Sidebar */}
      <ChatSidebar
        chats={chats}
        spaces={spaces}
        activeChat={activeChat}
        activeSpaceId={activeSpaceId}
        onSelectChat={setActiveChat}
        onSelectSpace={setActiveSpaceId}
        onNewChat={() => setIsNewChatModalOpen(true)}
        onDeleteChat={handleDeleteChat}
        onCreateSpace={handleCreateSpace}
        onDeleteSpace={handleDeleteSpace}
        onRenameSpace={handleRenameSpace}
        onMoveChat={handleMoveChat}
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {activeChat ? (
          <ChatView
            chat={activeChat}
            messages={messages}
            onSendMessage={handleSendMessage}
            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isSidebarCollapsed={isSidebarCollapsed}
            isSending={isSendingMessage}
          />
        ) : (
          <EmptyState onNewChat={() => setIsNewChatModalOpen(true)} />
        )}
      </main>

      {/* New chat modal */}
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onSubmitYoutube={handleCreateChat}
        onSubmitPdf={handleUploadPdf}
        spaces={spaces}
        activeSpaceId={activeSpaceId}
      />
    </div>
  );
}
