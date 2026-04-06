'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Languages,
  Sparkles,
} from 'lucide-react';
import FlashcardApp from '../components/FlashcardApp';

type LearningMode = 'thai' | 'chinese';
type AppMode = 'flashcards' | 'quiz';

export default function StudyPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedMode, setSelectedMode] = useState<LearningMode>('thai');
  const [selectedAppMode, setSelectedAppMode] =
    useState<AppMode>('flashcards');

  useEffect(() => {
    const savedLearningMode =
      (localStorage.getItem('midea-learning-mode') as LearningMode | null) ||
      'thai';
    const savedAppMode =
      (localStorage.getItem('midea-app-mode') as AppMode | null) || 'flashcards';

    setSelectedMode(savedLearningMode);
    setSelectedAppMode(savedAppMode);
    setMounted(true);
  }, []);

  const modeLabel = useMemo(() => {
    return selectedMode === 'thai'
      ? 'Thai Staff Learning Chinese'
      : 'Chinese Staff Learning Thai';
  }, [selectedMode]);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-[#EAF7FD] flex items-center justify-center">
        <div className="rounded-[28px] border border-[#D9E7F0] bg-white px-8 py-6 text-[#163047] shadow-sm">
          Loading study workspace...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#EAF7FD]">
      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => router.push('/learn')}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#D9E7F0] bg-white px-4 py-3 text-sm font-medium text-[#163047] shadow-sm transition hover:bg-[#F8FCFE]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Learn
            </button>

            <div className="inline-flex items-center gap-2 rounded-full bg-[#DFF3FD] px-4 py-2 text-sm text-[#1D8FC7]">
              <Sparkles className="h-4 w-4" />
              Premium Study Flow
            </div>

            <div className="rounded-full bg-white px-4 py-3 text-sm text-[#163047] shadow-sm border border-[#D9E7F0]">
              Current Language: <span className="font-semibold">{modeLabel}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setSelectedMode('thai');
                localStorage.setItem('midea-learning-mode', 'thai');
              }}
              className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                selectedMode === 'thai'
                  ? 'bg-[#2EA7E0] text-white'
                  : 'border border-[#D9E7F0] bg-white text-[#163047]'
              }`}
            >
              Thai to Chinese
            </button>

            <button
              onClick={() => {
                setSelectedMode('chinese');
                localStorage.setItem('midea-learning-mode', 'chinese');
              }}
              className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                selectedMode === 'chinese'
                  ? 'bg-[#2EA7E0] text-white'
                  : 'border border-[#D9E7F0] bg-white text-[#163047]'
              }`}
            >
              Chinese to Thai
            </button>

            <button
              onClick={() => {
                setSelectedAppMode('flashcards');
                localStorage.setItem('midea-app-mode', 'flashcards');
              }}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                selectedAppMode === 'flashcards'
                  ? 'bg-[#163047] text-white'
                  : 'border border-[#D9E7F0] bg-white text-[#163047]'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Flashcards
            </button>

            <button
              onClick={() => {
                setSelectedAppMode('quiz');
                localStorage.setItem('midea-app-mode', 'quiz');
              }}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                selectedAppMode === 'quiz'
                  ? 'bg-[#163047] text-white'
                  : 'border border-[#D9E7F0] bg-white text-[#163047]'
              }`}
            >
              <Brain className="h-4 w-4" />
              Quiz
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-[#D9E7F0] bg-white shadow-[0_20px_60px_rgba(46,167,224,0.10)]">
          <div className="border-b border-[#E8F1F6] bg-[linear-gradient(135deg,#F8FCFE_0%,#EAF7FD_100%)] px-6 py-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm text-[#1D8FC7] shadow-sm">
                  <Languages className="h-4 w-4" />
                  Midea Language Study Workspace
                </div>
                <h1 className="text-2xl font-bold text-[#163047]">
                  {selectedAppMode === 'flashcards'
                    ? 'Flashcard Learning'
                    : 'Quiz Practice'}
                </h1>
                <p className="mt-1 text-sm text-[#6B7C8F]">
                  Premium study view with the original FlashcardApp retained.
                </p >
              </div>

              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-[#163047] shadow-sm border border-[#E8F1F6]">
                Active Path: <span className="font-semibold">{modeLabel}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#F4FAFD] p-3 sm:p-4 lg:p-6">
            <div className="rounded-[28px] border border-[#D9E7F0] bg-white shadow-sm overflow-visible">
              <FlashcardApp key={`${selectedMode}-${selectedAppMode}`} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}