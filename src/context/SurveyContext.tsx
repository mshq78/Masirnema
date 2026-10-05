import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { QUESTIONS } from '../questions';
import { CONSENT_VERSION, QUESTION_SET_VERSION } from '../config';
import { api, SubmitError } from '../services/api';
import { getParticipantToken, newSessionId, storage } from '../storage';
import { ClientMeta, InProgressSurvey, SessionRecord, SyncStatus } from '../types';
import { countChars } from '../countChars';

interface SurveyContextValue {
  ready: boolean;
  isSubmitted: boolean;
  consentAccepted: boolean;
  answers: Record<string, string>;
  metaByQuestion: Record<string, ClientMeta>;
  completedOrders: Set<number>;
  currentOrder: number;
  syncStatus: SyncStatus;
  isOffline: boolean;
  acceptConsent: () => void;
  saveAnswer: (questionId: string, text: string, meta: ClientMeta, isStageComplete: boolean) => void;
  setCurrentOrder: (order: number) => void;
  /** Throws SubmitError when the server did not store the session; the draft is kept on the device. */
  submitFinal: () => Promise<void>;
}

const SurveyContext = createContext<SurveyContextValue | null>(null);

function freshProgress(participantToken: string): InProgressSurvey {
  return {
    sessionId: newSessionId(),
    participantToken,
    consent: null,
    startedAt: new Date().toISOString(),
    currentOrder: 1,
    answers: {},
    meta: {},
  };
}

export const SurveyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const participantToken = useMemo(() => getParticipantToken(), []);
  const [progress, setProgress] = useState<InProgressSurvey | null>(null);
  const [completedOrders, setCompletedOrders] = useState<Set<number>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);

  // Latest draft for synchronous reads inside callbacks.
  const progressRef = useRef<InProgressSurvey | null>(null);
  const commit = useCallback((next: InProgressSurvey) => {
    progressRef.current = next;
    setProgress(next);
    storage.saveProgress(next);
  }, []);

  // Initialisation: resume an existing draft or start a new one.
  useEffect(() => {
    if (storage.isSubmitted(participantToken)) {
      setIsSubmitted(true);
      setReady(true);
      return;
    }
    const existing = storage.loadProgress(participantToken) ?? freshProgress(participantToken);
    progressRef.current = existing;
    setProgress(existing);
    storage.saveProgress(existing);
    setCompletedOrders(
      new Set(
        QUESTIONS.filter((q) => countChars(existing.answers[q.id] ?? '').count >= q.minChars).map((q) => q.order)
      )
    );
    setReady(true);
  }, [participantToken]);

  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Multi-tab sync: a submission or edit in another tab is reflected here.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === storage.keys.SUBMITTED_KEY && e.newValue) {
        if (storage.isSubmitted(participantToken)) {
          progressRef.current = null;
          setProgress(null);
          setIsSubmitted(true);
        }
      } else if (e.key === storage.keys.PROGRESS_KEY && e.newValue) {
        const p = storage.loadProgress(participantToken);
        if (p) {
          progressRef.current = p;
          setProgress(p);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [participantToken]);

  const acceptConsent = useCallback(() => {
    const p = progressRef.current;
    if (!p) return;
    commit({ ...p, consent: { version: CONSENT_VERSION, acceptedAt: new Date().toISOString() }, currentOrder: 1 });
  }, [commit]);

  const saveAnswer = useCallback(
    (questionId: string, text: string, meta: ClientMeta, isStageComplete: boolean) => {
      const p = progressRef.current;
      if (!p) return;
      commit({ ...p, answers: { ...p.answers, [questionId]: text }, meta: { ...p.meta, [questionId]: meta } });
      if (isStageComplete) {
        const q = QUESTIONS.find((x) => x.id === questionId);
        if (q) setCompletedOrders((prev) => new Set(prev).add(q.order));
      }
    },
    [commit]
  );

  const setCurrentOrder = useCallback(
    (order: number) => {
      const p = progressRef.current;
      if (p && p.currentOrder !== order) commit({ ...p, currentOrder: order });
    },
    [commit]
  );

  const submitFinal = useCallback(async () => {
    const p = progressRef.current;
    if (!p || !p.consent) throw new SubmitError('server');
    const session: SessionRecord = {
      sessionId: p.sessionId,
      participantToken: p.participantToken,
      questionSetVersion: QUESTION_SET_VERSION,
      consentVersion: p.consent.version,
      consentAcceptedAt: p.consent.acceptedAt,
      startedAt: p.startedAt,
      finishedAt: new Date().toISOString(),
      answers: QUESTIONS.map((q) => ({
        questionId: q.id,
        text: (p.answers[q.id] ?? '').trim(),
        clientMeta: p.meta[q.id] ?? {
          activeTimeMs: 0,
          pasteEvents: 0,
          pastedChars: 0,
          editCount: 0,
          revisions: [],
          timestamp: new Date().toISOString(),
          questionSetVersion: QUESTION_SET_VERSION,
        },
      })),
    };

    setSyncStatus('saving');
    try {
      await api.submitSession(session);
    } catch (err) {
      setSyncStatus('error');
      throw err;
    }
    // Purge answers and revision telemetry from the device; keep only the submitted flag.
    storage.clearProgress();
    storage.markSubmitted(session);
    progressRef.current = null;
    setProgress(null);
    setIsSubmitted(true);
    setSyncStatus('saved');
    setTimeout(() => setSyncStatus('idle'), 2500);
  }, []);

  const value: SurveyContextValue = {
    ready,
    isSubmitted,
    consentAccepted: !!progress?.consent,
    answers: progress?.answers ?? {},
    metaByQuestion: progress?.meta ?? {},
    completedOrders,
    currentOrder: progress?.currentOrder ?? 1,
    syncStatus,
    isOffline,
    acceptConsent,
    saveAnswer,
    setCurrentOrder,
    submitFinal,
  };

  return <SurveyContext.Provider value={value}>{children}</SurveyContext.Provider>;
};

export function useSurvey(): SurveyContextValue {
  const ctx = useContext(SurveyContext);
  if (!ctx) throw new Error('useSurvey must be used within SurveyProvider');
  return ctx;
}
