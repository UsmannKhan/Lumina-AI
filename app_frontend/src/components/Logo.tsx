'use client';

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
}

export function Aperture({ size = 26, color = '#007AFF' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
      <path d="M12 3 A9 9 0 0 1 19.5 7.5 L12 12 Z" fill={color} opacity="0.9" />
      <path d="M19.5 7.5 A9 9 0 0 1 19.5 16.5 L12 12 Z" fill={color} opacity="0.55" />
      <path d="M19.5 16.5 A9 9 0 0 1 12 21 L12 12 Z" fill={color} opacity="0.3" />
    </svg>
  );
}

export function ApertureMini({ size = 14, color = '#007AFF' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.5" fill={color} />
    </svg>
  );
}

export default function Logo({ size = 'md', showWordmark = true }: LogoProps) {
  const dim = size === 'sm' ? 22 : size === 'lg' ? 32 : 26;
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-[17px]';
  return (
    <div className="flex items-center gap-2.5">
      <Aperture size={dim} color="var(--lumina-accent)" />
      {showWordmark && (
        <span
          className={`font-semibold ${textSize}`}
          style={{ letterSpacing: '-0.4px', color: 'var(--lumina-text)' }}
        >
          Lumina
        </span>
      )}
    </div>
  );
}
