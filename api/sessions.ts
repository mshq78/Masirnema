import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * POST /api/sessions  — public: a participant submits a completed session (idempotent by sessionId;
 *                       one submission per participantToken)
 * GET  /api/sessions  — admin only: header `x-admin-password` must match env ADMIN_PASSWORD
 *
 * Required env: DATABASE_URL (or POSTGRES_URL), ADMIN_PASSWORD
 */

const QUESTION_IDS = Array.from({ length: 12 }, (_, i) => `Q${String(i + 1).padStart(2, '0')}`);
const MAX_TEXT = 1500;
const MAX_REVISIONS = 100;

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = connectionString ? neon(connectionString) : null;

// Keep in sync with api/participants.ts
let tableReady: Promise<unknown> | null = null;
function ensureTable() {
  if (!sql) throw new Error('DATABASE_URL is not configured');
  if (!tableReady) {
    tableReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS masirnama_sessions (
          session_id         TEXT PRIMARY KEY,
          participant_token  TEXT NOT NULL,
          mobile             TEXT,
          data               JSONB NOT NULL,
          created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`ALTER TABLE masirnama_sessions ADD COLUMN IF NOT EXISTS mobile TEXT`;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS masirnama_sessions_token_idx
        ON masirnama_sessions (participant_token)
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS masirnama_participants (
          mobile             TEXT PRIMARY KEY,
          first_name         TEXT NOT NULL,
          last_name          TEXT NOT NULL,
          participant_token  TEXT NOT NULL UNIQUE,
          created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
    })().catch((err) => {
      tableReady = null;
      throw err;
    });
  }
  return tableReady;
}

function digest(value: string) {
  return createHash('sha256').update(value).digest();
}

function isAdmin(req: VercelRequest): boolean | 'unconfigured' {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return 'unconfigured';
  const given = req.headers['x-admin-password'];
  if (typeof given !== 'string' || !given) return false;
  return timingSafeEqual(digest(given), digest(expected));
}

const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.length <= max ? v : null;

const num = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(v, 0), 1e9) : 0;

/** Validates the payload and rebuilds it from known fields only. Returns null when invalid. */
function sanitizeSession(body: any) {
  if (!body || typeof body !== 'object') return null;

  const sessionId = str(body.sessionId, 80);
  const participantToken = str(body.participantToken, 100);
  const participantMobile = str(body.participantMobile, 11);
  const questionSetVersion = str(body.questionSetVersion, 20);
  const consentVersion = str(body.consentVersion, 20);
  const consentAcceptedAt = str(body.consentAcceptedAt, 40);
  const startedAt = str(body.startedAt, 40);
  const finishedAt = str(body.finishedAt, 40);
  if (
    !sessionId || !/^[A-Za-z0-9_-]{3,80}$/.test(sessionId) ||
    !participantToken || !/^[A-Za-z0-9_.-]{1,100}$/.test(participantToken) ||
    !participantMobile || !/^09\d{9}$/.test(participantMobile) ||
    !questionSetVersion || !consentVersion || !consentAcceptedAt || !startedAt || !finishedAt
  ) {
    return null;
  }

  if (!Array.isArray(body.answers) || body.answers.length !== QUESTION_IDS.length) return null;
  const answers = [];
  for (const [i, a] of body.answers.entries()) {
    if (!a || typeof a !== 'object' || a.questionId !== QUESTION_IDS[i]) return null;
    const text = str(a.text, MAX_TEXT);
    const m = a.clientMeta;
    if (!text || !text.trim() || !m || typeof m !== 'object') return null;
    const revisions = (Array.isArray(m.revisions) ? m.revisions : [])
      .slice(0, MAX_REVISIONS)
      .map((r: any) => ({ savedAt: str(r?.savedAt, 40) ?? '', text: str(r?.text, MAX_TEXT) ?? '' }));
    answers.push({
      questionId: a.questionId,
      text,
      clientMeta: {
        activeTimeMs: num(m.activeTimeMs),
        pasteEvents: num(m.pasteEvents),
        pastedChars: num(m.pastedChars),
        editCount: num(m.editCount),
        revisions,
        timestamp: str(m.timestamp, 40) ?? '',
        questionSetVersion: str(m.questionSetVersion, 20) ?? '',
      },
    });
  }

  return {
    sessionId, participantToken, participantMobile, questionSetVersion, consentVersion,
    consentAcceptedAt, startedAt, finishedAt, answers,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'POST') {
      const session = sanitizeSession(req.body);
      if (!session) return res.status(400).json({ error: 'invalid_session' });
      await ensureTable();
      // Only pre-registered participants may submit (token and mobile must match the roster).
      const registered = await sql!`
        SELECT 1 FROM masirnama_participants
        WHERE participant_token = ${session.participantToken} AND mobile = ${session.participantMobile}
      `;
      if (registered.length === 0) return res.status(403).json({ error: 'not_registered' });
      try {
        await sql!`
          INSERT INTO masirnama_sessions (session_id, participant_token, mobile, data)
          VALUES (${session.sessionId}, ${session.participantToken}, ${session.participantMobile}, ${JSON.stringify(session)}::jsonb)
          ON CONFLICT (session_id) DO NOTHING
        `;
      } catch (err: any) {
        // unique violation on participant_token: this participant already submitted
        if (err?.code === '23505') return res.status(409).json({ error: 'already_submitted' });
        throw err;
      }
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
      const auth = isAdmin(req);
      if (auth === 'unconfigured') return res.status(503).json({ error: 'admin_password_not_configured' });
      if (!auth) return res.status(401).json({ error: 'unauthorized' });
      await ensureTable();
      const rows = await sql!`
        SELECT data FROM masirnama_sessions ORDER BY created_at DESC LIMIT 5000
      `;
      return res.status(200).json({ sessions: rows.map((r: any) => r.data) });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('sessions api error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
