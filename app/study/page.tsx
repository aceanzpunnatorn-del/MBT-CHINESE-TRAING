'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getUserSession, refreshUserSession } from '@/lib/session';

const FlashcardApp = dynamic(() => import('@/app/components/FlashcardApp'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="rounded-[28px] border border-white/15 bg-white/10 px-6 py-8 text-center text-white shadow-[0_24px_80px_rgba(6,33,59,0.22)] backdrop-blur-2xl">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-100" />
        <p className="mt-4 text-base font-semibold">Loading study experience...</p>
        <p className="mt-2 text-sm text-white/75">Preparing flashcards, analytics, and review data.</p>
      </div>
    </div>
  ),
});

export default function StudyPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const session = getUserSession();

    if (!session) {
      window.location.replace('/');
      return;
    }

    void refreshUserSession()
      .then((verifiedSession) => {
        if (cancelled) return;

        if (!verifiedSession) {
          window.location.replace('/');
          return;
        }

        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          window.location.replace('/');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <main className="min-h-screen bg-[#0C2742] px-3 py-3 text-white">
        <div className="mx-auto flex min-h-[70vh] w-full max-w-7xl items-center justify-center">
          <div className="rounded-[28px] border border-white/15 bg-white/10 px-6 py-8 text-center text-white shadow-[0_24px_80px_rgba(6,33,59,0.22)] backdrop-blur-2xl">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-100" />
            <p className="mt-4 text-base font-semibold">Loading study experience...</p>
            <p className="mt-2 text-sm text-white/75">Verifying your session and preparing learning data.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0C2742] px-3 py-3 text-white">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-3">
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        <FlashcardApp />
      </div>
    </main>
  );
}
