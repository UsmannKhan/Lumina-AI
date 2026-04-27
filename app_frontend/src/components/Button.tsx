'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const base =
    'relative inline-flex items-center justify-center font-semibold transition-all duration-150 ease-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyle: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--lumina-accent)',
      color: '#fff',
      border: 'none',
      boxShadow: 'var(--lumina-shadow-accent)',
    },
    secondary: {
      background: 'var(--lumina-surface-alt)',
      color: 'var(--lumina-text-dim)',
      border: '1px solid var(--lumina-divider)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--lumina-text-dim)',
      border: 'none',
    },
    danger: {
      background: 'var(--lumina-error-soft)',
      color: 'var(--lumina-error-text)',
      border: 'none',
    },
  };

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-4 py-2 text-sm rounded-xl gap-2',
    lg: 'px-6 py-3 text-[15px] rounded-xl gap-2',
  };

  return (
    <button
      className={cn(base, sizes[size], className)}
      disabled={disabled || isLoading}
      style={{ ...variantStyle[variant], ...style }}
      {...props}
    >
      {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}
