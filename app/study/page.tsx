'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import FlashcardApp from '@/app/components/FlashcardApp';

export default function StudyPage() {
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