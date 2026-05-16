'use client';

import React, { useState } from 'react';
import { Aperture } from './Logo';

interface AuthPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (email: string, username: string, password: string) => Promise<void>;
}

export default function AuthPage({ onLogin, onRegister }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (mode === 'login') {
        await onLogin(username, password);
      } else {
        await onRegister(email, username, password);
        await onLogin(username, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--lumina-bg)' }}>
      {/* Left: brand panel — hidden under md */}
      <aside
        className="hidden md:flex flex-col justify-between p-10 lg:p-14 relative overflow-hidden"
        style={{
          width: '46%',
          maxWidth: 620,
          background:
            'linear-gradient(170deg, var(--lumina-accent-soft) 0%, var(--lumina-bg) 60%)',
          borderRight: '1px solid var(--lumina-divider)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <Aperture size={28} />
          <span className="font-semibold text-[17px]" style={{ letterSpacing: '-0.4px' }}>
            Lumina
          </span>
        </div>

        <div style={{ maxWidth: 420 }}>
          <h1
            className="font-semibold mb-4"
            style={{
              fontSize: 'clamp(28px, 3vw, 38px)',
              letterSpacing: '-1.4px',
              lineHeight: 1.1,
              color: 'var(--lumina-text)',
            }}
          >
            Turn anything you see into something you remember.
          </h1>
          <p
            style={{
              fontSize: 15.5,
              color: 'var(--lumina-text-dim)',
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            Drop in video links, documents, articles, audio or website links. Lumina turns them into notes,
            flashcards, quizzes, coding problems and more.
          </p>
        </div>

        <div
          className="flex gap-4 lumina-mono"
          style={{ fontSize: 12, color: 'var(--lumina-text-faint)' }}
        >
          <span>Built for learners</span>
          <span>·</span>
          <span>Designed for focus</span>
        </div>
      </aside>

      {/* Right: form */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10" style={{ background: 'var(--lumina-surface)' }}>
        <div className="w-full" style={{ maxWidth: 380 }}>
          {/* Mobile-only logo */}
          <div className="flex md:hidden items-center justify-center gap-2.5 mb-8">
            <Aperture size={28} />
            <span className="font-semibold text-[17px]" style={{ letterSpacing: '-0.4px' }}>
              Lumina
            </span>
          </div>

          <h2
            className="font-semibold"
            style={{
              fontSize: 26,
              letterSpacing: '-0.7px',
              margin: '0 0 8px',
              color: 'var(--lumina-text)',
            }}
          >
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p
            style={{
              fontSize: 13.5,
              color: 'var(--lumina-text-dim)',
              margin: '0 0 24px',
            }}
          >
            {mode === 'login'
              ? 'Sign in to continue your learning.'
              : 'Start turning sources into knowledge in seconds.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label
                  className="block mb-1.5 font-medium"
                  style={{ fontSize: 12, color: 'var(--lumina-text-dim)' }}
                >
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-3 py-2.5 outline-none"
                  style={{
                    fontSize: 13.5,
                    borderRadius: 10,
                    border: '1px solid var(--lumina-divider)',
                    background: 'var(--lumina-surface)',
                    color: 'var(--lumina-text)',
                    fontFamily: 'var(--font-sans)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--lumina-accent)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--lumina-divider)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            )}

            <div>
              <label
                className="block mb-1.5 font-medium"
                style={{ fontSize: 12, color: 'var(--lumina-text-dim)' }}
              >
                Username
              </label>
              <input
                type="text"
                placeholder="jordan"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full px-3 py-2.5 outline-none"
                style={{
                  fontSize: 13.5,
                  borderRadius: 10,
                  border: '1px solid var(--lumina-divider)',
                  background: 'var(--lumina-surface)',
                  color: 'var(--lumina-text)',
                  fontFamily: 'var(--font-sans)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--lumina-accent)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--lumina-divider)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className="font-medium"
                  style={{ fontSize: 12, color: 'var(--lumina-text-dim)' }}
                >
                  Password
                </label>
              </div>
              <input
                type="password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full px-3 py-2.5 outline-none"
                style={{
                  fontSize: 13.5,
                  borderRadius: 10,
                  border: '1px solid var(--lumina-divider)',
                  background: 'var(--lumina-surface)',
                  color: 'var(--lumina-text)',
                  fontFamily: 'var(--font-sans)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--lumina-accent)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--lumina-divider)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {error && (
              <div
                className="px-3 py-2.5 text-sm"
                style={{
                  borderRadius: 10,
                  background: 'var(--lumina-error-soft)',
                  color: 'var(--lumina-error-text)',
                  border: '1px solid rgba(180, 35, 24, 0.15)',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-2 font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                fontSize: 14,
                background: 'var(--lumina-accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 11,
                boxShadow: 'var(--lumina-shadow-accent)',
              }}
            >
              {isLoading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : mode === 'login' ? (
                'Sign in'
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div
            className="text-center mt-6"
            style={{ fontSize: 12.5, color: 'var(--lumina-text-dim)' }}
          >
            {mode === 'login' ? 'New to Lumina? ' : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="font-medium hover:underline"
              style={{ color: 'var(--lumina-accent)', background: 'none', border: 'none', padding: 0 }}
            >
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
