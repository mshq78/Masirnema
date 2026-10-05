/**
 * Utility functions for Persian formatting
 */

const FARSI_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[0-9]/g, (w) => FARSI_DIGITS[+w]);
}

/** Formats milliseconds as whole seconds in Persian, e.g. "۱۲۳ ثانیه" */
export function formatSeconds(ms: number): string {
  return `${toPersianDigits(Math.round(ms / 1000))} ثانیه`;
}
