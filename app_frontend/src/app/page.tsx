'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Chat, Message } from '@/types';
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
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);

  // Load chats when authenticated
  const loadChats = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoadingChats(true);
    try {
      const userChats = await api.getChats();
      setChats(userChats);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setIsLoadingChats(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

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

  const handleCreateChat = async (youtubeLink: string) => {
    const newChat = await api.createChat(youtubeLink);

    // Reload chats to get full data
    await loadChats();

    // Find and select the new chat
    const fullChat = await api.getChats();
    const createdChat = fullChat.find(c => c.id === newChat.id);
    if (createdChat) {
      setActiveChat(createdChat);
    }
  };

  const handleDeleteChat = async (chatId: number) => {
    await api.deleteChat(chatId);

    if (activeChat?.id === chatId) {
      setActiveChat(null);
    }

    setChats(prev => prev.filter(c => c.id !== chatId));
  };

  const handleSendMessage = async (input: string) => {
    if (!activeChat) return;

    setIsSendingMessage(true);
    try {
      const response = await api.createMessage(input, activeChat.id);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleLogout = () => {
    logout();
    setChats([]);
    setActiveChat(null);
    setMessages([]);
  };

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-ember-500/20 border-t-ember-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-ember-500/20" />
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
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar
        chats={chats}
        activeChat={activeChat}
        onSelectChat={setActiveChat}
        onNewChat={() => setIsNewChatModalOpen(true)}
        onDeleteChat={handleDeleteChat}
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
        onSubmit={handleCreateChat}
      />
    </div>
  );
}
