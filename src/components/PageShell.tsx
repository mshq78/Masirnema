import React from 'react';
import { Cloud, CloudCheck, LogOut } from 'lucide-react';
import { BrandLockup } from './BrandLockup';
import { ThemeToggle } from './ThemeToggle';
import { ProgressRule } from './ProgressRule';
import { OfflineBanner } from './StateViews';
import { useSurvey } from '../context/SurveyContext';
import { UI_STRINGS } from '../content/ui.fa';

interface PageShellProps {
  children: React.ReactNode;
  showProgress?: boolean;
  currentStepIndex?: number;
  totalSteps?: number;
  compactHeader?: boolean;
  className?: string;
}

export const PageShell: React.FC<PageShellProps> = ({
  children,
  showProgress = false,
  currentStepIndex = 0,
  totalSteps = 12,
  compactHeader = false,
  className = '',
}) => {
  const { syncStatus, isOffline, isAuthenticated, logout } = useSurvey();

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-amber-400/40 text-slate-800 dark:text-slate-100">
      {isOffline && <OfflineBanner />}

      <header className="no-print w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-40 px-4 py-2.5 transition-colors">
        <div className="max-w-[720px] mx-auto flex items-center justify-between gap-3">
          <BrandLockup compact={compactHeader} />

          <div className="flex items-center gap-2.5">
            <div
              aria-live="polite"
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all select-none ${
                syncStatus === 'saving'
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                  : syncStatus === 'saved'
                  ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  : 'opacity-0'
              }`}
            >
              {syncStatus === 'saving' ? (
                <>
                  <Cloud className="w-3.5 h-3.5 animate-pulse text-amber-600 dark:text-amber-400" />
                  <span>{UI_STRINGS.common.syncing}</span>
                </>
              ) : (
                <>
                  <CloudCheck className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>{UI_STRINGS.common.synced}</span>
                </>
              )}
            </div>

            {isAuthenticated && (
              <button
                type="button"
                onClick={logout}
                title={UI_STRINGS.login.logout}
                aria-label={UI_STRINGS.login.logout}
                className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-amber-300 hover:border-amber-400 transition cursor-pointer shadow-xs"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>

        {showProgress && <ProgressRule currentStepIndex={currentStepIndex} totalSteps={totalSteps} />}
      </header>

      <main className={`flex-1 w-full max-w-[720px] mx-auto px-4 py-4 sm:py-6 ${className}`}>{children}</main>

      <footer className="w-full py-4 px-4 text-center text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60 no-print">
        <div className="max-w-[720px] mx-auto flex items-center justify-between">
          <span>{UI_STRINGS.common.appTitle}</span>
          <a href="#/admin" className="hover:text-amber-500 dark:hover:text-amber-300 transition-colors">
            {UI_STRINGS.common.adminLogin}
          </a>
        </div>
      </footer>
    </div>
  );
};
