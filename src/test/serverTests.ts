import { QUESTIONS } from '../questions';
import {
  CODES, COMPOSITE_WEIGHTS, QUESTION_SPECS, Code, QuestionRating, AnswerInput,
  buildResult, compositeLevel, repeatedAnswerQuestions, behaviourSignals,
} from '../../api/analysis';
import type { TestResult } from './unitTests';
import { UI_STRINGS, CONSENT_TEXT } from '../content/ui.fa';
import { INDICATORS } from '../../api/analysis';

// Terms that must NEVER reach the participant-facing client. Kept here (Node-only) so this list is not bundled either.
const FORBIDDEN_TOKENS = ['FCI', 'rubric', 'dimension', 'weight', 'تداوم مسیر'];

/** Server-side analysis rules (Node only — never imported by the browser bundle). */
export function runServerTests(): { allPassed: boolean; results: TestResult[] } {
  const results: TestResult[] = [];
  const check = (name: string, passed: boolean, message = '') =>
    results.push({ name, passed, message: passed ? 'OK' : message || 'FAILED' });

  const distinct = [
    'وقتی مشتری از نتیجه کار راضی بود و تیم جشن کوچکی گرفت', 'سراغ یادگیری یک ابزار تحلیل داده می‌روم', 'گزارش‌های ماهانه را دقیق بازبینی می‌کنم',
    'ارتباط بین واحدها ضعیف می‌شود و کارها دیر انجام می‌شود', 'مدیر یک تیم کوچک شده باشم', 'تصمیم‌ها خیلی کند گرفته می‌شود',
    'پروژه نوسازی انبار با مشارکت من به پایان رسیده باشد', 'اینجا فرصت آزمایش ایده جدید وجود دارد', 'آزادی عمل و امکان یادگیری مهم‌ترین عامل است',
    'به عنوان متخصص بهینه‌سازی فرایندها شناخته شوم', 'نبود شنیده شدن صدای کارکنان', 'دوره‌ای که مهارت رهبری را یاد گرفتم',
  ];
  const answers: AnswerInput[] = QUESTION_SPECS.map((q, i) => ({ questionId: q.id, text: distinct[i], clientMeta: { activeTimeMs: 60000 } }));
  const rateAll = (score: number | ((q: string, c: Code) => number), unusable: string[] = []): QuestionRating[] =>
    QUESTION_SPECS.map((q) =>
      unusable.includes(q.id)
        ? { questionId: q.id, usable: false, flag: 'irrelevant', ratings: [] }
        : {
            questionId: q.id, usable: true, flag: 'ok',
            ratings: (Object.keys(q.weights) as Code[]).map((c) => ({
              code: c, score: typeof score === 'number' ? score : score(q.id, c), evidence: 'شاهد', confidence: 0.9,
            })),
          }
    );
  const meta = { model: 'test', createdAt: '2026-01-01T00:00:00Z' };

  // --- confidentiality: nothing about the indicators in client-visible content ---
  const shipped = JSON.stringify({ QUESTIONS, UI_STRINGS, CONSENT_TEXT }).toLowerCase();
  FORBIDDEN_TOKENS.forEach((tok) => check(`No forbidden token "${tok}" in client content`, !shipped.includes(tok.toLowerCase())));
  Object.values(INDICATORS).forEach((i) => check(`Indicator title "${i.title}" is not in client content`, !shipped.includes(i.title.toLowerCase())));

  // --- instrument definition vs the content spec ---
  check('12 question specs match src/questions.ts texts', QUESTION_SPECS.length === 12 && QUESTION_SPECS.every((q, i) => q.text === QUESTIONS[i].text && q.id === QUESTIONS[i].id));
  check('composite weights sum to 1', Math.abs(Object.values(COMPOSITE_WEIGHTS).reduce((a, b) => a! + b!, 0)! - 1) < 1e-9);
  check('every indicator is linked to at least 2 questions', CODES.every((c) => QUESTION_SPECS.filter((q) => q.weights[c]).length >= 2));
  const w = (id: string) => JSON.stringify(QUESTION_SPECS.find((q) => q.id === id)!.weights);
  check('Q07 weights A2 F2 M1 O1', w('Q07') === JSON.stringify({ A: 2, F: 2, M: 1, O: 1 }));
  check('Q12 weights F2 G2 A2 M1', w('Q12') === JSON.stringify({ F: 2, G: 2, A: 2, M: 1 }));

  // --- scoring formula ---
  const all4 = buildResult(answers, rateAll(4), meta);
  check('all 4 → every indicator 100 and composite 100', all4.indicators.every((i) => i.score === 100) && all4.composite.score === 100);
  const all2 = buildResult(answers, rateAll(2), meta);
  check('all 2 → every indicator 50, composite 50 (fragile)', all2.indicators.every((i) => i.score === 50) && all2.composite.score === 50 && all2.composite.levelCode === 'fragile');
  const all3 = buildResult(answers, rateAll(3), meta);
  check('all 3 → 75 each, composite 75 (conditional)', all3.composite.score === 75 && all3.composite.levelCode === 'conditional');
  // E appears in Q1(w2) Q2(w2) Q5(w1) Q6(w1) Q11(w1): scores 4,0,2,4,0 → (8+0+2+4+0)/(4*7)=14/28=50
  const mixed = buildResult(answers, rateAll((q, c) => (c === 'E' ? ({ Q01: 4, Q02: 0, Q05: 2, Q06: 4, Q11: 0 } as Record<string, number>)[q] : 4)), meta);
  check('indicator formula Σ(score×weight)÷(4×Σweight)×100', mixed.indicators.find((i) => i.code === 'E')!.score === 50, `got ${mixed.indicators.find((i) => i.code === 'E')!.score}`);
  const expectedFci = 0.1 * 50 + 0.15 * 100 + 0.15 * 100 + 0.25 * 100 + 0.35 * 100;
  check('composite = E×.10 + M×.15 + G×.15 + A×.25 + F×.35', mixed.composite.score === expectedFci, `got ${mixed.composite.score}, expected ${expectedFci}`);

  // --- composite level boundaries ---
  check('level boundaries 80/65/50', compositeLevel(80).code === 'strong' && compositeLevel(79.9).code === 'conditional' && compositeLevel(65).code === 'conditional' && compositeLevel(64.9).code === 'fragile' && compositeLevel(50).code === 'fragile' && compositeLevel(49.9).code === 'gap');

  // --- quality control ---
  const two = buildResult(answers, rateAll(3, ['Q01', 'Q02']), meta);
  check('2 unscorable questions → still scored, excluded from formulas', two.status === 'ok' && two.composite.score === 75 && two.questions.filter((q) => !q.usable).length === 2);
  const three = buildResult(answers, rateAll(3, ['Q01', 'Q02', 'Q03']), meta);
  check('more than 2 unscorable → insufficient data, no scores', three.status === 'insufficient_data' && three.composite.score === null && three.indicators.every((i) => i.score === null));
  const rep = QUESTION_SPECS.map((q) => ({ questionId: q.id, text: 'من همیشه دوست دارم رشد کنم و مهارت‌های جدید یاد بگیرم' }));
  check('near-identical answers in >3 questions are flagged for human review', repeatedAnswerQuestions(rep).length === 12 && buildResult(rep, rateAll(3), meta).flags.some((f) => f.includes('تکراری')));
  check('distinct answers are not flagged as repetition', repeatedAnswerQuestions(answers).length === 0);
  check('behaviour signals (fast / paste / edits) never affect scores', buildResult(answers.map((a) => ({ ...a, clientMeta: { activeTimeMs: 1000, pastedChars: 500, editCount: 9 } })), rateAll(3), meta).composite.score === 75
    && behaviourSignals({ questionId: 'Q01', text: 'x'.repeat(100), clientMeta: { activeTimeMs: 1000, pastedChars: 100, editCount: 9 } }).length === 3);
  const thin = buildResult(answers, rateAll(3, ['Q03', 'Q04', 'Q01']).map((r) => r), meta);
  check('thin evidence is flagged per indicator', thin.status === 'insufficient_data' || thin.indicators.some((i) => i.thinEvidence));

  return { allPassed: results.every((r) => r.passed), results };
}
