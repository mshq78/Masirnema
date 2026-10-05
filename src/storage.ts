import { AuthState, InProgressSurvey, SessionRecord } from './types';

const PREFIX = 'masirnama:';
const AUTH_KEY = `${PREFIX}auth`;
const PROGRESS_KEY = `${PREFIX}progress`;
const SUBMITTED_KEY = `${PREFIX}submitted`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error', e);
  }
}

export function newSessionId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return 'sess_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const storage = {
  loadAuth(): AuthState | null {
    const a = read<AuthState | null>(AUTH_KEY, null);
    return a && a.mobile && a.participantToken ? a : null;
  },
  saveAuth(auth: AuthState) {
    write(AUTH_KEY, auth);
  },
  clearAuth() {
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {
      /* ignore */
    }
  },
  loadProgress(participantToken: string): InProgressSurvey | null {
    const p = read<InProgressSurvey | null>(PROGRESS_KEY, null);
    return p && p.participantToken === participantToken ? p : null;
  },
  saveProgress(progress: InProgressSurvey) {
    write(PROGRESS_KEY, progress);
  },
  /** Removes the draft (answers + revision telemetry) from the device. */
  clearProgress() {
    try {
      localStorage.removeItem(PROGRESS_KEY);
    } catch {
      /* ignore */
    }
  },
  isSubmitted(participantToken: string): boolean {
    const s = read<{ participantToken: string } | null>(SUBMITTED_KEY, null);
    return !!s && s.participantToken === participantToken;
  },
  markSubmitted(session: Pick<SessionRecord, 'sessionId' | 'participantToken'>) {
    write(SUBMITTED_KEY, { sessionId: session.sessionId, participantToken: session.participantToken });
  },
  keys: { AUTH_KEY, PROGRESS_KEY, SUBMITTED_KEY },
};
