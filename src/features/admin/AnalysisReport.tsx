import React from 'react';
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { AnalysisResult } from '../../types';
import { UI_STRINGS } from '../../content/ui.fa';
import { QUESTIONS } from '../../questions';
import { toPersianDigits } from '../../utils/number';
import { Button } from '../../components/Button';

const t = UI_STRINGS.admin;

const fmt = (n: number | null) => (n === null ? '—' : toPersianDigits(Number.isInteger(n) ? n : n.toFixed(1)));

interface Props {
  result: AnalysisResult;
  versions: number;
  busy: boolean;
  onRerun: () => void;
  onExport: () => void;
}

/** Renders the server-provided report. No indicator names, weights or levels are hardcoded in the client. */
export const AnalysisReport: React.FC<Props> = ({ result, versions, busy, onRerun, onExport }) => {
  const r = result.report;
  const sections: [string, string | undefined][] = r
    ? [
        [t.reportSummary, r.summary],
        [t.reportMotivation, r.motivation_sources],
        [t.reportMeaning, r.meaning_source],
        [t.reportBarrier, r.main_barrier],
        [t.reportGrowth, r.growth_path],
        [t.reportAlignment, r.alignment],
        [t.reportFuture, r.future_connection],
      ].filter(([, text]) => !!text) as [string, string][]
    : [];
  const qText = new Map(QUESTIONS.map((q) => [q.id, q.order]));

  return (
    <div className="space-y-5">
      <p className="inline-block rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-200">{result.methodText}</p>
      <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{t.reportCaution}</p>

      {/* Composite */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4">
        <div className="text-4xl font-extrabold text-slate-900 dark:text-amber-100 tabular-nums">{fmt(result.composite.score)}</div>
        <div className="space-y-0.5">
          <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{result.composite.title}</div>
          <div className="text-sm text-slate-700 dark:text-slate-200">{result.composite.levelTitle ?? t.reportInsufficient}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{t.reportInterpretive}</div>
        </div>
      </div>

      {result.status !== 'ok' && <p role="alert" className="text-sm font-medium text-rose-500">{result.statusText}</p>}

      {r ? (
        <div className="space-y-3">
          {sections.map(([label, text]) => (
            <div key={label}>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</div>
              <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed">{text}</p>
            </div>
          ))}
          {r.conversation_topics.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{t.reportTopics}</div>
              <ul className="list-disc list-inside text-sm text-slate-800 dark:text-slate-100 space-y-0.5">
                {r.conversation_topics.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </div>
          )}
        </div>
      ) : (
        result.status === 'ok' && result.method === 'ai' && <p className="text-sm text-slate-500">{t.reportNoText}</p>
      )}

      {/* Indicators */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-amber-100">{t.reportIndicators}</h3>
        {result.indicators.map((i) => (
          <div key={i.code} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-800 dark:text-slate-100">{i.title}</span>
              <span className="tabular-nums text-slate-600 dark:text-slate-300">
                {fmt(i.score)} <span className="text-[11px] text-slate-400">({toPersianDigits(i.itemCount)} {t.reportItems})</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-500" style={{ width: `${i.score ?? 0}%` }} />
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
              {i.evidence.map((e) => (
                <li key={e.questionId}>
                  {toPersianDigits(qText.get(e.questionId) ?? '')}: {e.text}{' '}
                  <span className="text-slate-400">({toPersianDigits(e.score)}/۴ · {t.reportConfidence} {toPersianDigits(Math.round(e.confidence * 100))}٪)</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Flags */}
      {(result.flags.length > 0 || result.questions.some((q) => q.signals.length > 0 || !q.usable)) && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-amber-100">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            {t.reportFlags}
          </h3>
          <ul className="text-xs text-slate-700 dark:text-slate-200 space-y-0.5 list-disc list-inside">
            {result.flags.map((f, i) => <li key={`f${i}`}>{f}</li>)}
            {result.questions.filter((q) => !q.usable).map((q) => (
              <li key={q.questionId}>{toPersianDigits(qText.get(q.questionId) ?? '')}: {q.flagText}</li>
            ))}
          </ul>
          {result.questions.some((q) => q.signals.length > 0) && (
            <>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t.reportSignals}</div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5 list-disc list-inside">
                {result.questions.filter((q) => q.signals.length > 0).map((q) => (
                  <li key={q.questionId}>{toPersianDigits(qText.get(q.questionId) ?? '')}: {q.signals.join('، ')}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {/* Per-question ratings */}
      <details className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
        <summary className="cursor-pointer text-sm font-bold text-slate-900 dark:text-amber-100">{t.reportQuestions}</summary>
        <ul className="mt-2 space-y-2 text-xs text-slate-700 dark:text-slate-200">
          {result.questions.map((q) => (
            <li key={q.questionId}>
              <strong>{toPersianDigits(qText.get(q.questionId) ?? '')}</strong>{' '}
              {q.usable ? q.ratings.map((x) => `${x.title}: ${toPersianDigits(x.score)}/۴`).join(' · ') : q.flagText}
            </li>
          ))}
        </ul>
      </details>

      <p className="text-[11px] text-slate-500 dark:text-slate-400" dir="ltr">
        {t.reportMeta} {result.version} · {result.method} · {result.model} · {new Date(result.createdAt).toLocaleString('fa-IR')} · {t.reportVersions}: {versions}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={onExport} leftIcon={<Download className="w-3.5 h-3.5" />}>
          {t.exportReport}
        </Button>
        <Button variant="outline" size="sm" onClick={onRerun} isLoading={busy} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          {t.rerun}
        </Button>
      </div>
    </div>
  );
};
