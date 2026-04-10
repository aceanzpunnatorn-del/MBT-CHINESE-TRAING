'use client';

import Link from 'next/link';
import React from 'react';
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  Languages,
  Brain,
} from 'lucide-react';
import FlashcardApp from '@/app/components/FlashcardApp';

type StudyMode = 'flashcards' | 'quiz';
type StudyPath = 'thai-to-chinese' | 'chinese-to-thai';

export default function StudyPage() {
  const [studyPath, setStudyPath] = React.useState<StudyPath>('thai-to-chinese');
  const [studyMode, setStudyMode] = React.useState<StudyMode>('flashcards');

  return (
    <div className="min-h-screen bg-[#EAF4FB] px-4 py-4 md:px-8 md:py-6">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/learn"
              className="inline-flex items-center gap-2 rounded-2xl border border-[#D9E7F0] bg-white px-4 py-3 text-sm font-medium text-[#163047] shadow-sm hover:bg-[#F8FCFE]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Learn
            </Link>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] px-4 py-3 text-sm font-medium text-[#2EA7E0]">
              <Sparkles className="h-4 w-4" />
              Premium Study Flow
            </div>

            <div className="rounded-2xl border border-[#D9E7F0] bg-white px-4 py-3 text-sm font-medium text-[#163047]">
              Current Language:{' '}
              <span className="font-semibold">
                {studyPath === 'thai-to-chinese'
                  ? 'Thai Staff Learning Chinese'
                  : 'Chinese Staff Learning Thai'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStudyPath('thai-to-chinese')}
              className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                studyPath === 'thai-to-chinese'
                  ? 'bg-[#2EA7E0] text-white'
                  : 'border border-[#D9E7F0] bg-white text-[#163047]'
              }`}
            >
              Thai to Chinese
            </button>

            <button
              onClick={() => setStudyPath('chinese-to-thai')}
              className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                studyPath === 'chinese-to-thai'
                  ? 'bg-[#2EA7E0] text-white'
                  : 'border border-[#D9E7F0] bg-white text-[#163047]'
              }`}
            >
              Chinese to Thai
            </button>

            <button
              onClick={() => setStudyMode('flashcards')}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium ${
                studyMode === 'flashcards'
                  ? 'bg-[#163047] text-white'
                  : 'border border-[#D9E7F0] bg-white text-[#163047]'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Flashcards
            </button>

            <button
              onClick={() => setStudyMode('quiz')}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium ${
                studyMode === 'quiz'
                  ? 'bg-[#163047] text-white'
                  : 'border border-[#D9E7F0] bg-white text-[#163047]'
              }`}
            >
              <Brain className="h-4 w-4" />
              Quiz
            </button>

            <Link
              href="/builder"
              className="inline-flex items-center gap-2 rounded-2xl border border-[#D9E7F0] bg-white px-4 py-3 text-sm font-medium text-[#163047] hover:bg-[#F8FCFE]"
            >
              <Languages className="h-4 w-4" />
              Sentence Builder
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-[#D9E7F0] bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-[#E6EEF5] bg-[#F8FCFE] px-5 py-5 md:flex-row md:items-start md:justify-between md:px-6">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-[#2EA7E0] shadow-sm">
                <Sparkles className="h-4 w-4" />
                Midea Language Study Workspace
              </div>

              <h1 className="text-2xl font-bold text-[#163047]">Flashcard Learning</h1>
              <p className="mt-1 text-sm text-[#6B7C8F]">
                Premium study view with the original FlashcardApp retained.
              </p>
            </div>

            <div className="rounded-2xl border border-[#D9E7F0] bg-white px-4 py-3 text-sm text-[#163047] shadow-sm">
              Active Path:{' '}
              <span className="font-semibold">
                {studyPath === 'thai-to-chinese'
                  ? 'Thai Staff Learning Chinese'
                  : 'Chinese Staff Learning Thai'}
              </span>
            </div>
          </div>

          <div className="p-4 md:p-6">
            <div className="rounded-[24px] border border-[#E6EEF5] bg-[#F8FCFE] p-2 md:p-3">
              <FlashcardApp key={`${studyPath}-${studyMode}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}