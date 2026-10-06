export interface Question {
  id: string;
  text: string;
  minChars: number;
  maxChars: number;
  order: number;
}

export interface QuestionRevision {
  savedAt: string;
  text: string;
}

export interface ClientMeta {
  activeTimeMs: number;
  pasteEvents: number;
  pastedChars: number;
  editCount: number;
  revisions: QuestionRevision[];
  timestamp: string;
  questionSetVersion: string;
}

export interface AnswerRecord {
  questionId: string;
  text: string;
  clientMeta: ClientMeta;
}

/** A completed, submitted session as stored on the server (POST /api/sessions). */
export interface SessionRecord {
  sessionId: string;
  participantToken: string;
  participantMobile: string;
  questionSetVersion: string;
  consentVersion: string;
  consentAcceptedAt: string;
  startedAt: string;
  finishedAt: string;
  answers: AnswerRecord[];
}

/** Draft kept on the device until the final submission succeeds. */
export interface InProgressSurvey {
  sessionId: string;
  participantToken: string;
  participantMobile: string;
  consent: { version: string; acceptedAt: string } | null;
  startedAt: string;
  currentOrder: number;
  answers: Record<string, string>;
  meta: Record<string, ClientMeta>;
}

/** Who is logged in on this device. The national ID is never stored; only the server-derived token. */
export interface AuthState {
  firstName?: string;
  mobile: string;
  participantToken: string;
}

/** One person on the pre-registered roster (the national ID is never returned by the server). */
export interface Participant {
  firstName: string;
  lastName: string;
  mobile: string;
  submitted: boolean;
  createdAt: string;
}

/** Input for adding participants (single form or Excel row). */
export interface ParticipantInput {
  firstName: string;
  lastName: string;
  mobile: string;
  nationalId: string;
}

/** Analysis report as returned by /api/analysis. All labels and levels come from the server. */
export interface AnalysisResult {
  version: string;
  model: string;
  createdAt: string;
  status: 'ok' | 'insufficient_data';
  statusText: string;
  indicators: {
    code: string;
    title: string;
    score: number | null;
    itemCount: number;
    thinEvidence: boolean;
    evidence: { questionId: string; score: number; confidence: number; text: string }[];
  }[];
  composite: { title: string; score: number | null; levelCode: string | null; levelTitle: string | null };
  questions: {
    questionId: string;
    usable: boolean;
    flagText: string;
    ratings: { code: string; title: string; score: number; confidence: number; evidence: string }[];
    signals: string[];
  }[];
  flags: string[];
  report: {
    summary: string;
    motivation_sources: string;
    meaning_source: string;
    main_barrier: string;
    growth_path: string;
    alignment: string;
    future_connection: string;
    conversation_topics: string[];
  } | null;
}

export interface AnalysisSummary {
  sessionId: string;
  version: string;
  status: string;
  createdAt: string;
  score: number | null;
  level: string | null;
}

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';
