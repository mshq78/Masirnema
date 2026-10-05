import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { AutoResizeTextarea } from '../../components/AutoResizeTextarea';
import { CharacterCounter } from '../../components/CharacterCounter';
import { useSurvey } from '../../context/SurveyContext';
import { UI_STRINGS } from '../../content/ui.fa';
import { QUESTIONS } from '../../questions';
import { QUESTION_SET_VERSION } from '../../config';
import { countChars } from '../../countChars';
import { ClientMeta, Question, QuestionRevision } from '../../types';

const AUTOSAVE_DELAY_MS = 800;

/** Route wrapper: validates `/q/:order` and remounts the screen per question. */
export const QuestionRoute: React.FC = () => {
  const { order: rawOrder } = useParams();
  const { currentOrder } = useSurvey();
  const order = Number(rawOrder);
  const question = Number.isInteger(order) ? QUESTIONS[order - 1] : undefined;
  if (!question) return <Navigate to={`/q/${currentOrder}`} replace />;
  return <QuestionScreen key={question.id} question={question} />;
};

const QuestionScreen: React.FC<{ question: Question }> = ({ question }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReturnToReview = searchParams.get('return') === 'review';
  const { answers, metaByQuestion, completedOrders, saveAnswer, setCurrentOrder } = useSurvey();
  const t = UI_STRINGS.question;

  const existingMeta = metaByQuestion[question.id];
  const [text, setText] = useState<string>(answers[question.id] ?? '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const hasBeenCompletedBefore = useRef(completedOrders.has(question.order)).current;

  // Telemetry (quality metadata only; clipboard content and keystrokes are never recorded)
  const activeTimeMsRef = useRef(existingMeta?.activeTimeMs ?? 0);
  const pasteEventsRef = useRef(existingMeta?.pasteEvents ?? 0);
  const pastedCharsRef = useRef(existingMeta?.pastedChars ?? 0);
  const revisionsRef = useRef<QuestionRevision[]>(existingMeta?.revisions ? [...existingMeta.revisions] : []);
  const editCountRef = useRef(existingMeta?.editCount ?? 0);
  const hasModifiedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCurrentOrder(question.order);
  }, [question.order, setCurrentOrder]);

  // Active time: accumulates only while the tab is visible and focused.
  useEffect(() => {
    let isActive = document.visibilityState === 'visible' && document.hasFocus();
    let last = Date.now();

    const tick = () => {
      const now = Date.now();
      const delta = now - last;
      if (isActive && delta > 0 && delta < 60000) activeTimeMsRef.current += delta;
      last = now;
    };
    const onVisibility = () => {
      tick();
      isActive = document.visibilityState === 'visible';
    };
    const onFocus = () => {
      tick();
      isActive = true;
    };
    const onBlur = () => {
      tick();
      isActive = false;
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    const timer = setInterval(tick, 1000);
    return () => {
      tick();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      clearInterval(timer);
    };
  }, []);

  const assembleMeta = useCallback(
    (isStageComplete: boolean, latestText: string): ClientMeta => {
      const trimmed = latestText.trim();
      const revisions = [...revisionsRef.current];
      if (isStageComplete && trimmed) {
        revisions.push({ savedAt: new Date().toISOString(), text: trimmed });
        revisionsRef.current = revisions;
      }
      return {
        activeTimeMs: activeTimeMsRef.current,
        pasteEvents: pasteEventsRef.current,
        pastedChars: pastedCharsRef.current,
        editCount: editCountRef.current,
        revisions,
        timestamp: new Date().toISOString(),
        questionSetVersion: QUESTION_SET_VERSION,
      };
    },
    []
  );

  // Flush a pending autosave if the participant leaves the screen.
  const textRef = useRef(text);
  textRef.current = text;
  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        saveAnswer(question.id, textRef.current.trim(), assembleMeta(false, textRef.current), false);
      }
    },
    [question.id, saveAnswer, assembleMeta]
  );

  const handleChange = (next: string) => {
    setText(next);
    hasModifiedRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus('saving');
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      saveAnswer(question.id, next.trim(), assembleMeta(false, next), false);
      setSaveStatus('saved');
    }, AUTOSAVE_DELAY_MS);
  };

  const handlePasteEvent = (pastedLength: number) => {
    pasteEventsRef.current += 1;
    pastedCharsRef.current += pastedLength;
  };

  const { count } = countChars(text);
  const isValidToProceed = count >= question.minChars;

  const handleProceed = () => {
    if (!isValidToProceed) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    // Re-editing an already completed answer counts as an edit.
    if (hasBeenCompletedBefore && hasModifiedRef.current) editCountRef.current += 1;
    saveAnswer(question.id, text.trim(), assembleMeta(true, text), true);

    if (isReturnToReview) navigate('/review');
    else if (question.order < QUESTIONS.length) navigate(`/q/${question.order + 1}`);
    else navigate('/review');
  };

  const handleBack = () => {
    // Any pending autosave is flushed by the unmount cleanup.
    navigate(`/q/${question.order - 1}`);
  };

  return (
    <div className="w-full flex flex-col min-h-[70vh] py-2">
      <h2 className="text-xl sm:text-2xl font-bold leading-relaxed text-slate-900 dark:text-amber-50 mb-6 text-justify">
        {question.text}
      </h2>

      <AutoResizeTextarea
        value={text}
        onChange={handleChange}
        onPasteEvent={handlePasteEvent}
        maxChars={question.maxChars}
        ariaLabel={question.text}
      />
      <CharacterCounter count={count} minChars={question.minChars} maxChars={question.maxChars} />

      <div className="h-6 flex items-center justify-end px-1 mb-6" aria-live="polite">
        {saveStatus === 'saving' && (
          <span className="text-xs text-slate-400 animate-pulse">{t.saving}</span>
        )}
        {saveStatus === 'saved' && <span className="text-xs text-slate-400">{t.saved}</span>}
      </div>

      <div className="mt-auto pt-5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4">
        <div>
          {question.order > 1 && !isReturnToReview && (
            <Button variant="outline" size="md" onClick={handleBack}>
              {UI_STRINGS.common.prev}
            </Button>
          )}
        </div>
        <Button variant="primary" size="md" onClick={handleProceed} disabled={!isValidToProceed}>
          {isReturnToReview ? t.saveAndReturn : UI_STRINGS.common.next}
        </Button>
      </div>
    </div>
  );
};
