'use client';

import React from 'react';
import { Heart, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';

import type { SentenceVariant } from '@/lib/sentence-variants';
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
  sentenceVariants?: SentenceVariant[];
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
  return <div className={cn('duo-surface rounded-[28px]', className)}>{children}</div>;
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
  const contextualSentence = React.useMemo(() => {
    const variants = card.sentenceVariants ?? [];

    return (
      variants.find((variant) => variant.difficulty === 'challenge') ||
      variants.find((variant) => variant.difficulty === 'applied') ||
      variants[0] ||
      null
    );
  }, [card.sentenceVariants]);

  let sentencePrimary: string | undefined;
  let sentenceGuide: string | undefined;
  const sentenceThaiTranslation =
    learningMode === 'thai-learns-chinese'
      ? contextualSentence?.th || card.sentenceTh
      : undefined;
  const sentenceThaiReading =
    learningMode === 'thai-learns-chinese'
      ? contextualSentence?.thaiPronunciation || card.sentenceThaiPronunciation
      : undefined;

  if (learningMode === 'thai-learns-chinese') {
    sentencePrimary = contextualSentence?.zh || card.sentenceZh;
    sentenceGuide = contextualSentence?.pinyin || card.sentencePinyin;
  } else {
    sentencePrimary = contextualSentence?.th || card.sentenceTh;
    sentenceGuide =
      contextualSentence?.thaiPronunciation || card.sentenceThaiPronunciation;
  }

  return (
    <motion.div
      key={`${card.id}-${quizSubmitted}-${learningMode}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
    >
      <CardShell className="mx-auto max-w-4xl overflow-hidden border-[#D9E7F0] bg-white">
        <div className="space-y-4 p-4 sm:p-5 md:space-y-5 md:p-10">
          {lives === 0 ? (
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
          ) : null}

          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-rose-500">
              {[1, 2, 3].map((heart) => (
                <Heart
                  key={heart}
                  className={cn('h-5 w-5', heart <= lives ? 'fill-current' : 'opacity-25')}
                />
              ))}
            </div>

            <div className="rounded-full bg-[#F3FBE8] px-4 py-2 text-xs font-semibold text-[#36521A] sm:text-sm">
              XP {xp} | Lv.{level}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="w-fit rounded-full bg-[#F3FBE8] px-3 py-1 text-sm text-[#36521A]">
              {card.category}
            </span>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7C8F] sm:text-sm">
              <span>{quizInstruction}</span>
              <span className="rounded-full bg-[#F3FBE8] px-3 py-1 text-xs text-[#36521A]">
                Keys 1-4
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#F8FDEB] px-4 py-3 text-sm text-[#36521A]">
              <span className="font-semibold">Combo:</span> x{Math.max(combo, 0)}
            </div>
            <div className="rounded-2xl bg-[#F8FDEB] px-4 py-3 text-sm text-[#36521A]">
              <span className="font-semibold">Flow:</span> Enter = continue
            </div>
          </div>

          <div className="space-y-4 py-2 text-center sm:py-4">
            {showImage ? <div className="text-4xl sm:text-5xl">{card.image || ' '}</div> : null}

            <div className="rounded-[28px] bg-gradient-to-br from-[#F7FDEB] to-[#EEF7FF] px-4 py-6 sm:px-6">
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <h2 className="text-2xl font-bold leading-tight text-[#163047] sm:text-4xl md:text-5xl">
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
                  className="rounded-full bg-white p-2.5 shadow-sm hover:bg-[#F2FBE7] sm:p-3"
                >
                  <Volume2 className="h-5 w-5 text-[#58CC02]" />
                </button>
              </div>

              {quizPromptSecondary ? (
                <div className="text-sm text-[#6B7C8F] sm:text-lg md:text-xl">
                  {learningMode === 'thai-learns-chinese'
                    ? renderPinyinLight(quizPromptSecondary)
                    : quizPromptSecondary}
                </div>
              ) : null}
            </div>

            {showSentence && sentencePrimary ? (
              <div className="mx-auto max-w-2xl rounded-2xl bg-[#F8FDEB] p-3 text-left text-sm text-[#163047] sm:p-4 sm:text-base">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    {contextualSentence ? (
                      <span className="mb-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4D7C0F]">
                        {contextualSentence.label} Context
                      </span>
                    ) : null}

                    <p>{sentencePrimary}</p>

                    {learningMode === 'chinese-learns-thai' &&
                    showThaiReading &&
                    sentenceGuide ? (
                      <p className="mt-1 text-sm text-[#6B7C8F]">{sentenceGuide}</p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void onSpeak(
                        sentencePrimary,
                        learningMode === 'thai-learns-chinese' ? 'zh-CN' : 'th-TH',
                        `quiz-sentence-${learningMode}-${card.id}`
                      )
                    }
                    className="rounded-full bg-white p-2 shadow-sm hover:bg-[#F2FBE7]"
                  >
                    <Volume2 className="h-4 w-4 text-[#58CC02]" />
                  </button>
                </div>

                {learningMode === 'thai-learns-chinese' && showPinyin && sentenceGuide ? (
                  <div className="mt-2">{renderPinyinLight(sentenceGuide)}</div>
                ) : null}

                {learningMode === 'thai-learns-chinese' && sentenceThaiTranslation ? (
                  <div className="mt-3 rounded-2xl bg-white px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#6B7C8F]">Thai sentence</p>
                        <p className="mt-1 text-[#163047]">{sentenceThaiTranslation}</p>
                        {showThaiReading && sentenceThaiReading ? (
                          <p className="mt-1 text-sm text-[#6B7C8F]">{sentenceThaiReading}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void onSpeak(
                            sentenceThaiTranslation,
                            'th-TH',
                            `quiz-sentence-th-${learningMode}-${card.id}`
                          )
                        }
                        className="rounded-full bg-[#F2FBE7] p-2 shadow-sm hover:bg-[#EAF8DB]"
                      >
                        <Volume2 className="h-4 w-4 text-[#2EA7E0]" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
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
                    'min-h-[64px] rounded-[22px] border px-4 py-4 text-left text-sm shadow-[0_5px_0_#EDF6DF] transition sm:px-5 sm:text-base',
                    quizSubmitted &&
                      isCorrectChoice &&
                      'border-[#69C81B] bg-[#F4FCE8] text-[#36521A] shadow-[0_5px_0_#DDECC9]',
                    quizSubmitted &&
                      isSelected &&
                      !isCorrectChoice &&
                      'border-rose-400 bg-rose-50 text-rose-700 shadow-[0_5px_0_#FAD9D9]',
                    !quizSubmitted &&
                      'border-[#D8E9C9] bg-white text-[#163047] hover:bg-[#FBFFF6]'
                  )}
                  onClick={() => onSubmit(choice)}
                  disabled={quizSubmitted || lives === 0}
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3FBE8] text-sm font-semibold text-[#58CC02]">
                      {index + 1}
                    </span>
                    <span>{choice}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {hintLoading ? (
            <div className="rounded-2xl border border-[#D8E9C9] bg-[#F8FDEB] px-4 py-3 text-sm text-[#6B7C8F]">
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
