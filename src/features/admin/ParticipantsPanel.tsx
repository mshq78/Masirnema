import React, { useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, Trash2, UserPlus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { Participant, ParticipantInput } from '../../types';
import { UI_STRINGS } from '../../content/ui.fa';
import { toPersianDigits } from '../../utils/number';
import { ParsedParticipants } from '../../utils/participants';
import { normalizeIranMobile, normalizeNationalId } from '../../utils/validation';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';

const t = UI_STRINGS.admin;

const inputClass =
  'w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400';

type Notice = { kind: 'ok' | 'error'; text: string } | null;

interface Props {
  adminPassword: string;
  participants: Participant[];
  onChanged: () => Promise<void>;
}

export const ParticipantsPanel: React.FC<Props> = ({ adminPassword, participants, onChanged }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedParticipants | null>(null);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [toRemove, setToRemove] = useState<Participant | null>(null);
  const [single, setSingle] = useState<ParticipantInput>({ firstName: '', lastName: '', mobile: '', nationalId: '' });
  const [singleError, setSingleError] = useState('');

  const submittedCount = useMemo(() => participants.filter((p) => p.submitted).length, [participants]);

  const report = async (input: ParticipantInput[]) => {
    const result = await api.addParticipants(adminPassword, input);
    if (!result) {
      setNotice({ kind: 'error', text: t.addFailed });
      return false;
    }
    await onChanged();
    setNotice({
      kind: 'ok',
      text: `${toPersianDigits(result.added)} نفر ${t.addResult}${
        result.updated ? ` · ${toPersianDigits(result.updated)} نفر ${t.updatedResult}` : ''
      }`,
    });
    return true;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setNotice(null);
    setParsed(null);
    setReading(true);
    try {
      const { readParticipantsFromExcel } = await import('../../utils/excel');
      setParsed(await readParticipantsFromExcel(file));
    } catch (err) {
      console.error(err);
      setNotice({ kind: 'error', text: t.fileError });
    } finally {
      setReading(false);
    }
  };

  const handleImport = async () => {
    if (!parsed || parsed.valid.length === 0) return;
    setBusy(true);
    const ok = await report(parsed.valid.map(({ row: _row, ...p }) => p));
    if (ok) setParsed(null);
    setBusy(false);
  };

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const mobile = normalizeIranMobile(single.mobile);
    const nationalId = normalizeNationalId(single.nationalId);
    if (!single.firstName.trim() || !single.lastName.trim()) return setSingleError(t.reasons.name);
    if (!mobile) return setSingleError(t.reasons.mobile);
    if (!nationalId) return setSingleError(t.reasons.national_id);
    setSingleError('');
    setBusy(true);
    const ok = await report([{ firstName: single.firstName, lastName: single.lastName, mobile, nationalId }]);
    if (ok) setSingle({ firstName: '', lastName: '', mobile: '', nationalId: '' });
    setBusy(false);
  };

  const handleRemove = async () => {
    if (!toRemove) return;
    setBusy(true);
    const ok = await api.deleteParticipant(adminPassword, toRemove.mobile);
    if (ok) await onChanged();
    else setNotice({ kind: 'error', text: t.addFailed });
    setToRemove(null);
    setBusy(false);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: t.participantsCount, value: toPersianDigits(participants.length) },
          { label: t.participantsSubmitted, value: toPersianDigits(submittedCount) },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-center">
            <div className="text-lg font-extrabold text-slate-900 dark:text-amber-100">{c.value}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{c.label}</div>
          </div>
        ))}
      </div>

      {notice && (
        <p
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`flex items-center gap-2 text-sm font-medium ${notice.kind === 'error' ? 'text-rose-500' : 'text-slate-800 dark:text-amber-100'}`}
        >
          {notice.kind === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {notice.text}
        </p>
      )}

      {/* Excel upload */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-amber-100">
          <FileSpreadsheet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          {t.excelTitle}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.excelHint}</p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={handleFile}
          className="hidden"
          aria-label={t.chooseFile}
        />
        <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} isLoading={reading}>
          {t.chooseFile}
        </Button>

        {parsed && parsed.missingColumns.length > 0 && (
          <p role="alert" className="text-xs text-rose-500 font-medium">
            {t.missingColumns} {parsed.missingColumns.map((c) => t.colNames[c]).join('، ')}
          </p>
        )}

        {parsed && parsed.missingColumns.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-800 dark:text-slate-100">
              <strong>{toPersianDigits(parsed.valid.length)}</strong> {t.previewValid}
              {parsed.errors.length > 0 && (
                <>
                  {' · '}
                  <strong className="text-rose-500">{toPersianDigits(parsed.errors.length)}</strong> {t.previewInvalid}
                </>
              )}
            </p>
            {parsed.errors.length > 0 && (
              <ul className="max-h-40 overflow-y-auto text-xs space-y-1 text-rose-500">
                {parsed.errors.map((er) => (
                  <li key={er.row}>
                    {t.row} {toPersianDigits(er.row)}: {t.reasons[er.reason]}
                  </li>
                ))}
              </ul>
            )}
            <Button variant="primary" size="md" onClick={handleImport} isLoading={busy} disabled={parsed.valid.length === 0}>
              {t.addPeople} ({toPersianDigits(parsed.valid.length)})
            </Button>
          </div>
        )}
      </section>

      {/* Single add */}
      <form onSubmit={handleAddSingle} noValidate className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-amber-100">
          <UserPlus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          {t.singleTitle}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input aria-label={t.firstName} placeholder={t.firstName} value={single.firstName} onChange={(e) => setSingle({ ...single, firstName: e.target.value })} className={inputClass} />
          <input aria-label={t.lastName} placeholder={t.lastName} value={single.lastName} onChange={(e) => setSingle({ ...single, lastName: e.target.value })} className={inputClass} />
          <input aria-label={t.mobile} placeholder={t.mobile} inputMode="numeric" dir="ltr" value={single.mobile} onChange={(e) => setSingle({ ...single, mobile: e.target.value })} className={`${inputClass} text-left`} />
          <input aria-label={t.nationalId} placeholder={t.nationalId} inputMode="numeric" dir="ltr" value={single.nationalId} onChange={(e) => setSingle({ ...single, nationalId: e.target.value })} className={`${inputClass} text-left`} />
        </div>
        {singleError && (
          <p role="alert" className="text-xs text-rose-500 font-medium">
            {singleError}
          </p>
        )}
        <Button type="submit" variant="primary" size="md" isLoading={busy}>
          {t.addSingle}
        </Button>
      </form>

      {/* Roster */}
      {participants.length === 0 ? (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-8">{t.noParticipants}</p>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-right">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">{t.colName}</th>
                <th className="px-3 py-2 font-medium">{t.colMobile}</th>
                <th className="px-3 py-2 font-medium">{t.colStatus}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.mobile} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2 whitespace-nowrap">{p.firstName} {p.lastName}</td>
                  <td className="px-3 py-2 font-mono text-[11px]" dir="ltr">{p.mobile}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{p.submitted ? t.statusSubmitted : t.statusPending}</td>
                  <td className="px-3 py-2 text-left">
                    <Button variant="ghost" size="sm" onClick={() => setToRemove(p)} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>
                      {t.remove}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={!!toRemove} onClose={() => !busy && setToRemove(null)} title={t.removeTitle} maxWidth="sm">
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {toRemove && <strong>{toRemove.firstName} {toRemove.lastName}: </strong>}
          {t.removeBody}
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" size="md" disabled={busy} onClick={() => setToRemove(null)}>
            {UI_STRINGS.common.cancel}
          </Button>
          <Button variant="primary" size="md" isLoading={busy} onClick={handleRemove}>
            {t.remove}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
