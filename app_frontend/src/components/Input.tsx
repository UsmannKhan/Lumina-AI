'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export default function Input({ label, error, icon, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label
          className="block mb-1.5 font-medium"
          style={{ fontSize: 12, color: 'var(--lumina-text-dim)' }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--lumina-text-faint)' }}
          >
            {icon}
          </div>
        )}
        <input
          className={cn('w-full outline-none transition-all', icon && 'pl-10', className)}
          style={{
            fontSize: 13.5,
            padding: '10px 12px',
            paddingLeft: icon ? 38 : 12,
            borderRadius: 10,
            border: `1px solid ${error ? 'var(--lumina-error)' : 'var(--lumina-divider)'}`,
            background: 'var(--lumina-surface)',
            color: 'var(--lumina-text)',
            fontFamily: 'var(--font-sans)',
          }}
          onFocus={(e) => {
            if (!error) {
              e.target.style.borderColor = 'var(--lumina-accent)';
              e.target.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.12)';
            }
          }}
          onBlur={(e) => {
            if (!error) {
              e.target.style.borderColor = 'var(--lumina-divider)';
              e.target.style.boxShadow = 'none';
            }
          }}
          {...props}
        />
      </div>
      {error && (
        <p style={{ marginTop: 6, fontSize: 12, color: 'var(--lumina-error-text)' }}>{error}</p>
      )}
    </div>
  );
}
