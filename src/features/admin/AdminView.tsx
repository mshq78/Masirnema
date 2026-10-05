import React, { useMemo, useState } from 'react';
import { Lock, FileJson, FileSpreadsheet, ShieldCheck, Search, RefreshCw, Eye, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import { Participant, SessionRecord } from '../../types';
import { ParticipantsPanel } from './ParticipantsPanel';
import { QUESTIONS } from '../../questions';
import { UI_STRINGS } from '../../content/ui.fa';
import { toPersianDigits, toEnglishDigits, formatSeconds } from '../../utils/number';
import { runAllUnitTests, TestResult } from '../../test/unitTests';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';

const t = UI_STRINGS.admin;

const totalActiveMs = (s: SessionRecord) => s.answers.reduce((sum, a) => sum + (a.clientMeta?.activeTimeMs ?? 0), 0);
const totalPastes = (s: SessionRecord) => s.answers.reduce((sum, a) => sum + (a.clientMeta?.pasteEvents ?? 0), 0);
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : toPersianDigits(d.toLocaleString('fa-IR'));
};

/** Neutralises spreadsheet formula injection and quotes the value for CSV. */
function csvCell(value: string | number): string {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function download(content: string, mime: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const AdminView: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tab, setTab] = useState<'sessions' | 'participants'>('participants');
  const [selected, setSelected] = useState<SessionRecord | null>(null);
  const [search, setSearch] = useState('');
  const [testResults, setTestResults] = useState<{ allPassed: boolean; results: TestResult[] } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const result = await api.listSessionsAdmin(passwordInput);
    setIsLoggingIn(false);
    if (result.status === 'ok') {
      setAdminPassword(passwordInput);
      setSessions(result.sessions);
      setParticipants((await api.listParticipants(passwordInput)) ?? []);
      setIsAuthenticated(true);
      setLoginMessage('');
    } else {
      setLoginMessage(
        result.status === 'unconfigured'
          ? t.passwordNotConfigured
          : result.status === 'unavailable'
          ? t.backendUnavailable
          : t.invalidPassword
      );
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const result = await api.listSessionsAdmin(adminPassword);
    if (result.status === 'ok') setSessions(result.sessions);
    setParticipants((await api.listParticipants(adminPassword)) ?? participants);
    setIsRefreshing(false);
  };

  const reloadParticipants = async () => {
    const list = await api.listParticipants(adminPassword);
    if (list) setParticipants(list);
  };

  const nameByMobile = useMemo(
    () => new Map(participants.map((p) => [p.mobile, `${p.firstName} ${p.lastName}`])),
    [participants]
  );

  const day = () => new Date().toISOString().slice(0, 10);

  const handleExportJSON = () =>
    download(JSON.stringify(sessions, null, 2), 'application/json', `masirnama_sessions_${day()}.json`);

  const handleExportCSV = () => {
    if (sessions.length === 0) return;
    const headers = [
      'SessionID', 'Name', 'Mobile', 'StartedAt', 'FinishedAt', 'QuestionSetVersion', 'ConsentVersion',
      ...QUESTIONS.flatMap((q) => [`${q.id}_Text`, `${q.id}_ActiveSec`, `${q.id}_PasteEvents`, `${q.id}_PastedChars`, `${q.id}_Edits`]),
    ];
    const rows = sessions.map((s) => {
      const byId = new Map(s.answers.map((a) => [a.questionId, a]));
      return [
        s.sessionId, nameByMobile.get(s.participantMobile) ?? '', s.participantMobile, s.startedAt, s.finishedAt, s.questionSetVersion, s.consentVersion,
        ...QUESTIONS.flatMap((q) => {
          const a = byId.get(q.id);
          return [
            a?.text ?? '',
            a ? Math.round(a.clientMeta.activeTimeMs / 1000) : '',
            a?.clientMeta.pasteEvents ?? '',
            a?.clientMeta.pastedChars ?? '',
            a?.clientMeta.editCount ?? '',
          ];
        }),
      ].map(csvCell).join(',');
    });
    download('﻿' + [headers.map(csvCell).join(','), ...rows].join('\n'), 'text/csv;charset=utf-8;', `masirnama_sessions_${day()}.csv`);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? sessions.filter((s) => s.sessionId.toLowerCase().includes(q) || (s.participantMobile ?? '').includes(toEnglishDigits(q)) || (nameByMobile.get(s.participantMobile) ?? '').toLowerCase().includes(q))
      : sessions;
  }, [sessions, search]);

  const avgActiveMs = sessions.length ? sessions.reduce((sum, s) => sum + totalActiveMs(s), 0) / sessions.length : 0;
  const pasteSessions = sessions.filter((s) => totalPastes(s) > 0).length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 dark:bg-amber-500 text-amber-300 dark:text-slate-950 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t.loginTitle}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.loginSubtitle}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-pwd" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.passwordLabel}
              </label>
              <input
                id="admin-pwd"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder={t.passwordPlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-left"
                dir="ltr"
              />
              {loginMessage && (
                <p role="alert" className="text-xs text-rose-500 mt-1 font-medium">
                  {loginMessage}
                </p>
              )}
            </div>
            <Button type="submit" variant="primary" size="md" className="w-full" isLoading={isLoggingIn} disabled={!passwordInput}>
              {t.loginButton}
            </Button>
            <a href="#/" className="block text-center text-xs text-slate-500 dark:text-slate-400 hover:text-amber-600">
              {UI_STRINGS.common.backToApp}
            </a>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-900 dark:text-amber-100">
          <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          {t.title}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} isLoading={isRefreshing} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            {t.refresh}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON} disabled={!sessions.length} leftIcon={<FileJson className="w-3.5 h-3.5" />}>
            {t.exportJson}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!sessions.length} leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}>
            {t.exportCsv}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setTestResults(runAllUnitTests())}>
            {t.runTests}
          </Button>
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">{t.privacyNote}</p>

      <div role="tablist" className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {(['participants', 'sessions'] as const).map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-bold -mb-px border-b-2 cursor-pointer transition ${
              tab === id
                ? 'border-amber-500 text-slate-900 dark:text-amber-100'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {id === 'sessions' ? t.tabSessions : t.tabParticipants}
          </button>
        ))}
      </div>

      {tab === 'participants' && (
        <ParticipantsPanel adminPassword={adminPassword} participants={participants} onChanged={reloadParticipants} />
      )}

      {tab === 'sessions' && (
        <>
      {testResults && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
          <p className={`flex items-center gap-2 text-sm font-bold ${testResults.allPassed ? 'text-slate-800 dark:text-slate-100' : 'text-amber-700 dark:text-amber-300'}`}>
            {testResults.allPassed ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {testResults.allPassed ? t.allPassed : t.someFailed}
          </p>
          <ul className="max-h-48 overflow-y-auto text-xs space-y-1 text-slate-600 dark:text-slate-300" dir="ltr">
            {testResults.results.map((r, i) => (
              <li key={i}>
                {r.passed ? '✓' : '✗'} {r.name}
                {!r.passed && ` — ${r.message}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t.totalSessions, value: toPersianDigits(sessions.length) },
          { label: t.avgActiveTime, value: sessions.length ? formatSeconds(avgActiveMs) : '—' },
          { label: t.pasteSessions, value: toPersianDigits(pasteSessions) },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-center">
            <div className="text-lg font-extrabold text-slate-900 dark:text-amber-100">{card.value}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchPlaceholder}
          className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-10">{t.noSessions}</p>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-right">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">{t.colFinished}</th>
                <th className="px-3 py-2 font-medium">{t.colName}</th>
                <th className="px-3 py-2 font-medium">{t.colMobile}</th>
                <th className="px-3 py-2 font-medium">{t.colTime}</th>
                <th className="px-3 py-2 font-medium">{t.colPaste}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.sessionId} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(s.finishedAt)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{nameByMobile.get(s.participantMobile) ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-[11px]" dir="ltr">{s.participantMobile}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatSeconds(totalActiveMs(s))}</td>
                  <td className="px-3 py-2">{toPersianDigits(totalPastes(s))}</td>
                  <td className="px-3 py-2 text-left">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(s)} leftIcon={<Eye className="w-3.5 h-3.5" />}>
                      {t.view}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

        </>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={t.detailTitle} maxWidth="xl">
        {selected && (
          <div className="space-y-4">
            <p className="text-[11px] text-slate-500 dark:text-slate-400" dir="ltr">
              {nameByMobile.get(selected.participantMobile) ?? ''} {selected.participantMobile} · {selected.sessionId}
            </p>
            {QUESTIONS.map((q) => {
              const a = selected.answers.find((x) => x.questionId === q.id);
              return (
                <article key={q.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {toPersianDigits(q.order)}. {q.text}
                  </h3>
                  <p className="text-sm whitespace-pre-wrap break-words text-slate-700 dark:text-slate-200">{a?.text ?? '—'}</p>
                  {a && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t.activeTime}: {formatSeconds(a.clientMeta.activeTimeMs)} · {t.pasteEvents}: {toPersianDigits(a.clientMeta.pasteEvents)} · {t.pastedChars}: {toPersianDigits(a.clientMeta.pastedChars)} · {t.edits}: {toPersianDigits(a.clientMeta.editCount)}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
};
