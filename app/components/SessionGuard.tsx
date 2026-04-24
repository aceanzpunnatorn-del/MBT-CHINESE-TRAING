'use client';

import React from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { getUserSession, hasRequiredRole, type SessionRole } from '@/lib/session';

type Props = {
  children: React.ReactNode;
  redirectTo: string;
  requireLearningMode?: boolean;
  allowedRoles?: SessionRole[];
  loadingLabel?: string;
};

type GuardState = 'checking' | 'ready' | 'redirecting';

export function SessionGuard({
  children,
  redirectTo,
  requireLearningMode = false,
  allowedRoles,
  loadingLabel = 'Checking access...',
}: Props) {
  const router = useRouter();
  const [status, setStatus] = React.useState<GuardState>('checking');
  const [message, setMessage] = React.useState(loadingLabel);

  React.useEffect(() => {
    const session = getUserSession();

    if (!session) {
      setStatus('redirecting');
      setMessage('No active session found. Redirecting to sign in...');
      router.replace(redirectTo);
      window.setTimeout(() => window.location.replace(redirectTo), 150);
      return;
    }

    if (allowedRoles && !hasRequiredRole(session, allowedRoles)) {
      setStatus('redirecting');
      setMessage('Your account does not have permission for this page. Redirecting...');
      router.replace(redirectTo);
      window.setTimeout(() => window.location.replace(redirectTo), 150);
      return;
    }

    if (requireLearningMode) {
      const learningMode = window.localStorage.getItem('midea-learning-mode');
      if (!learningMode) {
        setStatus('redirecting');
        setMessage('Learning mode is not selected yet. Redirecting...');
        router.replace('/learn');
        window.setTimeout(() => window.location.replace('/learn'), 150);
        return;
      }
    }

    setStatus('ready');
  }, [allowedRoles, redirectTo, requireLearningMode, router]);

  if (status === 'ready') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0C2742] px-4 py-8 text-white">
      <div className="w-full max-w-md rounded-[28px] border border-white/15 bg-white/10 p-6 text-center shadow-[0_24px_80px_rgba(6,33,59,0.22)] backdrop-blur-2xl">
        <div className="mx-auto inline-flex rounded-2xl bg-white/10 p-3">
          {status === 'redirecting' ? (
            <ShieldAlert className="h-8 w-8 text-amber-200" />
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-cyan-100" />
          )}
        </div>
        <p className="mt-4 text-base font-semibold">
          {status === 'redirecting' ? 'Redirecting' : 'Loading'}
        </p>
        <p className="mt-2 text-sm leading-6 text-white/75">{message}</p>
      </div>
    </div>
  );
}
