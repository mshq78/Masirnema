import { toEnglishDigits } from './number';

/** Normalises an Iranian mobile number to the `09xxxxxxxxx` form, or returns null if invalid. */
export function normalizeIranMobile(input: string): string | null {
  let s = toEnglishDigits(input).replace(/[\s-]/g, '');
  if (s.startsWith('+98')) s = '0' + s.slice(3);
  else if (s.startsWith('0098')) s = '0' + s.slice(4);
  else if (/^9\d{9}$/.test(s)) s = '0' + s;
  return /^09\d{9}$/.test(s) ? s : null;
}

/** Normalises an Iranian national ID (10 digits, leading zeros kept) and checks its checksum. */
export function normalizeNationalId(input: string): string | null {
  const s = toEnglishDigits(input).replace(/[\s-]/g, '');
  if (!/^\d{10}$/.test(s)) return null;
  if (/^(\d)\1{9}$/.test(s)) return null;
  const check = Number(s[9]);
  const sum = s
    .slice(0, 9)
    .split('')
    .reduce((acc, d, i) => acc + Number(d) * (10 - i), 0);
  const r = sum % 11;
  return (r < 2 ? check === r : check === 11 - r) ? s : null;
}
