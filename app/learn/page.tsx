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
    <main className="relative min-h-screen overflow-hidden bg-[#DFF3FF]">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="/midea-building.png"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,24,44,0.88)_0%,rgba(10,58,100,0.78)_45%,rgba(17,92,151,0.72)_75%,rgba(223,243,255,0.95)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
        
        {/* Header */}
        <div className="mb-6 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
            <ShieldCheck className="h-3 w-3" />
            Learning Mode
          </div>

          <h1 className="mt-4 text-3xl font-bold">
            Choose your learning direction
          </h1>

          <p className="mt-2 text-sm text-white/70">
            One tap to start learning
          </p>
        </div>

        {/* Mode Buttons */}
        <div className="space-y-4">

          {/* Thai → Chinese */}
          <button
            onClick={() => setMode('thai')}
            className={`w-full rounded-[28px] p-5 text-left transition ${
              mode === 'thai'
                ? 'bg-sky-400/25 border border-sky-300 shadow-[0_10px_30px_rgba(56,189,248,0.3)]'
                : 'bg-white/10 border border-white/20'
            }`}
          >
            <div className="flex items-center gap-4 text-white">
              <div className="rounded-xl bg-white/20 p-3">
                <Languages />
              </div>

              <div className="flex-1">
                <div className="flex justify-between">
                  <h2 className="font-semibold text-lg">
                    Thai → Chinese
                  </h2>

                  {mode === 'thai' && (
                    <span className="text-xs bg-sky-400 text-black px-2 py-1 rounded-full">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-sm text-white/70 mt-1">
                  For Thai staff learning Chinese
                </p>
              </div>
            </div>
          </button>

          {/* Chinese → Thai */}
          <button
            onClick={() => setMode('chinese')}
            className={`w-full rounded-[28px] p-5 text-left transition ${
              mode === 'chinese'
                ? 'bg-cyan-400/25 border border-cyan-300 shadow-[0_10px_30px_rgba(34,211,238,0.3)]'
                : 'bg-white/10 border border-white/20'
            }`}
          >
            <div className="flex items-center gap-4 text-white">
              <div className="rounded-xl bg-white/20 p-3">
                <Globe2 />
              </div>

              <div className="flex-1">
                <div className="flex justify-between">
                  <h2 className="font-semibold text-lg">
                    Chinese → Thai
                  </h2>

                  {mode === 'chinese' && (
                    <span className="text-xs bg-cyan-400 text-black px-2 py-1 rounded-full">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-sm text-white/70 mt-1">
                  For Chinese staff learning Thai
                </p>
              </div>
            </div>
          </button>

        </div>

        {/* CTA */}
        <div className="mt-auto pt-6">
          <button
            onClick={handleStart}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-semibold text-base shadow-[0_12px_30px_rgba(14,165,233,0.35)] active:scale-[0.98]"
          >
            Start Learning
            <ArrowRight />
          </button>
        </div>

      </div>
    </main>
  );
}