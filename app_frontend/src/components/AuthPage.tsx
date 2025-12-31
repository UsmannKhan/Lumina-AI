'use client';

import React, { useState } from 'react';
import Logo from './Logo';
import Button from './Button';
import Input from './Input';
import { UserIcon, SparklesIcon } from './Icons';
import clsx from 'clsx';

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
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ember-900/40 via-void-950 to-void-950" />
        
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-20">
          <Logo size="lg" />
          
          <h1 className="mt-12 text-4xl xl:text-5xl font-display font-bold text-white leading-tight">
            Unlock the knowledge<br />
            hidden in every video
          </h1>
          
          <p className="mt-6 text-lg text-void-300 max-w-lg leading-relaxed">
            Transform any YouTube video into comprehensive notes, 
            key insights, and have intelligent conversations about the content.
          </p>

          <div className="mt-12 space-y-4">
            {[
              'AI-powered video analysis',
              'Full transcript extraction',
              'Interactive Q&A chat',
              'Organized session history',
            ].map((feature, i) => (
              <div 
                key={feature} 
                className="flex items-center gap-3 text-void-300"
              >
                <div className="w-2 h-2 rounded-full bg-ember-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="absolute bottom-12 right-12 w-64 h-64 bg-ember-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-azure-500/10 rounded-full blur-2xl" />
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-12 flex justify-center">
            <Logo size="lg" />
          </div>

          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-8">
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
                className={clsx(
                  'flex-1 py-3 rounded-lg text-sm font-medium transition-all',
                  mode === tab.id
                    ? 'bg-ember-500/20 text-ember-300'
                    : 'text-void-400 hover:text-void-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-display font-bold text-white">
              {mode === 'login' ? 'Welcome back' : 'Get started'}
            </h2>
            <p className="text-void-400 mt-2">
              {mode === 'login' 
                ? 'Enter your credentials to continue'
                : 'Create your account to start analyzing videos'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            )}
            
            <Input
              label="Username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              icon={<UserIcon size={18} />}
              required
            />
            
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2"
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-sm text-void-500 bg-void-950">
                Powered by AI
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-r from-ember-500/10 to-transparent border border-ember-500/20">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-ember-500/20">
                <SparklesIcon size={18} className="text-ember-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Gemini Powered
                </p>
                <p className="text-xs text-void-400 mt-1">
                  Advanced AI for comprehensive video analysis
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
