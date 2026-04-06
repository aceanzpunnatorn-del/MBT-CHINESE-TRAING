'use client';

import { useState } from 'react';
import { ArrowRight, Globe2, Languages, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LearnModePage() {
  const router = useRouter();
  const [mode, setMode] = useState<'thai' | 'chinese'>('thai');

  const handleStart = () => {
    localStorage.setItem('midea-learning-mode', mode);
    localStorage.setItem('midea-app-mode', 'flashcards');
    router.push('/study');
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="/midea-building.png"
          alt="Midea Building"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(4,21,40,0.88)_0%,rgba(10,76,128,0.76)_40%,rgba(46,167,224,0.46)_72%,rgba(234,247,253,0.92)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.14),transparent_26%),radial-gradient(circle_at_80%_25%,rgba(255,255,255,0.10),transparent_24%),radial-gradient(circle_at_35%_80%,rgba(255,255,255,0.08),transparent_22%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl overflow-hidden rounded-[34px] border border-white/30 bg-white/18 shadow-[0_30px_80px_rgba(15,58,95,0.22)] backdrop-blur-2xl">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.30),rgba(255,255,255,0.16))]" />
          <div className="absolute inset-x-0 top-0 h-[1px] bg-white/60" />

          <div className="relative z-10 p-8 sm:p-10">
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/45 px-4 py-2 text-sm text-[#1D8FC7] backdrop-blur">
                <ShieldCheck className="h-4 w-4" />
                Learning Access
              </div>

              <h1 className="text-3xl font-bold text-white drop-shadow sm:text-4xl">
                Select Learning Mode
              </h1>

              <p className="mt-3 max-w-md text-sm leading-7 text-white/80 sm:text-base">
                Choose the language direction that best fits your learning goal
                before entering the study platform.
              </p >
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setMode('thai')}
                className={`w-full rounded-[24px] border p-5 text-left transition duration-200 ${
                  mode === 'thai'
                    ? 'border-white/60 bg-white/28 shadow-[0_16px_40px_rgba(46,167,224,0.18)]'
                    : 'border-white/20 bg-white/10 hover:bg-white/18'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`rounded-2xl p-3 ${
                      mode === 'thai'
                        ? 'bg-[#2EA7E0] text-white'
                        : 'bg-white/20 text-white'
                    }`}
                  >
                    <Languages className="h-5 w-5" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-white sm:text-xl">
                        Thai to Chinese
                      </h2>
                      {mode === 'thai' && (
                        <span className="rounded-full bg-[#2EA7E0] px-3 py-1 text-xs font-medium text-white">
                          Selected
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm leading-6 text-white/75">
                      Ideal for Thai staff who want to build Chinese vocabulary,
                      pronunciation, and daily communication confidence.
                    </p >
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode('chinese')}
                className={`w-full rounded-[24px] border p-5 text-left transition duration-200 ${
                  mode === 'chinese'
                    ? 'border-white/60 bg-white/28 shadow-[0_16px_40px_rgba(46,167,224,0.18)]'
                    : 'border-white/20 bg-white/10 hover:bg-white/18'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`rounded-2xl p-3 ${
                      mode === 'chinese'
                        ? 'bg-[#2EA7E0] text-white'
                        : 'bg-white/20 text-white'
                    }`}
                  >
                    <Globe2 className="h-5 w-5" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-white sm:text-xl">
                        Chinese to Thai
                      </h2>
                      {mode === 'chinese' && (
                        <span className="rounded-full bg-[#2EA7E0] px-3 py-1 text-xs font-medium text-white">
                          Selected
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm leading-6 text-white/75">
                      Best for Chinese staff who want to improve Thai
                      understanding, workplace vocabulary, and practical usage.
                    </p >
                  </div>
                </div>
              </button>

              <button
                onClick={handleStart}
                className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2EA7E0] to-[#1D8FC7] px-4 text-base font-semibold text-white shadow-[0_14px_30px_rgba(46,167,224,0.30)] transition duration-200 hover:translate-y-[-1px] hover:shadow-[0_18px_36px_rgba(29,143,199,0.34)]"
              >
                Enter Study Platform
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8 rounded-[28px] border border-white/25 bg-white/12 p-5 backdrop-blur-md">
              <p className="text-sm font-medium text-white">Internal Note</p >
              <p className="mt-2 text-sm leading-6 text-white/72">
                This platform is designed to support real workplace communication,
                improve cross-language understanding, and strengthen daily
                Thai-Chinese collaboration.
              </p >
            </div>

            <p className="mt-6 text-center text-xs tracking-[0.2em] text-white/55 uppercase">
              Midea Internal Learning System
            </p >
          </div>
        </div>
      </div>
    </main>
  );
}