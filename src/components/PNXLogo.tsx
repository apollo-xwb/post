import React from 'react';

interface PNXLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export default function PNXLogo({ className = '', size = 'md', showSubtitle = true }: PNXLogoProps) {
  // Size mapping
  const heightClass = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-12',
    xl: 'h-16'
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* High-Fidelity Vector PNX Emblem */}
      <div className={`${heightClass} aspect-square relative flex items-center justify-center shrink-0`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-sm"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Rounded Shield Background */}
          <rect width="100" height="100" rx="22" fill="#0F172A" />
          
          {/* PostNet Red Accent Angle */}
          <path
            d="M15 20 H85 L65 80 H15 Z"
            fill="#E11D48"
          />

          {/* White Bold PNX Lettering Geometry */}
          <text
            x="50"
            y="62"
            textAnchor="middle"
            fill="#FFFFFF"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="38"
            letterSpacing="-1.5"
          >
            PNX
          </text>

          {/* Top Corner Speed Indicator */}
          <circle cx="82" cy="22" r="6" fill="#38BDF8" />
        </svg>
      </div>

      {/* Brand Text Block */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold tracking-tight text-slate-900 font-display text-base sm:text-lg leading-none">
            POST<span className="text-rose-600">NET</span>
          </span>
          <span className="bg-slate-900 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase">
            PRINT OS
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase font-mono mt-0.5">
            Express & Pre-Press Matrix
          </span>
        )}
      </div>
    </div>
  );
}
