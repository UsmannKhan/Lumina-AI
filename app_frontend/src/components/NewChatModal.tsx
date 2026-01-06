'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Youtube, Sparkles, FileText, Brain, MessageCircle, Lightbulb } from 'lucide-react';
import Button from './Button';
import Input from './Input';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (youtubeLink: string) => Promise<void>;
}

export default function NewChatModal({ isOpen, onClose, onSubmit }: NewChatModalProps) {
  const [youtubeLink, setYoutubeLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!youtubeLink.includes('youtube.com') && !youtubeLink.includes('youtu.be')) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(youtubeLink);
      setYoutubeLink('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze video');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 animate-fade-in-up">
        <div className="glass-card rounded-3xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/15 border border-primary/30">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  New Analysis
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Paste a YouTube link to get started
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="px-6 pb-6">
            <Input
              placeholder="https://youtube.com/watch?v=..."
              value={youtubeLink}
              onChange={(e) => setYoutubeLink(e.target.value)}
              error={error}
              icon={<Youtube className="w-5 h-5" />}
              autoFocus
            />

            {/* Features preview */}
            <div className="mt-6 p-4 rounded-2xl glass">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                What you'll get
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: FileText, label: 'Full Transcript' },
                  { icon: Brain, label: 'AI Analysis' },
                  { icon: MessageCircle, label: 'Q&A Chat' },
                  { icon: Lightbulb, label: 'Key Insights' },
                ].map((feature) => (
                  <div key={feature.label} className="flex items-center gap-2 text-sm text-foreground">
                    <feature.icon className="w-4 h-4 text-primary" />
                    <span>{feature.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Analyzing...' : 'Analyze Video'}
              </Button>
            </div>
          </form>

          {/* Loading state overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary animate-pulse-soft" />
                </div>
              </div>
              <p className="mt-4 text-foreground font-medium">Extracting transcript...</p>
              <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
