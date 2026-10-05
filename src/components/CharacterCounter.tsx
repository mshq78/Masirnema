import React from 'react';
import { Check } from 'lucide-react';
import { toPersianDigits } from '../utils/number';
import { UI_STRINGS } from '../content/ui.fa';

interface CharacterCounterProps {
  count: number;
  minChars: number;
  maxChars: number;
}

export const CharacterCounter: React.FC<CharacterCounterProps> = ({ count, minChars, maxChars }) => {
  const isNearMax = count >= maxChars * 0.9;
  const isBelowMin = count < minChars;
  const t = UI_STRINGS.question;

  return (
    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 select-none">
      <div>
        {isBelowMin ? (
          <span className="text-slate-400 dark:text-slate-500">
            {t.minPrefix} {toPersianDigits(minChars)} {t.chars}
            {count > 0 && ` (${toPersianDigits(minChars - count)} ${t.untilMin})`}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.minReached}</span>
          </span>
        )}
      </div>

      <div
        aria-live="polite"
        className={`text-xs tabular-nums tracking-wide transition-colors ${
          isNearMax ? 'text-amber-700 dark:text-amber-300 font-medium' : ''
        }`}
      >
        <span>{toPersianDigits(count)}</span>
        <span className="text-slate-300 dark:text-slate-600 mx-1">/</span>
        <span>{toPersianDigits(maxChars)}</span>
      </div>
    </div>
  );
};
