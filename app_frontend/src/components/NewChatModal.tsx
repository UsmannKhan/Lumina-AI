'use client';

import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X, Youtube, Sparkles, FileText, Brain, MessageCircle, Lightbulb, Folder, Upload, File } from 'lucide-react';
import Button from './Button';
import Input from './Input';
import { Space } from '@/types';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitYoutube: (youtubeLink: string, spaceId?: number) => Promise<void>;
  onSubmitPdf: (file: File, spaceId?: number) => Promise<void>;
  spaces: Space[];
  activeSpaceId: number | null;
}

type TabType = 'youtube' | 'pdf';

export default function NewChatModal({ isOpen, onClose, onSubmitYoutube, onSubmitPdf, spaces, activeSpaceId }: NewChatModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('youtube');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | undefined>(activeSpaceId ?? undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleYoutubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!youtubeLink.includes('youtube.com') && !youtubeLink.includes('youtu.be')) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmitYoutube(youtubeLink, selectedSpaceId);
      setYoutubeLink('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze video');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedFile) {
      setError('Please select a PDF file');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmitPdf(selectedFile, selectedSpaceId);
      setSelectedFile(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF files are allowed');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File too large. Maximum size is 10MB');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF files are allowed');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File too large. Maximum size is 10MB');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const loadingMessage = activeTab === 'youtube' 
    ? 'Extracting transcript...' 
    : 'Extracting text from PDF...';

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
                  Add content to analyze
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => { setActiveTab('youtube'); setError(''); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all",
                  activeTab === 'youtube'
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-white/30 text-muted-foreground hover:bg-white/50 border border-transparent"
                )}
              >
                <Youtube className="w-4 h-4" />
                YouTube
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('pdf'); setError(''); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all",
                  activeTab === 'pdf'
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-white/30 text-muted-foreground hover:bg-white/50 border border-transparent"
                )}
              >
                <FileText className="w-4 h-4" />
                PDF
              </button>
            </div>
          </div>

          {/* Body - YouTube Tab */}
          {activeTab === 'youtube' && (
            <form onSubmit={handleYoutubeSubmit} className="px-6 pb-6">
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={youtubeLink}
                onChange={(e) => setYoutubeLink(e.target.value)}
                error={error}
                icon={<Youtube className="w-5 h-5" />}
                autoFocus
              />

              {/* Space selector */}
              {spaces.length > 0 && (
                <div className="mt-4">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Add to Space (optional)
                  </label>
                  <div className="relative">
                    <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={selectedSpaceId ?? ''}
                      onChange={(e) => setSelectedSpaceId(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/50 text-sm focus:outline-none focus:border-[#0C115B]/30 appearance-none cursor-pointer"
                    >
                      <option value="">No space</option>
                      {spaces.map((space) => (
                        <option key={space.id} value={space.id}>
                          {space.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

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
          )}

          {/* Body - PDF Tab */}
          {activeTab === 'pdf' && (
            <form onSubmit={handlePdfSubmit} className="px-6 pb-6">
              {/* File Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : selectedFile
                    ? "border-green-400 bg-green-50"
                    : "border-gray-300 hover:border-primary/50 hover:bg-white/30"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <File className="w-12 h-12 text-green-500 mb-3" />
                    <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="mt-2 text-xs text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-sm font-medium text-foreground">
                      Drop your PDF here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Max file size: 10MB
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <p className="mt-2 text-sm text-red-500">{error}</p>
              )}

              {/* Space selector */}
              {spaces.length > 0 && (
                <div className="mt-4">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Add to Space (optional)
                  </label>
                  <div className="relative">
                    <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={selectedSpaceId ?? ''}
                      onChange={(e) => setSelectedSpaceId(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/50 text-sm focus:outline-none focus:border-[#0C115B]/30 appearance-none cursor-pointer"
                    >
                      <option value="">No space</option>
                      {spaces.map((space) => (
                        <option key={space.id} value={space.id}>
                          {space.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Features preview */}
              <div className="mt-6 p-4 rounded-2xl glass">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  What you'll get
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: FileText, label: 'Full Text Extract' },
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
                  disabled={!selectedFile}
                  className="flex-1"
                >
                  {isLoading ? 'Analyzing...' : 'Analyze PDF'}
                </Button>
              </div>
            </form>
          )}

          {/* Loading state overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary animate-pulse-soft" />
                </div>
              </div>
              <p className="mt-4 text-foreground font-medium">{loadingMessage}</p>
              <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
