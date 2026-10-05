import { QUESTIONS } from '../questions';
import { countChars, clipToMaxChars } from '../countChars';
import { UI_STRINGS, CONSENT_TEXT } from '../content/ui.fa';

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const ALLOWED_QUESTION_KEYS = new Set(['id', 'text', 'minChars', 'maxChars', 'order']);

// Terms that must NEVER appear in question data or in anything shipped to the participant.
const FORBIDDEN_TOKENS = ['FCI', 'rubric', 'dimension', 'weight', 'تداوم مسیر'];

export function runAllUnitTests(): { allPassed: boolean; results: TestResult[] } {
  const results: TestResult[] = [];
  const check = (name: string, passed: boolean, message = '') =>
    results.push({ name, passed, message: passed ? 'OK' : message || 'FAILED' });

  // --- countChars -----------------------------------------------------------
  check('countChars: empty string', countChars('').count === 0);
  check('countChars: newlines are excluded', countChars('سلام\nدنیا\r\n').count === countChars('سلامدنیا').count);
  check('countChars: edges are trimmed', countChars('  سلام  ').count === 4);
  check('countChars: whitespace runs collapse to one space', countChars('الف    ب\t\tج').normalized === 'الف ب ج');
  check('countChars: 3+ identical punctuation collapse to one', countChars('خوب!!!!!').normalized === 'خوب!');
  check('countChars: 2 identical punctuation are kept', countChars('خوب..').normalized === 'خوب..');
  check('countChars: Persian question marks collapse', countChars('چرا؟؟؟؟').normalized === 'چرا؟');
  const long = 'الف '.repeat(200);
  check(
    'clipToMaxChars never exceeds the cap',
    countChars(clipToMaxChars(long, 50)).count <= 50,
    `got ${countChars(clipToMaxChars(long, 50)).count}`
  );
  check('clipToMaxChars keeps short text untouched', clipToMaxChars('کوتاه', 50) === 'کوتاه');

  // --- question bank / no-leak ---------------------------------------------
  check('Question count is exactly 12', QUESTIONS.length === 12, `got ${QUESTIONS.length}`);
  QUESTIONS.forEach((q, idx) => {
    const extra = Object.keys(q).filter((k) => !ALLOWED_QUESTION_KEYS.has(k));
    check(`${q.id}: only allowed keys`, extra.length === 0, `extra keys: ${extra.join(', ')}`);
    check(`${q.id}: order matches index+1`, q.order === idx + 1, `expected ${idx + 1}, got ${q.order}`);
    check(`${q.id}: 0 < minChars < maxChars`, q.minChars > 0 && q.maxChars > q.minChars);
  });

  const shipped = JSON.stringify({ QUESTIONS, UI_STRINGS, CONSENT_TEXT }).toLowerCase();
  FORBIDDEN_TOKENS.forEach((token) => {
    check(`No forbidden token "${token}" in client content`, !shipped.includes(token.toLowerCase()));
  });

  return { allPassed: results.every((r) => r.passed), results };
}
