import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { createHmac } from 'node:crypto';

/**
 * POST /api/login  { mobile, nationalId }
 *   mobile = username, national ID = password. Both are validated, then an opaque participant token
 *   is derived with HMAC-SHA256 — the national ID itself is never stored or returned.
 *   Responds { participantToken, submitted }.
 *
 * Env: PARTICIPANT_TOKEN_SECRET (falls back to ADMIN_PASSWORD), DATABASE_URL (or POSTGRES_URL)
 */

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = connectionString ? neon(connectionString) : null;

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const secret = process.env.PARTICIPANT_TOKEN_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) return res.status(503).json({ error: 'secret_not_configured' });

  const mobile = typeof req.body?.mobile === 'string' ? normalizeMobile(req.body.mobile) : null;
  const nationalId = typeof req.body?.nationalId === 'string' ? normalizeNationalId(req.body.nationalId) : null;
  if (!mobile || !nationalId) return res.status(400).json({ error: 'invalid_credentials' });

  const participantToken = createHmac('sha256', secret).update(`${mobile}:${nationalId}`).digest('hex').slice(0, 40);

  let submitted = false;
  if (sql) {
    try {
      const rows = await sql`SELECT 1 FROM masirnama_sessions WHERE participant_token = ${participantToken} LIMIT 1`;
      submitted = rows.length > 0;
    } catch (err: any) {
      if (err?.code !== '42P01') {
        console.error('login api error', err);
        return res.status(500).json({ error: 'server_error' });
      }
      // 42P01: table not created yet → nobody has submitted
    }
  }
  return res.status(200).json({ participantToken, submitted });
}
