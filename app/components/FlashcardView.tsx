'use client';

import React from 'react';
import { Image as ImageIcon, Volume2 } from 'lucide-react';
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
      className={`rounded-[24px] border border-[#D9E7F0] bg-white shadow-[0_10px_30px_rgba(46,167,224,0.08)] ${className}`}
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
  return (
    <motion.div
      key={`${card.id}-${flipped}-${learningMode}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
    >
      <div className="mx-auto w-full max-w-4xl [perspective:1200px]">
        <motion.div
          className="relative h-[620px] w-full cursor-pointer touch-manipulation"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5 }}
          style={{ transformStyle: 'preserve-3d' }}
          onClick={onCardTap}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <CardShell
            className="absolute inset-0 overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-800 text-white"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="flex h-full flex-col justify-between p-6 md:p-8">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white/15 px-3 py-1 text-sm">
                  {card.category}
                </span>
                {showImage && <span className="text-5xl">{card.image || ' '}</span>}
              </div>

              <div className="space-y-5 text-center">
                <p className="text-sm uppercase tracking-[0.25em] text-white/75">
                  {learningMode === 'thai-learns-chinese' ? 'Chinese' : 'Thai'}
                </p>

                {learningMode === 'thai-learns-chinese' ? (
                  <>
                    <div className="flex items-center justify-center gap-3">
                      <h2 className="text-4xl font-bold sm:text-5xl md:text-6xl">{card.zh}</h2>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void onSpeak(card.zh, 'zh-CN', `front-${learningMode}-${card.id}`);
                        }}
                        className="rounded-full bg-white/15 p-3 text-white hover:bg-white/25"
                      >
                        <Volume2 className="h-5 w-5" />
                      </button>
                    </div>
                    {showPinyin && <div className="text-lg md:text-xl">{renderPinyin(card.pinyin)}</div>}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-3">
                      <h2 className="text-4xl font-bold sm:text-5xl md:text-6xl">{card.th}</h2>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void onSpeak(card.th, 'th-TH', `front-${learningMode}-${card.id}`);
                        }}
                        className="rounded-full bg-white/15 p-3 text-white hover:bg-white/25"
                      >
                        <Volume2 className="h-5 w-5" />
                      </button>
                    </div>
                    {showThaiReading && card.thaiPronunciation && (
                      <p className="text-base text-white/85">{card.thaiPronunciation}</p>
                    )}
                  </>
                )}
              </div>

              <div className="text-center text-sm text-white/75">
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
            <div className="flex h-full flex-col justify-between p-6 md:p-8">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#F4FAFD] px-3 py-1 text-sm text-[#163047]">
                  {card.category}
                </span>
                {showImage && (
                  <span className="text-4xl">
                    <ImageIcon className="mr-1 inline h-5 w-5" />
                    {card.image || ' '}
                  </span>
                )}
              </div>

              <div className="space-y-5 text-center">
                <p className="text-sm uppercase tracking-[0.2em] text-[#6B7C8F]">
                  {learningMode === 'thai-learns-chinese' ? 'Pinyin' : 'Chinese Meaning'}
                </p>

                {learningMode === 'thai-learns-chinese' ? (
                  <>
                    <div className="flex items-center justify-center gap-3">
                      <h3 className="text-3xl font-bold text-[#163047] md:text-4xl">
                        {card.pinyin || '-'}
                      </h3>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void onSpeak(card.zh, 'zh-CN', `back-pinyin-${card.id}`);
                        }}
                        className="rounded-full bg-[#F4FAFD] p-3 hover:bg-[#EAF7FD]"
                      >
                        <Volume2 className="h-5 w-5 text-[#1D8FC7]" />
                      </button>
                    </div>

                    <div className="space-y-2 rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4 text-left">
                      <p className="text-sm text-[#6B7C8F]">Thai Meaning</p>
                      <div className="flex items-center gap-3">
                        <p className="text-xl font-semibold text-[#163047]">{card.th}</p>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void onSpeak(card.th, 'th-TH', `back-thai-${card.id}`);
                          }}
                          className="rounded-full bg-white p-2 shadow-sm hover:bg-[#EAF7FD]"
                        >
                          <Volume2 className="h-4 w-4 text-[#1D8FC7]" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-3">
                      <h3 className="text-3xl font-bold text-[#163047] md:text-4xl">{card.zh}</h3>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void onSpeak(card.zh, 'zh-CN', `back-cn-${card.id}`);
                        }}
                        className="rounded-full bg-[#F4FAFD] p-3 hover:bg-[#EAF7FD]"
                      >
                        <Volume2 className="h-5 w-5 text-[#1D8FC7]" />
                      </button>
                    </div>

                    {showPinyin && card.pinyin && (
                      <div className="space-y-1">
                        <p className="text-sm text-[#6B7C8F]">Chinese reading guide</p>
                        <div className="text-base">{renderPinyinLight(card.pinyin)}</div>
                      </div>
                    )}

                    <div className="space-y-2 rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4 text-left">
                      <p className="text-sm text-[#6B7C8F]">Thai</p>
                      <div className="flex items-center gap-3">
                        <p className="text-xl font-semibold text-[#163047]">{card.th}</p>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void onSpeak(card.th, 'th-TH', `back-th-${card.id}`);
                          }}
                          className="rounded-full bg-white p-2 shadow-sm hover:bg-[#EAF7FD]"
                        >
                          <Volume2 className="h-4 w-4 text-[#1D8FC7]" />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {showSentence && (
                  <div className="space-y-3 rounded-2xl border border-[#D9E7F0] bg-[#F4FAFD] p-4 text-left">
                    <p className="text-sm font-medium text-[#6B7C8F]">Example Sentence</p>
                    <p className="text-lg text-[#163047]">{card.sentenceTh}</p>
                    <p className="text-sm text-[#1D8FC7] sm:text-base">{card.sentenceZh}</p>
                    {showPinyin && card.sentencePinyin && (
                      <div className="text-sm sm:text-base">{renderPinyinLight(card.sentencePinyin)}</div>
                    )}
                  </div>
                )}
              </div>

              <p className="text-center text-sm text-[#6B7C8F]">Tap card to flip back</p>
            </div>
          </CardShell>
        </motion.div>
      </div>
    </motion.div>
  );
}
