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
  mobile: string;
  participantToken: string;
}

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';
