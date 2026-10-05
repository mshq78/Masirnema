import { InProgressSurvey, SessionRecord } from './types';
import { PARTICIPANT_TOKEN_PATTERN } from './config';

const PREFIX = 'masirnama:';
const PROGRESS_KEY = `${PREFIX}progress`;
const SUBMITTED_KEY = `${PREFIX}submitted`;
const DEMO_TOKEN_KEY = `${PREFIX}demo_token`;

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

function randomId(prefix: string): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return prefix + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Participant token comes from the invitation link (`?t=...`). Without a (valid) one, a random
 * demo token is generated and remembered on this device.
 */
export function getParticipantToken(): string {
  const fromUrl = new URLSearchParams(window.location.search).get('t')?.trim();
  if (fromUrl && PARTICIPANT_TOKEN_PATTERN.test(fromUrl)) return fromUrl;
  let demo = read<string>(DEMO_TOKEN_KEY, '');
  if (!demo) {
    demo = randomId('demo_');
    write(DEMO_TOKEN_KEY, demo);
  }
  return demo;
}

export function newSessionId(): string {
  return randomId('sess_');
}

export const storage = {
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
  keys: { PROGRESS_KEY, SUBMITTED_KEY },
};
