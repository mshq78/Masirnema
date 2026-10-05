import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Admin-only management of the participant roster (header `x-admin-password` = env ADMIN_PASSWORD).
 *
 * GET    /api/participants                       → { participants: [{ firstName, lastName, mobile, submitted, createdAt }] }
 * POST   /api/participants  { participants: [{ firstName, lastName, mobile, nationalId }] }
 *                                                → { added, updated, errors: [{ index, reason }] }   (upsert by mobile)
 * DELETE /api/participants?mobile=09xxxxxxxxx    → { ok: true }
 *
 * The national ID is the participant's password: it is only used to derive an HMAC token and is never stored.
 * Env: DATABASE_URL (or POSTGRES_URL), ADMIN_PASSWORD, PARTICIPANT_TOKEN_SECRET (optional; falls back to ADMIN_PASSWORD)
 */

const MAX_BATCH = 1000;

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = connectionString ? neon(connectionString) : null;

// Keep in sync with api/sessions.ts
let tablesReady: Promise<unknown> | null = null;
function ensureTables() {
  if (!sql) throw new Error('DATABASE_URL is not configured');
  if (!tablesReady) {
    tablesReady = (async () => {
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
      tablesReady = null;
      throw err;
    });
  }
  return tablesReady;
}

const digest = (v: string) => createHash('sha256').update(v).digest();

function isAdmin(req: VercelRequest): boolean | 'unconfigured' {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return 'unconfigured';
  const given = req.headers['x-admin-password'];
  if (typeof given !== 'string' || !given) return false;
  return timingSafeEqual(digest(given), digest(expected));
}

const DIGITS: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};
const toEn = (s: string) => s.replace(/[۰-۹٠-٩]/g, (c) => DIGITS[c] ?? c);

function normalizeMobile(input: string): string | null {
  let s = toEn(input).replace(/[\s-]/g, '');
  if (s.startsWith('+98')) s = '0' + s.slice(3);
  else if (s.startsWith('0098')) s = '0' + s.slice(4);
  else if (/^9\d{9}$/.test(s)) s = '0' + s;
  return /^09\d{9}$/.test(s) ? s : null;
}

function normalizeNationalId(input: string): string | null {
  const s = toEn(input).replace(/[\s-]/g, '');
  if (!/^\d{10}$/.test(s) || /^(\d)\1{9}$/.test(s)) return null;
  const sum = s.slice(0, 9).split('').reduce((acc, d, i) => acc + Number(d) * (10 - i), 0);
  const r = sum % 11;
  return (r < 2 ? Number(s[9]) === r : Number(s[9]) === 11 - r) ? s : null;
}

/** Arabic yeh/kaf → Persian, collapse spaces. */
const cleanName = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s+/g, ' ').trim();
  return s && s.length <= 100 ? s : null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  const auth = isAdmin(req);
  if (auth === 'unconfigured') return res.status(503).json({ error: 'admin_password_not_configured' });
  if (!auth) return res.status(401).json({ error: 'unauthorized' });

  try {
    if (req.method === 'GET') {
      await ensureTables();
      const rows = await sql!`
        SELECT p.first_name, p.last_name, p.mobile, p.created_at, (s.session_id IS NOT NULL) AS submitted
        FROM masirnama_participants p
        LEFT JOIN masirnama_sessions s ON s.participant_token = p.participant_token
        ORDER BY p.created_at DESC, p.mobile
        LIMIT 20000
      `;
      return res.status(200).json({
        participants: rows.map((r: any) => ({
          firstName: r.first_name,
          lastName: r.last_name,
          mobile: r.mobile,
          submitted: !!r.submitted,
          createdAt: r.created_at,
        })),
      });
    }

    if (req.method === 'POST') {
      const secret = process.env.PARTICIPANT_TOKEN_SECRET || process.env.ADMIN_PASSWORD!;
      const input = req.body?.participants;
      if (!Array.isArray(input) || input.length === 0 || input.length > MAX_BATCH) {
        return res.status(400).json({ error: 'invalid_batch' });
      }

      const errors: { index: number; reason: string }[] = [];
      const byMobile = new Map<string, { first: string; last: string; token: string; index: number }>();
      input.forEach((p: any, index: number) => {
        const first = cleanName(p?.firstName);
        const last = cleanName(p?.lastName);
        const mobile = typeof p?.mobile === 'string' ? normalizeMobile(p.mobile) : null;
        const nid = typeof p?.nationalId === 'string' ? normalizeNationalId(p.nationalId) : null;
        const reason = !first || !last ? 'name' : !mobile ? 'mobile' : !nid ? 'national_id' : null;
        if (reason) return errors.push({ index, reason });
        if (byMobile.has(mobile!)) errors.push({ index: byMobile.get(mobile!)!.index, reason: 'duplicate_in_batch' });
        const token = createHmac('sha256', secret).update(`${mobile}:${nid}`).digest('hex').slice(0, 40);
        byMobile.set(mobile!, { first: first!, last: last!, token, index });
      });

      let added = 0;
      let updated = 0;
      if (byMobile.size > 0) {
        await ensureTables();
        const entries = [...byMobile.entries()];
        const rows = await sql!`
          INSERT INTO masirnama_participants (mobile, first_name, last_name, participant_token)
          SELECT * FROM unnest(
            ${entries.map(([m]) => m)}::text[],
            ${entries.map(([, v]) => v.first)}::text[],
            ${entries.map(([, v]) => v.last)}::text[],
            ${entries.map(([, v]) => v.token)}::text[]
          )
          ON CONFLICT (mobile) DO UPDATE
            SET first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                participant_token = EXCLUDED.participant_token
          RETURNING (xmax = 0) AS inserted
        `;
        added = rows.filter((r: any) => r.inserted).length;
        updated = rows.length - added;
      }
      return res.status(200).json({ added, updated, errors });
    }

    if (req.method === 'DELETE') {
      const mobile = typeof req.query.mobile === 'string' ? normalizeMobile(req.query.mobile) : null;
      if (!mobile) return res.status(400).json({ error: 'invalid_mobile' });
      await ensureTables();
      await sql!`DELETE FROM masirnama_participants WHERE mobile = ${mobile}`;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('participants api error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
