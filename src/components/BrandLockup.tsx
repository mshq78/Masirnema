import React from 'react';
import { BRAND_CONFIG } from '../config/brand';

interface BrandLockupProps {
  compact?: boolean;
  className?: string;
}

export const BrandLockup: React.FC<BrandLockupProps> = ({ compact = false, className = '' }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <img
        src="/logo.png"
        alt=""
        aria-hidden="true"
        className={`shrink-0 object-contain ${compact ? 'w-9 h-9' : 'w-11 h-11'}`}
      />

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
