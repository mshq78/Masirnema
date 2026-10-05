import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { QUESTIONS } from '../questions';
import { CONSENT_VERSION, QUESTION_SET_VERSION } from '../config';
import { api, LoginResult, SubmitError } from '../services/api';
import { newSessionId, storage } from '../storage';
import { AuthState, ClientMeta, InProgressSurvey, SessionRecord, SyncStatus } from '../types';
import { countChars } from '../countChars';

interface SurveyContextValue {
  ready: boolean;
  isAuthenticated: boolean;
  participantMobile: string;
  participantFirstName: string;
  isSubmitted: boolean;
  consentAccepted: boolean;
  answers: Record<string, string>;
  metaByQuestion: Record<string, ClientMeta>;
  completedOrders: Set<number>;
  currentOrder: number;
  syncStatus: SyncStatus;
  isOffline: boolean;
  /** Mobile = username, national ID = password. Resolves with the outcome; never throws. */
  login: (mobile: string, nationalId: string) => Promise<LoginResult['status']>;
  logout: () => void;
  acceptConsent: () => void;
  saveAnswer: (questionId: string, text: string, meta: ClientMeta, isStageComplete: boolean) => void;
  setCurrentOrder: (order: number) => void;
  /** Throws SubmitError when the server did not store the session; the draft is kept on the device. */
  submitFinal: () => Promise<void>;
}

const SurveyContext = createContext<SurveyContextValue | null>(null);

function freshProgress(auth: AuthState): InProgressSurvey {
  return {
    sessionId: newSessionId(),
    participantToken: auth.participantToken,
    participantMobile: auth.mobile,
    consent: null,
    startedAt: new Date().toISOString(),
    currentOrder: 1,
    answers: {},
    meta: {},
  };
}

export const SurveyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState | null>(() => storage.loadAuth());
  const participantToken = auth?.participantToken ?? '';
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

  // Initialisation (and re-initialisation on login/logout): resume an existing draft or start a new one.
  useEffect(() => {
    progressRef.current = null;
    setProgress(null);
    setIsSubmitted(false);
    setCompletedOrders(new Set());
    if (!auth) {
      setReady(true);
      return;
    }
    if (storage.isSubmitted(auth.participantToken)) {
      setIsSubmitted(true);
      setReady(true);
      return;
    }
    const existing = storage.loadProgress(auth.participantToken) ?? freshProgress(auth);
    progressRef.current = existing;
    setProgress(existing);
    storage.saveProgress(existing);
    setCompletedOrders(
      new Set(
        QUESTIONS.filter((q) => countChars(existing.answers[q.id] ?? '').count >= q.minChars).map((q) => q.order)
      )
    );
    setReady(true);
  }, [auth]);

  const login = useCallback(async (mobile: string, nationalId: string): Promise<LoginResult['status']> => {
    const result = await api.login(mobile, nationalId);
    if (result.status !== 'ok') return result.status;
    if (result.submitted) storage.markSubmitted({ sessionId: '', participantToken: result.participantToken });
    const next: AuthState = { mobile, participantToken: result.participantToken, firstName: result.firstName };
    storage.saveAuth(next);
    setReady(false);
    setAuth(next);
    return 'ok';
  }, []);

  const logout = useCallback(() => {
    storage.clearAuth();
    setReady(false);
    setAuth(null);
  }, []);

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
      participantMobile: p.participantMobile,
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
    isAuthenticated: !!auth,
    participantMobile: auth?.mobile ?? '',
    participantFirstName: auth?.firstName ?? '',
    consentAccepted: !!progress?.consent,
    answers: progress?.answers ?? {},
    metaByQuestion: progress?.meta ?? {},
    completedOrders,
    currentOrder: progress?.currentOrder ?? 1,
    syncStatus,
    isOffline,
    login,
    logout,
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
