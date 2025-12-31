'use client';

import React from 'react';
import clsx from 'clsx';
import { LoaderIcon } from './Icons';

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
  ...props
}: ButtonProps) {
  const baseStyles = 'relative inline-flex items-center justify-center font-medium transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-void-950 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-gradient-to-r from-ember-500 to-ember-600 text-white hover:from-ember-400 hover:to-ember-500 focus:ring-ember-500 btn-glow shadow-lg shadow-ember-500/20',
    secondary: 'glass text-void-100 hover:bg-white/[0.08] focus:ring-white/20',
    ghost: 'text-void-300 hover:text-void-100 hover:bg-white/[0.05] focus:ring-white/10',
    danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 focus:ring-red-500/30',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
    md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-6 py-3 text-base rounded-xl gap-2',
  };

  return (
    <button
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <LoaderIcon size={size === 'sm' ? 14 : 18} />}
      {children}
    </button>
  );
}
