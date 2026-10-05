import React from 'react';
import { UI_STRINGS } from '../content/ui.fa';

interface ProgressRuleProps {
  currentStepIndex: number; // 0-based
  totalSteps: number;
  className?: string;
}

/** Calm progress bar: deliberately shows no numbers or percentages. */
export const ProgressRule: React.FC<ProgressRuleProps> = ({ currentStepIndex, totalSteps, className = '' }) => {
  const percent = Math.min(100, Math.max(1, Math.round(((currentStepIndex + 1) / totalSteps) * 100)));

  return (
    <div className={`w-full py-2.5 px-4 select-none ${className}`}>
      <div className="max-w-[720px] mx-auto">
        <div
          role="progressbar"
          aria-label={UI_STRINGS.question.progressLabel}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-valuenow={currentStepIndex + 1}
          className="h-2 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300/40 dark:border-slate-700/60 shadow-inner"
        >
          <div
            className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-500 rounded-full transition-all duration-300 ease-out shadow-xs"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
