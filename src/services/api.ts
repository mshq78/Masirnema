import { Participant, ParticipantInput, SessionRecord } from '../types';

export type LoginResult =
  | { status: 'ok'; participantToken: string; submitted: boolean; firstName?: string }
  | { status: 'invalid' | 'offline' | 'unavailable' };

export class SubmitError extends Error {
  constructor(public readonly kind: 'offline' | 'server' | 'not_registered') {
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
      if (res.status === 400 || res.status === 401) return { status: 'invalid' };
      if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
        const body = await res.json();
        return {
          status: 'ok',
          participantToken: body.participantToken,
          submitted: !!body.submitted,
          firstName: body.firstName,
        };
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
    if (res.status === 403) throw new SubmitError('not_registered');
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

  private adminHeaders(adminPassword: string) {
    return { 'Content-Type': 'application/json', 'x-admin-password': adminPassword };
  }

  /** Admin: the pre-registered roster (no national IDs). */
  async listParticipants(adminPassword: string): Promise<Participant[] | null> {
    try {
      const res = await fetch('/api/participants', { headers: this.adminHeaders(adminPassword) });
      if (!res.ok) return null;
      return (await res.json()).participants as Participant[];
    } catch {
      return null;
    }
  }

  /** Admin: adds/updates participants (upsert by mobile). `errors[].index` refers to the posted array. */
  async addParticipants(
    adminPassword: string,
    participants: ParticipantInput[]
  ): Promise<{ added: number; updated: number; errors: { index: number; reason: string }[] } | null> {
    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: this.adminHeaders(adminPassword),
        body: JSON.stringify({ participants }),
      });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  }

  async deleteParticipant(adminPassword: string, mobile: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/participants?mobile=${encodeURIComponent(mobile)}`, {
        method: 'DELETE',
        headers: this.adminHeaders(adminPassword),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}


export const api = new ApiService();
