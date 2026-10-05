import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { Button } from '../../components/Button';
import { useSurvey } from '../../context/SurveyContext';
import { UI_STRINGS } from '../../content/ui.fa';
import { BRAND_CONFIG } from '../../config/brand';
import { normalizeIranMobile, normalizeNationalId } from '../../utils/validation';

const inputClass =
  'w-full px-3.5 py-3 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base focus:outline-none focus:ring-2 focus:ring-amber-400 text-left tracking-wider';

export const LoginScreen: React.FC = () => {
  const { isAuthenticated, login } = useSurvey();
  const [mobile, setMobile] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [showId, setShowId] = useState(false);
  const [errors, setErrors] = useState<{ mobile?: string; nationalId?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const t = UI_STRINGS.login;

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const m = normalizeIranMobile(mobile);
    const n = normalizeNationalId(nationalId);
    const next = { mobile: m ? undefined : t.mobileError, nationalId: n ? undefined : t.nationalIdError };
    setErrors(next);
    if (!m || !n) return;

    setSubmitting(true);
    const status = await login(m, n);
    if (status !== 'ok') {
      setErrors({ form: status === 'invalid' ? t.invalid : status === 'offline' ? t.offline : t.unavailable });
      setSubmitting(false);
    }
    // on success the context flips to authenticated and this screen redirects
  };

  return (
    <div className="w-full flex flex-col items-center gap-5 py-4">
      <header className="w-full flex flex-col items-center text-center gap-3">
        <img src="/logo.png" alt="" aria-hidden="true" className="w-24 h-24 object-contain" />
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-amber-100">
          {BRAND_CONFIG.appTitle}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{BRAND_CONFIG.subtitle}</p>
      </header>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5"
      >
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t.title}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t.subtitle}</p>
        </div>

        <div>
          <label htmlFor="login-mobile" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {t.mobileLabel}
          </label>
          <input
            id="login-mobile"
            type="tel"
            inputMode="numeric"
            autoComplete="username"
            dir="ltr"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder={t.mobilePlaceholder}
            aria-invalid={!!errors.mobile}
            aria-describedby={errors.mobile ? 'login-mobile-err' : undefined}
            className={`${inputClass} ${errors.mobile ? 'border-rose-400' : 'border-slate-300 dark:border-slate-700'}`}
          />
          {errors.mobile && (
            <p id="login-mobile-err" role="alert" className="text-xs text-rose-500 mt-1 font-medium">
              {errors.mobile}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="login-national-id" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {t.nationalIdLabel}
          </label>
          <div className="relative">
            <input
              id="login-national-id"
              type={showId ? 'text' : 'password'}
              inputMode="numeric"
              autoComplete="current-password"
              dir="ltr"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              placeholder={t.nationalIdPlaceholder}
              aria-invalid={!!errors.nationalId}
              aria-describedby={errors.nationalId ? 'login-id-err' : undefined}
              className={`${inputClass} pl-11 ${errors.nationalId ? 'border-rose-400' : 'border-slate-300 dark:border-slate-700'}`}
            />
            <button
              type="button"
              onClick={() => setShowId((v) => !v)}
              aria-label={showId ? t.hidePassword : t.showPassword}
              title={showId ? t.hidePassword : t.showPassword}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              {showId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.nationalId && (
            <p id="login-id-err" role="alert" className="text-xs text-rose-500 mt-1 font-medium">
              {errors.nationalId}
            </p>
          )}
        </div>

        {errors.form && (
          <p role="alert" className="text-xs text-rose-500 font-medium text-center">
            {errors.form}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={submitting}>
          {t.submit}
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 text-center">
          <LockKeyhole className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {t.privacy}
        </p>
      </form>
    </div>
  );
};
