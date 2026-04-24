'use client';

import React from 'react';
import { Image as ImageIcon, Volume2 } from 'lucide-react';
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
  flipped: boolean;
  learningMode: LearningMode;
  showImage: boolean;
  showPinyin: boolean;
  showThaiReading: boolean;
  showSentence: boolean;
  ttsLoading: boolean;
  ttsKey: string | null;
  onCardTap: () => void;
  onTouchStart: (event: React.TouchEvent) => void;
  onTouchEnd: (event: React.TouchEvent) => void;
  onSpeak: (text: string | undefined, lang: 'zh-CN' | 'th-TH' | 'en-US', key: string) => void | Promise<void>;
  renderPinyin: (text?: string) => React.ReactNode;
  renderPinyinLight: (text?: string) => React.ReactNode;
};

function CardShell({
  className = '',
  children,
  style,
}: {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`duo-surface rounded-[28px] ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function FlashcardView({
  card,
  flipped,
  learningMode,
  showImage,
  showPinyin,
  showThaiReading,
  showSentence,
  ttsLoading,
  ttsKey,
  onCardTap,
  onTouchStart,
  onTouchEnd,
  onSpeak,
  renderPinyin,
  renderPinyinLight,
}: Props) {
  const sentenceVariants = React.useMemo(() => {
    if (card.sentenceVariants && card.sentenceVariants.length > 0) {
      return card.sentenceVariants.slice(0, 2);
    }

    if (!card.sentenceZh && !card.sentenceTh) {
      return [];
    }

    return [
      {
        id: `${card.id}-fallback-sentence`,
        label: 'Applied',
        difficulty: 'applied',
        zh: card.sentenceZh || '',
        th: card.sentenceTh || '',
        pinyin: card.sentencePinyin,
        thaiPronunciation: card.sentenceThaiPronunciation,
      } satisfies SentenceVariant,
    ];
  }, [
    card.id,
    card.sentencePinyin,
    card.sentenceThaiPronunciation,
    card.sentenceTh,
    card.sentenceVariants,
    card.sentenceZh,
  ]);

  return (
    <motion.div
      key={`${card.id}-${flipped}-${learningMode}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
    >
      <div className="mx-auto w-full max-w-4xl [perspective:1200px]">
        <motion.div
          className="relative h-[min(70vh,620px)] min-h-[460px] w-full cursor-pointer touch-manipulation sm:min-h-[520px] md:h-[620px]"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5 }}
          style={{ transformStyle: 'preserve-3d' }}
          onClick={onCardTap}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <CardShell
            className="absolute inset-0 overflow-hidden border-0 bg-gradient-to-br from-[#58CC02] via-[#73D71F] to-[#14B8A6] text-white"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="flex h-full flex-col justify-between p-4 sm:p-6 md:p-8">
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs sm:text-sm">
                  {card.category}
                </span>
                {showImage && <span className="text-4xl sm:text-5xl">{card.image || ' '}</span>}
              </div>

              <div className="space-y-4 text-center sm:space-y-5">
                <p className="text-xs uppercase tracking-[0.25em] text-white/75 sm:text-sm">
                  {learningMode === 'thai-learns-chinese' ? 'Chinese' : 'Thai'}
                </p>

                {learningMode === 'thai-learns-chinese' ? (
                  <>
                    <div className="flex items-center justify-center gap-2 sm:gap-3">
                      <h2 className="text-3xl font-bold leading-tight sm:text-5xl md:text-6xl">{card.zh}</h2>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void onSpeak(card.zh, 'zh-CN', `front-${learningMode}-${card.id}`);
                        }}
                        className="rounded-full bg-white/20 p-2.5 text-white hover:bg-white/30 sm:p-3"
                      >
                        <Volume2 className="h-5 w-5" />
                      </button>
                    </div>
                    {showPinyin && <div className="text-base md:text-xl">{renderPinyin(card.pinyin)}</div>}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-2 sm:gap-3">
                      <h2 className="text-3xl font-bold leading-tight sm:text-5xl md:text-6xl">{card.th}</h2>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void onSpeak(card.th, 'th-TH', `front-${learningMode}-${card.id}`);
                        }}
                        className="rounded-full bg-white/20 p-2.5 text-white hover:bg-white/30 sm:p-3"
                      >
                        <Volume2 className="h-5 w-5" />
                      </button>
                    </div>
                    {showThaiReading && card.thaiPronunciation && (
                      <p className="text-sm text-white/85 sm:text-base">{card.thaiPronunciation}</p>
                    )}
                  </>
                )}
              </div>

              <div className="text-center text-xs text-white/75 sm:text-sm">
                {ttsLoading && ttsKey === `front-${learningMode}-${card.id}`
                  ? 'Playing audio...'
                  : 'Tap card to flip / swipe to move / Enter to continue'}
              </div>
            </div>
          </CardShell>

          <CardShell
            className="absolute inset-0 overflow-hidden bg-white"
            style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
          >
            <div className="flex h-full min-h-0 flex-col p-4 sm:p-6 md:p-8">
              <div className="flex items-start justify-between gap-3 shrink-0">
                <span className="rounded-full bg-[#F2FBE7] px-3 py-1 text-xs text-[#36521A] sm:text-sm">
                  {card.category}
                </span>
                {showImage && (
                  <span className="text-3xl sm:text-4xl">
                    <ImageIcon className="mr-1 inline h-5 w-5" />
                    {card.image || ' '}
                  </span>
                )}
              </div>

              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 text-center">
                <div className="space-y-4 pb-4 sm:space-y-5">
                <p className="text-xs uppercase tracking-[0.2em] text-[#6B7C8F] sm:text-sm">
                  {learningMode === 'thai-learns-chinese' ? 'Pinyin' : 'Chinese Meaning'}
                </p>

                {learningMode === 'thai-learns-chinese' ? (
                  <>
                    <div className="flex items-center justify-center gap-2 sm:gap-3">
                      <h3 className="text-2xl font-bold text-[#163047] sm:text-3xl md:text-4xl">
                        {card.pinyin || '-'}
                      </h3>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void onSpeak(card.zh, 'zh-CN', `back-pinyin-${card.id}`);
                        }}
                        className="rounded-full bg-[#F2FBE7] p-2.5 hover:bg-[#EAF8DB] sm:p-3"
                      >
                        <Volume2 className="h-5 w-5 text-[#58CC02]" />
                      </button>
                    </div>

                    <div className="space-y-2 rounded-2xl border border-[#D9E8C3] bg-[#FAFEEB] p-3 text-left sm:p-4">
                      <p className="text-sm text-[#6B7C8F]">Thai Meaning</p>
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-semibold text-[#163047] sm:text-xl">{card.th}</p>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void onSpeak(card.th, 'th-TH', `back-thai-${card.id}`);
                          }}
                          className="rounded-full bg-white p-2 shadow-sm hover:bg-[#F2FBE7]"
                        >
                          <Volume2 className="h-4 w-4 text-[#58CC02]" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-2 sm:gap-3">
                      <h3 className="text-2xl font-bold text-[#163047] sm:text-3xl md:text-4xl">{card.zh}</h3>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void onSpeak(card.zh, 'zh-CN', `back-cn-${card.id}`);
                        }}
                        className="rounded-full bg-[#F2FBE7] p-2.5 hover:bg-[#EAF8DB] sm:p-3"
                      >
                        <Volume2 className="h-5 w-5 text-[#58CC02]" />
                      </button>
                    </div>

                    {showPinyin && card.pinyin && (
                      <div className="space-y-1">
                        <p className="text-sm text-[#6B7C8F]">Chinese reading guide</p>
                        <div className="text-base">{renderPinyinLight(card.pinyin)}</div>
                      </div>
                    )}

                    <div className="space-y-2 rounded-2xl border border-[#D9E8C3] bg-[#FAFEEB] p-3 text-left sm:p-4">
                      <p className="text-sm text-[#6B7C8F]">Thai</p>
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-semibold text-[#163047] sm:text-xl">{card.th}</p>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void onSpeak(card.th, 'th-TH', `back-th-${card.id}`);
                          }}
                          className="rounded-full bg-white p-2 shadow-sm hover:bg-[#F2FBE7]"
                        >
                          <Volume2 className="h-4 w-4 text-[#58CC02]" />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {showSentence && sentenceVariants.length > 0 ? (
                  <div className="space-y-3 rounded-2xl border border-[#D9E8C3] bg-[#FAFEEB] p-3 text-left sm:p-4">
                    <p className="text-sm font-medium text-[#6B7C8F]">Example Sentences</p>

                    <div className="space-y-3">
                      {sentenceVariants.map((variant) => (
                        <div
                          key={variant.id}
                          className="rounded-2xl border border-[#D9E8C3] bg-white px-3 py-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="rounded-full bg-[#F3FBE8] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4D7C0F]">
                              {variant.label}
                            </span>
                            <div className="flex items-center gap-2">
                              {variant.zh ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void onSpeak(variant.zh, 'zh-CN', `flash-example-zh-${variant.id}`);
                                  }}
                                  className="rounded-full bg-white p-2 shadow-sm hover:bg-[#F2FBE7]"
                                >
                                  <Volume2 className="h-4 w-4 text-[#58CC02]" />
                                </button>
                              ) : null}
                              {variant.th ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void onSpeak(variant.th, 'th-TH', `flash-example-th-${variant.id}`);
                                  }}
                                  className="rounded-full bg-white p-2 shadow-sm hover:bg-[#F2FBE7]"
                                >
                                  <Volume2 className="h-4 w-4 text-[#2EA7E0]" />
                                </button>
                              ) : null}
                            </div>
                          </div>

                          {variant.zh ? (
                            <p className="text-sm font-medium text-[#58CC02] sm:text-base">
                              {variant.zh}
                            </p>
                          ) : null}

                          {showPinyin && variant.pinyin ? (
                            <div className="mt-2 rounded-xl bg-[#F8FCFE] px-3 py-2 text-sm sm:text-base">
                              {renderPinyinLight(variant.pinyin)}
                            </div>
                          ) : null}

                          {variant.th ? (
                            <div className="mt-2 flex items-start justify-between gap-3">
                              <p className="text-base text-[#163047] sm:text-lg">{variant.th}</p>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void onSpeak(variant.th, 'th-TH', `flash-example-th-line-${variant.id}`);
                                }}
                                className="shrink-0 rounded-full bg-[#F2FBE7] p-2 shadow-sm hover:bg-[#EAF8DB]"
                              >
                                <Volume2 className="h-4 w-4 text-[#2EA7E0]" />
                              </button>
                            </div>
                          ) : null}

                          {showThaiReading && variant.thaiPronunciation ? (
                            <p className="mt-2 text-sm text-[#6B7C8F]">
                              {variant.thaiPronunciation}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              </div>

              <p className="mt-3 shrink-0 text-center text-xs text-[#6B7C8F] sm:text-sm">
                Tap card to flip back
              </p>
            </div>
          </CardShell>
        </motion.div>
      </div>
    </motion.div>
  );
}
