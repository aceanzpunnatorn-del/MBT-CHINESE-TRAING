'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Globe2, Languages, Loader2, ShieldCheck } from 'lucide-react';
import { getUserSession, refreshUserSession } from '@/lib/session';

export default function LearnModePage() {
  const [mode, setMode] = useState<'thai' | 'chinese'>('thai');
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

  const handleStart = () => {
    localStorage.setItem('midea-learning-mode', mode);
    localStorage.setItem('midea-app-mode', 'flashcards');
    window.location.href = '/study';
  };

  if (!ready) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#DFF3FF]">
        <div className="absolute inset-0">
          <img src="/midea-building.png" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,24,44,0.88)_0%,rgba(10,58,100,0.78)_45%,rgba(17,92,151,0.72)_75%,rgba(223,243,255,0.95)_100%)]" />
        </div>

        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
          <div className="rounded-[28px] border border-white/20 bg-white/10 px-6 py-8 text-center text-white shadow-[0_24px_80px_rgba(6,33,59,0.22)] backdrop-blur-2xl">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-100" />
            <p className="mt-4 text-base font-semibold">Checking your learning session...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#DFF3FF]">
      <div className="absolute inset-0">
        <img src="/midea-building.png" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,24,44,0.88)_0%,rgba(10,58,100,0.78)_45%,rgba(17,92,151,0.72)_75%,rgba(223,243,255,0.95)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
        <div className="mb-6 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
            <ShieldCheck className="h-3 w-3" />
            Learning Mode
          </div>

          <h1 className="mt-4 text-3xl font-bold">Choose your learning direction</h1>
          <p className="mt-2 text-sm text-white/70">One tap to start learning</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setMode('thai')}
            className={`w-full rounded-[28px] p-5 text-left transition ${
              mode === 'thai'
                ? 'border border-sky-300 bg-sky-400/25 shadow-[0_10px_30px_rgba(56,189,248,0.3)]'
                : 'border border-white/20 bg-white/10'
            }`}
          >
            <div className="flex items-center gap-4 text-white">
              <div className="rounded-xl bg-white/20 p-3">
                <Languages />
              </div>

              <div className="flex-1">
                <div className="flex justify-between gap-3">
                  <h2 className="text-lg font-semibold">Thai to Chinese</h2>
                  {mode === 'thai' ? (
                    <span className="rounded-full bg-sky-400 px-2 py-1 text-xs text-black">
                      Active
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 text-sm text-white/70">For Thai staff learning Chinese</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setMode('chinese')}
            className={`w-full rounded-[28px] p-5 text-left transition ${
              mode === 'chinese'
                ? 'border border-cyan-300 bg-cyan-400/25 shadow-[0_10px_30px_rgba(34,211,238,0.3)]'
                : 'border border-white/20 bg-white/10'
            }`}
          >
            <div className="flex items-center gap-4 text-white">
              <div className="rounded-xl bg-white/20 p-3">
                <Globe2 />
              </div>

              <div className="flex-1">
                <div className="flex justify-between gap-3">
                  <h2 className="text-lg font-semibold">Chinese to Thai</h2>
                  {mode === 'chinese' ? (
                    <span className="rounded-full bg-cyan-400 px-2 py-1 text-xs text-black">
                      Active
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 text-sm text-white/70">For Chinese staff learning Thai</p>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-auto pt-6">
          <button
            onClick={handleStart}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 text-base font-semibold text-white shadow-[0_12px_30px_rgba(14,165,233,0.35)] active:scale-[0.98]"
          >
            Start Learning
            <ArrowRight />
          </button>
        </div>
      </div>
    </main>
  );
}
