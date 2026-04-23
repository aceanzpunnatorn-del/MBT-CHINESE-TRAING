'use client';

import React from 'react';
import { Heart, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';

import type { LearningMode } from '@/types/app';

type DisplayCard = {
  id: string;
  zh: string;
  pinyin?: string;
  th: string;
  category?: string;
  sentenceZh?: string;
  sentencePinyin?: string;
  sentenceTh?: string;
  thaiPronunciation?: string;
  sentenceThaiPronunciation?: string;
  image?: string;
};

type Props = {
  card: DisplayCard;
  learningMode: LearningMode;
  showImage: boolean;
  showSentence: boolean;
  showPinyin: boolean;
  showThaiReading: boolean;
  lives: number;
  xp: number;
  level: number;
  quizInstruction: string;
  quizPromptMain?: string;
  quizPromptSecondary?: string;
  quizChoices: string[];
  correctAnswer?: string;
  quizAnswer: string;
  quizSubmitted: boolean;
  combo: number;
  hint: string;
  hintLoading: boolean;
  onRetry: () => void;
  onSubmit: (answer: string) => void;
  onSpeak: (
    text: string | undefined,
    lang: 'zh-CN' | 'th-TH' | 'en-US',
    key: string
  ) => void | Promise<void>;
  renderPinyinLight: (text?: string) => React.ReactNode;
};

function cn(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function CardShell({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-[24px] border border-[#D9E7F0] bg-white shadow-[0_10px_30px_rgba(46,167,224,0.08)]',
        className
      )}
    >
      {children}
    </div>
  );
}

export function QuizView({
  card,
  learningMode,
  showImage,
  showSentence,
  showPinyin,
  showThaiReading,
  lives,
  xp,
  level,
  quizInstruction,
  quizPromptMain,
  quizPromptSecondary,
  quizChoices,
  correctAnswer,
  quizAnswer,
  quizSubmitted,
  combo,
  hint,
  hintLoading,
  onRetry,
  onSubmit,
  onSpeak,
  renderPinyinLight,
}: Props) {
  return (
    <motion.div
      key={`${card.id}-${quizSubmitted}-${learningMode}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
    >
      <CardShell className="mx-auto max-w-4xl overflow-hidden border-[#D9E7F0] bg-white">
        <div className="space-y-5 p-5 md:p-10">
          {lives === 0 && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-center">
              <p className="font-semibold text-rose-700">Out of hearts</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-white"
              >
                Retry
              </button>
            </div>
          )}

          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-rose-500">
              {[1, 2, 3].map((heart) => (
                <Heart
                  key={heart}
                  className={cn('h-5 w-5', heart <= lives ? 'fill-current' : 'opacity-25')}
                />
              ))}
            </div>

            <div className="rounded-full bg-[#F4FAFD] px-4 py-2 text-sm font-semibold text-[#163047]">
              XP {xp} | Lv.{level}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-[#F4FAFD] px-3 py-1 text-sm text-[#163047]">
              {card.category}
            </span>
            <div className="flex flex-wrap items-center gap-2 text-sm text-[#6B7C8F]">
              <span>{quizInstruction}</span>
              <span className="rounded-full bg-[#F4FAFD] px-3 py-1 text-xs text-[#163047]">
                Keys 1-4
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#F8FCFE] px-4 py-3 text-sm text-[#163047]">
              <span className="font-semibold">Combo:</span> x{Math.max(combo, 0)}
            </div>
            <div className="rounded-2xl bg-[#F8FCFE] px-4 py-3 text-sm text-[#163047]">
              <span className="font-semibold">Flow:</span> Enter = continue
            </div>
          </div>

          <div className="space-y-4 py-4 text-center">
            {showImage && <div className="text-5xl">{card.image || ' '}</div>}

            <div className="flex items-center justify-center gap-3">
              <h2 className="text-3xl font-bold leading-tight text-[#163047] sm:text-4xl md:text-5xl">
                {quizPromptMain}
              </h2>

              <button
                type="button"
                onClick={() =>
                  void onSpeak(
                    quizPromptMain,
                    learningMode === 'thai-learns-chinese' ? 'zh-CN' : 'th-TH',
                    `quiz-main-${learningMode}-${card.id}`
                  )
                }
                className="rounded-full bg-[#F4FAFD] p-3 hover:bg-[#EAF7FD]"
              >
                <Volume2 className="h-5 w-5 text-[#1D8FC7]" />
              </button>
            </div>

            {quizPromptSecondary ? (
              <div className="text-base text-[#6B7C8F] sm:text-lg md:text-xl">
                {learningMode === 'thai-learns-chinese'
                  ? renderPinyinLight(quizPromptSecondary)
                  : quizPromptSecondary}
              </div>
            ) : null}

            {showSentence && (
              <div className="mx-auto max-w-2xl rounded-2xl bg-[#F8FCFE] p-4 text-left text-sm text-[#163047] sm:text-base">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <p>
                      {learningMode === 'thai-learns-chinese'
                        ? card.sentenceZh
                        : card.sentenceTh}
                    </p>

                    {learningMode === 'chinese-learns-thai' &&
                    showThaiReading &&
                    card.sentenceThaiPronunciation ? (
                      <p className="mt-1 text-sm text-[#6B7C8F]">
                        {card.sentenceThaiPronunciation}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void onSpeak(
                        learningMode === 'thai-learns-chinese' ? card.sentenceZh : card.sentenceTh,
                        learningMode === 'thai-learns-chinese' ? 'zh-CN' : 'th-TH',
                        `quiz-sentence-${learningMode}-${card.id}`
                      )
                    }
                    className="rounded-full bg-white p-2 shadow-sm hover:bg-[#EAF7FD]"
                  >
                    <Volume2 className="h-4 w-4 text-[#1D8FC7]" />
                  </button>
                </div>

                {learningMode === 'thai-learns-chinese' && showPinyin && card.sentencePinyin ? (
                  <div className="mt-2">{renderPinyinLight(card.sentencePinyin)}</div>
                ) : null}
              </div>
            )}
          </div>

          <div className="grid gap-3">
            {quizChoices.map((choice, index) => {
              const isCorrectChoice = choice === correctAnswer;
              const isSelected = quizAnswer === choice;

              return (
                <motion.button
                  key={`${choice}-${index}`}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  className={cn(
                    'min-h-[56px] rounded-2xl border px-4 py-4 text-left text-sm sm:px-5 sm:text-base',
                    quizSubmitted && isCorrectChoice && 'border-emerald-500 bg-emerald-50',
                    quizSubmitted && isSelected && !isCorrectChoice && 'border-rose-500 bg-rose-50',
                    !quizSubmitted && 'border-[#D9E7F0] bg-white text-[#163047]'
                  )}
                  onClick={() => onSubmit(choice)}
                  disabled={quizSubmitted || lives === 0}
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F4FAFD] text-sm font-semibold text-[#1D8FC7]">
                      {index + 1}
                    </span>
                    <span>{choice}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {hintLoading ? (
            <div className="rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] px-4 py-3 text-sm text-[#6B7C8F]">
              Building personalized hint...
            </div>
          ) : null}

          {hint ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-sm font-semibold text-amber-800">Hint</p>
              <p className="mt-2 text-sm leading-6 text-amber-900">{hint}</p>
            </div>
          ) : null}
        </div>
      </CardShell>
    </motion.div>
  );
}
