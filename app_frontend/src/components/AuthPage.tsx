'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { User, Lock, Mail, Sparkles } from 'lucide-react';

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
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: 'url(/images/gradient-background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Grain overlay for texture */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          opacity: 0.08,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Glass Card */}
      <div
        className="relative w-full max-w-xs 2xl:max-w-md mx-auto z-10 p-6 2xl:p-10"
        style={{
          background: 'rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          boxShadow: `
            0 32px 80px rgba(0, 0, 0, 0.08),
            0 16px 40px rgba(0, 0, 0, 0.04),
            inset 0 2px 0 rgba(255, 255, 255, 0.6),
            inset 0 -1px 0 rgba(255, 255, 255, 0.3)
          `,
        }}
      >
        {/* Header */}
        <div className="text-center mb-5 2xl:mb-8">
          <h1 className="text-xl 2xl:text-3xl font-bold text-gray-800 mb-1 2xl:mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600 text-xs 2xl:text-sm">
            Sign in to your account to continue
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          className="flex gap-1 p-1 rounded-xl 2xl:rounded-2xl mb-5 2xl:mb-8"
          style={{
            background: 'rgba(255, 255, 255, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
          }}
        >
          {[
            { id: 'login', label: 'Sign In' },
            { id: 'register', label: 'Create Account' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setMode(tab.id as typeof mode);
                setError('');
              }}
              className={cn(
                'flex-1 py-2 2xl:py-2.5 rounded-lg 2xl:rounded-xl text-xs 2xl:text-sm font-semibold transition-all duration-300',
                mode === tab.id
                  ? 'bg-[#0C115B] text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/30'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 2xl:space-y-5">
          {mode === 'register' && (
            <div className="space-y-1 2xl:space-y-2">
              <label className="text-xs 2xl:text-sm font-medium text-gray-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 2xl:left-4 top-1/2 -translate-y-1/2 w-4 h-4 2xl:w-5 2xl:h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full pl-10 2xl:pl-12 pr-3 2xl:pr-4 py-2.5 2xl:py-3.5 rounded-lg 2xl:rounded-xl text-sm 2xl:text-base text-gray-800 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                  style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(10px)',
                  }}
                />
              </div>
            </div>
          )}

          <div className="space-y-1 2xl:space-y-2">
            <label className="text-xs 2xl:text-sm font-medium text-gray-700">Username</label>
            <div className="relative">
              <User className="absolute left-3 2xl:left-4 top-1/2 -translate-y-1/2 w-4 h-4 2xl:w-5 2xl:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full pl-10 2xl:pl-12 pr-3 2xl:pr-4 py-2.5 2xl:py-3.5 rounded-lg 2xl:rounded-xl text-sm 2xl:text-base text-gray-800 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                style={{
                  background: 'rgba(255, 255, 255, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(10px)',
                }}
              />
            </div>
          </div>

          <div className="space-y-1 2xl:space-y-2">
            <label className="text-xs 2xl:text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 2xl:left-4 top-1/2 -translate-y-1/2 w-4 h-4 2xl:w-5 2xl:h-5 text-gray-400" />
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full pl-10 2xl:pl-12 pr-3 2xl:pr-4 py-2.5 2xl:py-3.5 rounded-lg 2xl:rounded-xl text-sm 2xl:text-base text-gray-800 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                style={{
                  background: 'rgba(255, 255, 255, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(10px)',
                }}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 2xl:p-4 rounded-lg 2xl:rounded-xl bg-red-50 border border-red-200">
              <p className="text-xs 2xl:text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full py-3 2xl:py-4 rounded-lg 2xl:rounded-xl font-semibold text-sm 2xl:text-base text-white transition-all duration-300",
              "bg-[#0C115B] hover:bg-[#1a1f6e] hover:-translate-y-0.5 hover:shadow-xl",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            )}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : (
              mode === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>


      </div>
    </div>
  );
}