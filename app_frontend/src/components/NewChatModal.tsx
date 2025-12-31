'use client';

import React, { useState } from 'react';
import { XIcon, YoutubeIcon, SparklesIcon } from './Icons';
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
        className="absolute inset-0 bg-void-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 animate-fade-in-up">
        <div className="glass rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 rounded-lg text-void-400 hover:text-void-200 hover:bg-white/[0.05] transition-colors"
            >
              <XIcon size={20} />
            </button>
            
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-ember-500/20 to-ember-600/20 border border-ember-500/20">
                <SparklesIcon size={24} className="text-ember-400" />
              </div>
              <div>
                <h2 className="text-xl font-display font-semibold text-white">
                  New Analysis
                </h2>
                <p className="text-sm text-void-400 mt-0.5">
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
              icon={<YoutubeIcon size={20} />}
              autoFocus
            />

            {/* Features preview */}
            <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <p className="text-xs font-medium text-void-400 uppercase tracking-wider mb-3">
                What you'll get
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: '📝', label: 'Full Transcript' },
                  { icon: '🧠', label: 'AI Analysis' },
                  { icon: '💬', label: 'Q&A Chat' },
                  { icon: '✨', label: 'Key Insights' },
                ].map((feature) => (
                  <div key={feature.label} className="flex items-center gap-2 text-sm text-void-300">
                    <span>{feature.icon}</span>
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
            <div className="absolute inset-0 bg-void-950/90 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-ember-500/20 border-t-ember-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <SparklesIcon size={24} className="text-ember-400 animate-pulse" />
                </div>
              </div>
              <p className="mt-4 text-void-300 font-medium">Extracting transcript...</p>
              <p className="text-sm text-void-500 mt-1">This may take a moment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
