import React, { useMemo, useState } from 'react';
import { ManualFormSpec, ManualQuestionRating, SessionRecord } from '../../types';
import { QUESTIONS } from '../../questions';
import { UI_STRINGS } from '../../content/ui.fa';
import { toPersianDigits } from '../../utils/number';
import { Button } from '../../components/Button';

const t = UI_STRINGS.admin;
type Reason = 'irrelevant' | 'too_vague' | 'nonsense';

interface QState {
  unusable: boolean;
  reason: Reason;
  scores: Record<string, number | undefined>;
  evidence: Record<string, string>;
}

interface Props {
  session: SessionRecord;
  form: ManualFormSpec;
  busy: boolean;
  error: string;
  onSubmit: (ratings: ManualQuestionRating[], note: string) => void;
}

/** Analyst rating form. Indicators, anchors and the scale text all come from the server. */
export const ManualRating: React.FC<Props> = ({ session, form, busy, error, onSubmit }) => {
  const [state, setState] = useState<Record<string, QState>>(() =>
    Object.fromEntries(form.questions.map((q) => [q.questionId, { unusable: false, reason: 'irrelevant' as Reason, scores: {}, evidence: {} }]))
  );
  const [note, setNote] = useState('');
  const [incomplete, setIncomplete] = useState(false);

  const answerOf = useMemo(() => new Map(session.answers.map((a) => [a.questionId, a.text])), [session]);
  const orderOf = useMemo(() => new Map(QUESTIONS.map((q) => [q.id, q])), []);

  const patch = (id: string, p: Partial<QState>) => setState((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }));

  const applySuggestion = () =>
    setState((prev) => {
      const next = { ...prev };
      for (const s of form.suggested) {
        if (!next[s.questionId]) continue;
        next[s.questionId] = s.usable
          ? { unusable: false, reason: 'irrelevant', scores: Object.fromEntries(s.ratings.map((r) => [r.code, r.score])), evidence: Object.fromEntries(s.ratings.map((r) => [r.code, r.evidence])) }
          : { ...next[s.questionId], unusable: true, reason: (['irrelevant', 'too_vague', 'nonsense'].includes(s.flag) ? s.flag : 'irrelevant') as Reason };
      }
      return next;
    });

  const submit = () => {
    const ratings: ManualQuestionRating[] = [];
    for (const q of form.questions) {
      const st = state[q.questionId];
      if (st.unusable) {
        ratings.push({ questionId: q.questionId, usable: false, flag: st.reason, ratings: [] });
        continue;
      }
      if (q.indicators.some((i) => st.scores[i.code] === undefined)) return setIncomplete(true);
      ratings.push({
        questionId: q.questionId,
        usable: true,
        ratings: q.indicators.map((i) => ({ code: i.code, score: st.scores[i.code]!, evidence: st.evidence[i.code] ?? '' })),
      });
    }
    setIncomplete(false);
    onSubmit(ratings, note);
  };

  return (
    <div className="space-y-5">
      <details className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
        <summary className="cursor-pointer text-sm font-bold text-slate-900 dark:text-amber-100">{t.manualScale}</summary>
        <p className="mt-2 text-xs whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-200">{form.scale}</p>
      </details>

      <Button variant="outline" size="sm" onClick={applySuggestion}>{t.manualApplySuggestion}</Button>

      {form.questions.map((q) => {
        const st = state[q.questionId];
        const meta = orderOf.get(q.questionId);
        return (
          <article key={q.questionId} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-amber-100">{toPersianDigits(meta?.order ?? '')}. {meta?.text}</h3>
            <p className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-sm whitespace-pre-wrap break-words text-slate-800 dark:text-slate-100" aria-label={t.manualAnswer}>
              {answerOf.get(q.questionId)}
            </p>

            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={st.unusable} onChange={(e) => patch(q.questionId, { unusable: e.target.checked })} className="accent-amber-500" />
              {t.manualUnusable}
              {st.unusable && (
                <select
                  aria-label={t.manualReason}
                  value={st.reason}
                  onChange={(e) => patch(q.questionId, { reason: e.target.value as Reason })}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                >
                  {(Object.keys(t.manualReasons) as Reason[]).map((k) => <option key={k} value={k}>{t.manualReasons[k]}</option>)}
                </select>
              )}
            </label>

            {!st.unusable &&
              q.indicators.map((i) => (
                <fieldset key={i.code} className="space-y-1">
                  <legend className="text-xs font-bold text-slate-800 dark:text-slate-100">{i.title}</legend>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{i.anchors}</p>
                  <div className="flex items-center gap-3">
                    {[0, 1, 2, 3, 4].map((n) => (
                      <label key={n} className="flex items-center gap-1 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name={`${q.questionId}-${i.code}`}
                          checked={st.scores[i.code] === n}
                          onChange={() => patch(q.questionId, { scores: { ...st.scores, [i.code]: n } })}
                          className="accent-amber-500"
                        />
                        {toPersianDigits(n)}
                      </label>
                    ))}
                    <input
                      aria-label={t.manualEvidence}
                      placeholder={t.manualEvidence}
                      value={st.evidence[i.code] ?? ''}
                      onChange={(e) => patch(q.questionId, { evidence: { ...st.evidence, [i.code]: e.target.value } })}
                      className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
                    />
                  </div>
                </fieldset>
              ))}
          </article>
        );
      })}

      <textarea
        aria-label={t.manualNote}
        placeholder={t.manualNote}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm"
      />

      {incomplete && <p role="alert" className="text-xs text-rose-500 font-medium">{t.manualIncomplete}</p>}
      {error && <p role="alert" className="text-xs text-rose-500 font-medium">{error}</p>}
      <Button variant="primary" size="md" isLoading={busy} onClick={submit}>{t.manualSubmit}</Button>
    </div>
  );
};
