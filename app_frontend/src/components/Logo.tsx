'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ size = 'md' }: LogoProps) {
  const sizes = {
    sm: { container: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-lg', sub: 'text-[9px]' },
    md: { container: 'w-10 h-10', icon: 'w-5 h-5', text: 'text-xl', sub: 'text-[10px]' },
    lg: { container: 'w-14 h-14', icon: 'w-7 h-7', text: 'text-2xl', sub: 'text-xs' },
  };

  const { container, icon, text, sub } = sizes[size];

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        {/* Outer glow */}
        <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />

        {/* Icon container */}
        <div
          className={cn(
            'relative rounded-2xl flex items-center justify-center',
            'bg-gradient-to-br from-primary/80 to-primary shadow-lg shadow-primary/30',
            container
          )}
        >
          <Sparkles className={cn('text-primary-foreground', icon)} />
        </div>
      </div>

      <div className="flex flex-col">
        <span className={cn('font-bold tracking-tight', text)}>
          <span className="text-foreground">Lum</span>
          <span className="text-primary">ina</span>
        </span>
        <span className={cn('tracking-[0.15em] uppercase text-muted-foreground font-medium -mt-0.5', sub)}>
          Video Intelligence
        </span>
      </div>
    </div>
  );
}
