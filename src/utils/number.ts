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

const DIGIT_MAP: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

/** Converts Persian/Arabic-Indic digits to ASCII digits. */
export function toEnglishDigits(str: string): string {
  return str.replace(/[۰-۹٠-٩]/g, (ch) => DIGIT_MAP[ch] ?? ch);
}
