import React, { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SurveyProvider, useSurvey } from './context/SurveyContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageShell } from './components/PageShell';
import { LoadingSkeleton } from './components/StateViews';
import { QUESTIONS } from './questions';

import { StartScreen } from './features/start/StartScreen';
import { QuestionRoute } from './features/question/QuestionScreen';
import { ReviewScreen } from './features/review/ReviewScreen';
import { DoneScreen } from './features/done/DoneScreen';

const AdminView = lazy(() =>
  import('./features/admin/AdminView').then((m) => ({ default: m.AdminView }))
);

/** Access control: no results/report routes exist; everything is gated by consent and submission state. */
const Gate: React.FC<{ requireConsent?: boolean; children: React.ReactNode }> = ({ requireConsent, children }) => {
  const { ready, isSubmitted, consentAccepted } = useSurvey();
  if (!ready) return <LoadingSkeleton lines={4} />;
  if (isSubmitted) return <Navigate to="/done" replace />;
  if (requireConsent && !consentAccepted) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const DoneGate: React.FC = () => {
  const { ready, isSubmitted } = useSurvey();
  if (!ready) return <LoadingSkeleton lines={2} />;
  return isSubmitted ? <DoneScreen /> : <Navigate to="/" replace />;
};

const AppRoutes: React.FC = () => {
  const { pathname } = useLocation();
  const questionMatch = pathname.match(/^\/q\/(\d+)$/);
  const stepIndex = questionMatch ? Number(questionMatch[1]) - 1 : 0;

  return (
    <PageShell
      showProgress={!!questionMatch && stepIndex >= 0 && stepIndex < QUESTIONS.length}
      currentStepIndex={stepIndex}
      totalSteps={QUESTIONS.length}
      compactHeader={pathname === '/admin'}
    >
      <Suspense fallback={<LoadingSkeleton lines={5} />}>
        <Routes>
          <Route path="/" element={<Gate><StartScreen /></Gate>} />
          <Route path="/q/:order" element={<Gate requireConsent><QuestionRoute /></Gate>} />
          <Route path="/review" element={<Gate requireConsent><ReviewScreen /></Gate>} />
          <Route path="/done" element={<DoneGate />} />
          <Route path="/admin" element={<AdminView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </PageShell>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <SurveyProvider>
          <AppRoutes />
        </SurveyProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
