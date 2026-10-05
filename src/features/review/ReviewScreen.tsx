import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { useSurvey } from '../../context/SurveyContext';
import { SubmitError } from '../../services/api';
import { UI_STRINGS } from '../../content/ui.fa';
import { QUESTIONS } from '../../questions';
import { countChars } from '../../countChars';
import { toPersianDigits } from '../../utils/number';

export const ReviewScreen: React.FC = () => {
  const navigate = useNavigate();
  const { answers, isOffline, submitFinal } = useSurvey();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState<false | 'server' | 'not_registered'>(false);
  const t = UI_STRINGS.review;

  const allComplete = QUESTIONS.every((q) => countChars(answers[q.id] ?? '').count >= q.minChars);

  const handleConfirm = async () => {
    if (isOffline || submitting) return;
    setSubmitting(true);
    setSubmitFailed(false);
    try {
      await submitFinal();
      // The provider flips to "submitted"; the route guard moves us to /done.
    } catch (err) {
      if (!(err instanceof SubmitError)) console.error(err);
      setSubmitFailed(err instanceof SubmitError && err.kind === 'not_registered' ? 'not_registered' : 'server');
      setIsModalOpen(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full py-2">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-amber-100">{t.title}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t.subtitle}</p>
      </header>

      <div className="space-y-4 mb-8">
        {QUESTIONS.map((q) => {
          const answer = answers[q.id] ?? '';
          const isAnswered = answer.trim().length > 0;
          return (
            <article
              key={q.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">{q.text}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  aria-label={`${t.editAria} ${toPersianDigits(q.order)}`}
                  onClick={() => navigate(`/q/${q.order}?return=review`)}
                >
                  {t.edit}
                </Button>
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800 text-justify">
                {isAnswered ? (
                  <p className="whitespace-pre-wrap break-words">{answer}</p>
                ) : (
                  <p className="text-slate-400 italic">{t.empty}</p>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col gap-3">
        {isOffline && <p className="text-xs text-amber-800 dark:text-amber-300 text-center">{t.offlineNote}</p>}
        {!allComplete && <p className="text-xs text-amber-800 dark:text-amber-300 text-center">{t.incomplete}</p>}
        {submitFailed && (
          <p role="alert" className="text-xs text-amber-800 dark:text-amber-300 text-center">
            {submitFailed === 'not_registered' ? t.notRegistered : t.submitError}
          </p>
        )}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isOffline || submitting || !allComplete}
          onClick={() => setIsModalOpen(true)}
        >
          {t.submit}
        </Button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => !submitting && setIsModalOpen(false)} title={t.confirmTitle} maxWidth="sm">
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t.confirmBody}</p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" size="md" disabled={submitting} onClick={() => setIsModalOpen(false)}>
            {UI_STRINGS.common.cancel}
          </Button>
          <Button variant="primary" size="md" isLoading={submitting} onClick={handleConfirm}>
            {t.confirmButton}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
