import React from 'react';
import { BRAND_CONFIG } from '../config/brand';

interface BrandLockupProps {
  compact?: boolean;
  className?: string;
}

export const BrandLockup: React.FC<BrandLockupProps> = ({ compact = false, className = '' }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className={`relative flex items-center justify-center shrink-0 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-950 border border-amber-400/40 shadow-sm ${compact ? 'w-9 h-9' : 'w-11 h-11'}`}>
        <svg viewBox="0 0 40 40" className="w-6 h-6" fill="none" aria-hidden="true">
          <path d="M8 29 L16 14 L21 23 L27 11 L32 29" stroke="#F2C14E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="27" cy="11" r="2.5" fill="#F2C14E" />
        </svg>
      </div>

      <div className="flex flex-col text-right">
        <span className={`font-extrabold tracking-tight text-slate-900 dark:text-amber-100 leading-tight ${compact ? 'text-sm' : 'text-base'}`}>
          {BRAND_CONFIG.appTitle}
        </span>
        {!compact && (
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {BRAND_CONFIG.subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
