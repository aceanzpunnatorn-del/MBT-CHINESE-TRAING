'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Building2,
  ChevronLeft,
  Languages,
  Trophy,
  User2,
} from 'lucide-react';

type LearningMode = 'thai' | 'chinese';

export default function Page() {
  const [mode, setMode] = useState<LearningMode>('thai');
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');

  useEffect(() => {
    setName(localStorage.getItem('midea-player-name') || '');
    setEmployeeId(localStorage.getItem('midea-employee-code') || '');
    setDepartment(localStorage.getItem('midea-department') || '');
  }, []);

  const handleEnter = () => {
    localStorage.setItem('midea-learning-mode', mode);
    window.location.href = '/study';
  };

  const handleBack = () => {
    window.location.href = '/';
  };

  return (
    <main className="min-h-screen bg-[#F4FAFD] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#D9E7F0] bg-white px-4 py-3 text-sm font-medium text-[#163047]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Login
          </button>

          <div className="rounded-full bg-[#EAF7FD] px-4 py-2 text-sm text-[#1D8FC7]">
            Internal Learning Flow
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-[32px] border border-[#D9E7F0] bg-white p-6 shadow-[0_20px_60px_rgba(46,167,224,0.10)]">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-[#EAF7FD] p-3 text-[#1D8FC7]">
                <User2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-[#6B7C8F]">Learner Profile</p >
                <h2 className="text-xl font-bold text-[#163047]">Profile Summary</h2>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl bg-[#F8FCFE] p-4">
                <p className="text-sm text-[#6B7C8F]">Name</p >
                <p className="mt-1 font-semibold text-[#163047]">
                  {name || 'Not provided'}
                </p >
              </div>

              <div className="rounded-2xl bg-[#F8FCFE] p-4">
                <p className="text-sm text-[#6B7C8F]">Employee ID</p >
                <p className="mt-1 font-semibold text-[#163047]">
                  {employeeId || 'Not provided'}
                </p >
              </div>

              <div className="rounded-2xl bg-[#F8FCFE] p-4">
                <p className="text-sm text-[#6B7C8F]">Department</p >
                <p className="mt-1 font-semibold text-[#163047]">
                  {department || 'Not provided'}
                </p >
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-[#D9E7F0] p-4">
                <BookOpen className="mb-2 h-5 w-5 text-[#2EA7E0]" />
                <p className="text-sm text-[#6B7C8F]">Module</p >
                <p className="font-semibold text-[#163047]">Flashcards</p >
              </div>

              <div className="rounded-2xl border border-[#D9E7F0] p-4">
                <Languages className="mb-2 h-5 w-5 text-[#2EA7E0]" />
                <p className="text-sm text-[#6B7C8F]">Module</p >
                <p className="font-semibold text-[#163047]">Pronunciation</p >
              </div>

              <div className="rounded-2xl border border-[#D9E7F0] p-4">
                <Trophy className="mb-2 h-5 w-5 text-[#2EA7E0]" />
                <p className="text-sm text-[#6B7C8F]">Module</p >
                <p className="font-semibold text-[#163047]">Daily Ranking</p >
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-[#D9E7F0] bg-white p-6 shadow-[0_20px_60px_rgba(46,167,224,0.10)] sm:p-8">
            <div className="mb-8 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF7FD] px-4 py-2 text-sm text-[#1D8FC7]">
                <Building2 className="h-4 w-4" />
                Midea Language Learning Mode
              </div>

              <h1 className="text-3xl font-bold text-[#163047] sm:text-4xl">
                Choose Your Learning Direction
              </h1>

              <p className="max-w-3xl text-base leading-7 text-[#6B7C8F]">
                Select the language path that best fits your learning objective.
                Each mode is designed to support real workplace communication,
                vocabulary practice, and quiz-based improvement.
              </p >
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <button
                onClick={() => setMode('thai')}
                className={`rounded-[28px] border p-6 text-left transition ${
                  mode === 'thai'
                    ? 'border-[#2EA7E0] bg-[#EAF7FD]'
                    : 'border-[#D9E7F0] bg-white hover:bg-[#F8FCFE]'
                }`}
              >
                <div className="mb-4 inline-flex rounded-2xl bg-white p-3 text-[#2EA7E0] shadow-sm">
                  <Languages className="h-6 w-6" />
                </div>

                <h2 className="text-2xl font-bold text-[#163047]">
                  Thai Staff Learning Chinese
                </h2>

                <p className="mt-3 text-sm leading-6 text-[#6B7C8F]">
                  Practice Chinese vocabulary, pinyin, pronunciation, sentence
                  structure, and quiz mode designed for Thai staff.
                </p >

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-[#1D8FC7]">
                    Chinese Vocabulary
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-[#1D8FC7]">
                    Pinyin
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-[#1D8FC7]">
                    Factory Terms
                  </span>
                </div>
              </button>

              <button
                onClick={() => setMode('chinese')}
                className={`rounded-[28px] border p-6 text-left transition ${
                  mode === 'chinese'
                    ? 'border-[#2EA7E0] bg-[#EAF7FD]'
                    : 'border-[#D9E7F0] bg-white hover:bg-[#F8FCFE]'
                }`}
              >
                <div className="mb-4 inline-flex rounded-2xl bg-white p-3 text-[#2EA7E0] shadow-sm">
                  <Languages className="h-6 w-6" />
                </div>

                <h2 className="text-2xl font-bold text-[#163047]">
                  Chinese Staff Learning Thai
                </h2>

                <p className="mt-3 text-sm leading-6 text-[#6B7C8F]">
                  Practice Thai meanings, Thai pronunciation support, daily usage,
                  and quiz mode for Chinese staff working in Thailand.
                </p >

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-[#1D8FC7]">
                    Thai Vocabulary
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-[#1D8FC7]">
                    Thai Reading
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-[#1D8FC7]">
                    Daily Communication
                  </span>
                </div>
              </button>
            </div>

            <div className="mt-8 flex flex-col gap-4 rounded-[28px] bg-gradient-to-r from-[#2EA7E0] to-[#1D8FC7] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-white/80">Selected Mode</p >
                <h3 className="mt-1 text-2xl font-bold">
                  {mode === 'thai'
                    ? 'Thai Staff Learning Chinese'
                    : 'Chinese Staff Learning Thai'}
                </h3>
              </div>

              <button
                onClick={handleEnter}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-[#1D8FC7]"
              >
                Enter Study Page
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}