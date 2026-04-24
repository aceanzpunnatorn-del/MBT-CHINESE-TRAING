'use client';

import Link from 'next/link';
import React from 'react';
import { AlertTriangle } from 'lucide-react';

import { getErrorMessage, logError } from '@/lib/logger';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  React.useEffect(() => {
    logError('app.global-error', error, { digest: error.digest });
  }, [error]);

  return (
    <html lang="th">
      <body className="m-0 bg-[#0C2742]">
        <main className="flex min-h-screen items-center justify-center px-4 py-8 text-white">
          <div className="w-full max-w-xl rounded-[28px] border border-white/15 bg-white/10 p-6 shadow-[0_24px_80px_rgba(6,33,59,0.22)] backdrop-blur-2xl">
            <div className="inline-flex rounded-2xl bg-rose-500/20 p-3 text-rose-100">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">Application error</h1>
            <p className="mt-2 text-sm leading-6 text-white/75">
              {getErrorMessage(error, 'A global application error occurred.')}
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#2EA7E0] px-5 text-sm font-semibold text-white hover:bg-[#1D8FC7]"
              >
                Return Home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
