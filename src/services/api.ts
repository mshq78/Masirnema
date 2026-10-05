import { SessionRecord } from '../types';

export type LoginResult =
  | { status: 'ok'; participantToken: string; submitted: boolean }
  | { status: 'invalid' | 'offline' | 'unavailable' };

export class SubmitError extends Error {
  constructor(public readonly kind: 'offline' | 'server') {
    super(kind);
  }
}

class ApiService {
  public isOffline(): boolean {
    return typeof navigator !== 'undefined' && !navigator.onLine;
  }

  /**
   * Participant login: mobile number = username, national ID = password. The server validates both,
   * derives an opaque participant token (the national ID is never stored) and reports whether this
   * participant has already submitted.
   */
  async login(mobile: string, nationalId: string): Promise<LoginResult> {
    if (this.isOffline()) return { status: 'offline' };
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, nationalId }),
      });
      if (res.status === 400) return { status: 'invalid' };
      if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
        const body = await res.json();
        return { status: 'ok', participantToken: body.participantToken, submitted: !!body.submitted };
      }
    } catch {
      return { status: 'offline' };
    }
    return { status: 'unavailable' };
  }

  /**
   * Final submission (POST /api/sessions → Neon). Resolves once the server has stored the session
   * (an already-stored session counts as success, so retries are safe). Throws SubmitError otherwise.
   */
  async submitSession(session: SessionRecord): Promise<void> {
    if (this.isOffline()) throw new SubmitError('offline');
    let res: Response;
    try {
      res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session),
      });
    } catch {
      throw new SubmitError('offline');
    }
    if (res.ok || res.status === 409) return; // 409: this participant already submitted
    throw new SubmitError('server');
  }

  /** Admin: lists all sessions from the server. */
  async listSessionsAdmin(
    adminPassword: string
  ): Promise<
    | { status: 'ok'; sessions: SessionRecord[] }
    | { status: 'unauthorized' | 'unconfigured' | 'unavailable' }
  > {
    try {
      const res = await fetch('/api/sessions', { headers: { 'x-admin-password': adminPassword } });
      if (res.status === 401) return { status: 'unauthorized' };
      if (res.status === 503) return { status: 'unconfigured' };
      if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
        const body = await res.json();
        return { status: 'ok', sessions: body.sessions as SessionRecord[] };
      }
    } catch (e) {
      console.error('Admin fetch failed', e);
    }
    return { status: 'unavailable' };
  }
}

export const api = new ApiService();
