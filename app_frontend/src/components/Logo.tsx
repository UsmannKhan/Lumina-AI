'use client';

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ size = 'md' }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-xl' },
    lg: { icon: 48, text: 'text-3xl' },
  };

  const { icon, text } = sizes[size];

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        {/* Outer glow */}
        <div className="absolute inset-0 bg-ember-500/30 blur-xl rounded-full" />
        
        {/* Icon container */}
        <div 
          className="relative bg-gradient-to-br from-ember-400 via-ember-500 to-ember-600 rounded-xl p-2 shadow-lg shadow-ember-500/30"
          style={{ width: icon + 16, height: icon + 16 }}
        >
          {/* Play triangle with brain-like curve */}
          <svg 
            width={icon} 
            height={icon} 
            viewBox="0 0 32 32" 
            fill="none"
            className="relative z-10"
          >
            <path
              d="M8 6.5C8 5.11929 9.54649 4.28565 10.7 5.05538L25.1 14.6554C26.1667 15.3598 26.1667 16.9402 25.1 17.6446L10.7 27.2446C9.54649 28.0144 8 27.1807 8 25.8V6.5Z"
              fill="white"
              fillOpacity="0.95"
            />
            <path
              d="M11 10C11 10 14 12 14 16C14 20 11 22 11 22"
              stroke="white"
              strokeOpacity="0.4"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      
      <div className="flex flex-col">
        <span className={`font-display font-bold tracking-tight ${text}`}>
          <span className="text-white">Lum</span>
          <span className="gradient-text">ina</span>
        </span>
        <span className="text-[10px] tracking-[0.2em] uppercase text-void-400 font-medium -mt-0.5">
          Video Intelligence
        </span>
      </div>
    </div>
  );
}
