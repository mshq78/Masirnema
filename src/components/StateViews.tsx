import React from 'react';
import { WifiOff, AlertCircle } from 'lucide-react';
import { UI_STRINGS } from '../content/ui.fa';
import { Button } from './Button';

export const OfflineBanner: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full py-2 px-4 bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-center gap-2 select-none ${className}`}
    >
      <WifiOff className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span>{UI_STRINGS.common.offline}</span>
    </div>
  );
};

export const LoadingSkeleton: React.FC<{ lines?: number }> = ({ lines = 4 }) => {
  return (
    <div className="w-full space-y-3 p-4 animate-pulse select-none">
      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-xl w-3/4 mb-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-14 bg-slate-200/70 dark:bg-slate-800/70 rounded-2xl w-full" />
      ))}
    </div>
  );
};

export const ErrorStateView: React.FC<{
  title?: string;
  description?: string;
  onRetry?: () => void;
}> = ({ title = UI_STRINGS.error.title, description = UI_STRINGS.error.description, onRetry }) => {
  return (
    <div className="min-h-[300px] flex flex-col items-center justify-center p-6 text-center select-none space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-800 dark:text-amber-300">
        <AlertCircle className="w-7 h-7" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">{description}</p>
      </div>
      {onRetry && (
        <Button variant="primary" size="md" onClick={onRetry}>
          {UI_STRINGS.common.retry}
        </Button>
      )}
    </div>
  );
};
