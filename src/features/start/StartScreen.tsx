import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Clock, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/Button';
import { useSurvey } from '../../context/SurveyContext';
import { UI_STRINGS, CONSENT_TEXT } from '../../content/ui.fa';
import { BRAND_CONFIG } from '../../config/brand';

export const StartScreen: React.FC = () => {
  const navigate = useNavigate();
  const { consentAccepted, currentOrder, acceptConsent } = useSurvey();
  const [agreed, setAgreed] = useState(false);
  const t = UI_STRINGS.start;

  // A participant who already consented resumes from where they stopped.
  if (consentAccepted) return <Navigate to={`/q/${currentOrder}`} replace />;

  const handleStart = () => {
    if (!agreed) return;
    acceptConsent();
    navigate('/q/1');
  };

  return (
    <div className="w-full flex flex-col items-center gap-5 py-2">
      <header className="w-full flex flex-col items-center text-center gap-3">
        <img src="/logo.png" alt="" aria-hidden="true" className="w-20 h-20 object-contain" />
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-amber-100">
          {BRAND_CONFIG.appTitle}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{BRAND_CONFIG.subtitle}</p>
      </header>

      <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <p className="text-base leading-loose text-slate-700 dark:text-slate-200 text-justify">{t.welcome}</p>
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{t.timeEstimate}</span>
        </div>
      </div>

      <section
        aria-labelledby="consent-heading"
        className="w-full bg-slate-100/70 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6"
      >
        <h2 id="consent-heading" className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-amber-100 mb-4">
          <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          {t.consentTitle}
        </h2>

        <ul className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5 list-disc list-inside">
          {CONSENT_TEXT.map((point, i) => (
            <li key={i} className="text-justify">
              {point}
            </li>
          ))}
        </ul>

        <label className="flex items-start gap-3 cursor-pointer select-none pt-4 border-t border-slate-200 dark:border-slate-800">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-5 w-5 cursor-pointer accent-amber-500"
          />
          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{t.agree}</span>
        </label>
      </section>

      <Button variant="primary" size="lg" className="w-full" disabled={!agreed} onClick={handleStart}>
        {t.startButton}
      </Button>
    </div>
  );
};
