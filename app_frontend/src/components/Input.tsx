'use client';

import React from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  icon,
  className,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-void-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-void-400">
            {icon}
          </div>
        )}
        <input
          className={clsx(
            'w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-void-100 placeholder:text-void-500 transition-all duration-200',
            'focus:outline-none focus:border-ember-500/50 focus:bg-white/[0.05] input-glow',
            'hover:border-white/[0.15] hover:bg-white/[0.04]',
            icon && 'pl-12',
            error && 'border-red-500/50 focus:border-red-500',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
