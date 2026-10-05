import { SessionRecord } from '../types';

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
