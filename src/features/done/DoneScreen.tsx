import React from 'react';
import { Check } from 'lucide-react';
import { UI_STRINGS } from '../../content/ui.fa';

export const DoneScreen: React.FC = () => {
  return (
    <div className="w-full py-16 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-center justify-center mb-6 text-amber-800 dark:text-amber-300">
        <Check className="w-8 h-8" aria-hidden="true" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-amber-100 mb-4">
        {UI_STRINGS.done.title}
      </h1>
      <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300 max-w-md">{UI_STRINGS.done.body}</p>
    </div>
  );
};
