'use client';

import Link from 'next/link';
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { getErrorMessage, logError } from '@/lib/logger';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    logError('app.error', error, { digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0C2742] px-4 py-8 text-white">
      <div className="w-full max-w-xl rounded-[28px] border border-white/15 bg-white/10 p-6 shadow-[0_24px_80px_rgba(6,33,59,0.22)] backdrop-blur-2xl">
        <div className="inline-flex rounded-2xl bg-rose-500/20 p-3 text-rose-100">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Something interrupted the session</h1>
        <p className="mt-2 text-sm leading-6 text-white/75">
          {getErrorMessage(error, 'The page hit an unexpected error.')}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2EA7E0] px-5 text-sm font-semibold text-white hover:bg-[#1D8FC7]"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-medium text-white hover:bg-white/15"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
