'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, Youtube, Brain, MessageCircle } from 'lucide-react';

interface EmptyStateProps {
  onNewChat: () => void;
}

export default function EmptyState({ onNewChat }: EmptyStateProps) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center p-4 2xl:p-8 overflow-y-auto relative"
      style={{
        backgroundImage: 'url(/images/app-background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="max-w-lg 2xl:max-w-xl w-full text-center z-20">
        {/* Hero icon */}
        <div className="relative w-16 2xl:w-24 h-16 2xl:h-24 mx-auto mb-4 2xl:mb-8">
          <div
            className="w-full h-full rounded-3xl flex items-center justify-center"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.03)',
            }}
          >
            <Sparkles className="w-6 2xl:w-10 h-6 2xl:h-10 text-[#0C115B]" />
          </div>

          {/* Floating badges */}
          <div
            className="absolute -top-1 -right-1 2xl:-top-2 2xl:-right-2 w-8 h-8 2xl:w-10 2xl:h-10 rounded-lg 2xl:rounded-xl flex items-center justify-center"
            style={{
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            }}
          >
            <Youtube className="w-4 h-4 2xl:w-5 2xl:h-5 text-red-500" />
          </div>
          <div
            className="absolute -bottom-2 -left-2 w-8 h-8 2xl:w-10 2xl:h-10 rounded-lg 2xl:rounded-xl flex items-center justify-center"
            style={{
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            }}
          >
            <Brain className="w-4 h-4 2xl:w-5 2xl:h-5 text-purple-500" />
          </div>
        </div>

        <h1 className="text-2xl 2xl:text-4xl font-bold mb-2 2xl:mb-4 text-gray-800">
          Welcome to <span className="text-[#0C115B]">Lumina</span>
        </h1>

        <p className="text-sm 2xl:text-lg text-gray-500 mb-6 2xl:mb-10 max-w-sm 2xl:max-w-md mx-auto leading-relaxed">
          Transform any YouTube video into an interactive learning experience with AI-powered insights, notes, flashcards, and quizzes.
        </p>

        <button
          onClick={onNewChat}
          className="inline-flex items-center gap-2 px-5 2xl:px-8 py-2.5 2xl:py-4 rounded-xl 2xl:rounded-2xl font-semibold text-sm 2xl:text-base text-white transition-all hover:-translate-y-1 hover:shadow-2xl"
          style={{
            background: '#0C115B',
            boxShadow: '0 8px 24px rgba(12, 17, 91, 0.35)',
          }}
        >
          <Sparkles className="w-4 h-4 2xl:w-5 2xl:h-5" />
          Analyze Your Video
        </button>

        {/* Features grid */}
        <div className="mt-6 2xl:mt-16 grid grid-cols-3 gap-2 2xl:gap-4">
          {[
            {
              icon: Youtube,
              title: 'Any YouTube Video',
              description: 'Just paste a link',
              iconColor: 'text-red-500',
              bgColor: 'bg-red-50',
            },
            {
              icon: Brain,
              title: 'Detailed Analysis',
              description: 'Comprehensive notes and insights',
              iconColor: 'text-[#0C115B]',
              bgColor: 'bg-indigo-50',
            },
            {
              icon: MessageCircle,
              title: 'Interactive Experience',
              description: 'Chat, flashcards, and quizzes',
              iconColor: 'text-purple-500',
              bgColor: 'bg-purple-50',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="p-3 2xl:p-5 rounded-xl 2xl:rounded-2xl transition-all hover:-translate-y-1"
              style={{
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div className={cn(
                'w-10 h-10 2xl:w-12 2xl:h-12 rounded-lg 2xl:rounded-xl flex items-center justify-center mb-3 2xl:mb-4 mx-auto',
                feature.bgColor
              )}>
                <feature.icon className={cn('w-5 h-5 2xl:w-6 2xl:h-6', feature.iconColor)} />
              </div>
              <h3 className="font-semibold text-gray-800 text-xs 2xl:text-sm mb-0.5 2xl:mb-1">
                {feature.title}
              </h3>
              <p className="text-[10px] 2xl:text-xs text-gray-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
