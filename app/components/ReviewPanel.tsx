'use client';

import React from 'react';
import { Brain, Lightbulb, MessageSquareMore, Sparkles, Volume2 } from 'lucide-react';

import { explainWord, generateExamples, generateHint } from '@/lib/ai';
import type { SentenceVariant } from '@/lib/sentence-variants';

type LearningMode = 'thai-learns-chinese' | 'chinese-learns-thai';
type SpeechLang = 'zh-CN' | 'th-TH' | 'en-US';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

type ReviewCard = {
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

type ReviewPanelProps = {
  card: ReviewCard;
  cardIndex: number;
  totalCards: number;
  remainingCards: number;
  learningMode: LearningMode;
  showPinyin: boolean;
  showThaiReading: boolean;
  showSentence: boolean;
  audioMuted: boolean;
  autoPlayWord: boolean;
  autoPlaySentence: boolean;
  onRate: (cardId: string, rating: ReviewRating) => void;
  onSpeak: (text: string | undefined, lang: SpeechLang, key: string) => void | Promise<void>;
};

type ReviewCompleteProps = {
  total: number;
  onReset: () => void;
};

type AiPanelState = {
  explanation: string;
  examples: string[];
  hint: string;
  loading: 'explanation' | 'examples' | 'hint' | null;
};

const defaultAiPanelState: AiPanelState = {
  explanation: '',
  examples: [],
  hint: '',
  loading: null,
};

const ratingButtons: Array<{
  rating: ReviewRating;
  label: string;
  hint: string;
  hotkey: string;
  className: string;
}> = [
  {
    rating: 'again',
    label: 'Again',
    hint: 'Immediate retry',
    hotkey: '1',
    className: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  },
  {
    rating: 'hard',
    label: 'Hard',
    hint: 'Small increase',
    hotkey: '2',
    className: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
  },
  {
    rating: 'good',
    label: 'Good',
    hint: 'Normal increase',
    hotkey: '3',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  },
  {
    rating: 'easy',
    label: 'Easy',
    hint: 'Large increase',
    hotkey: '4',
    className: 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100',
  },
];

function renderProgress(cardIndex: number, totalCards: number) {
  if (totalCards <= 0) return 0;
  return Math.round(((cardIndex + 1) / totalCards) * 100);
}

export function ReviewPanel({
  card,
  cardIndex,
  totalCards,
  remainingCards,
  learningMode,
  showPinyin,
  showThaiReading,
  showSentence,
  audioMuted,
  autoPlayWord,
  autoPlaySentence,
  onRate,
  onSpeak,
}: ReviewPanelProps) {
  const [answerVisible, setAnswerVisible] = React.useState(false);
  const [aiPanel, setAiPanel] = React.useState<AiPanelState>(defaultAiPanelState);
  const lastAutoPlayKeyRef = React.useRef('');

  React.useEffect(() => {
    setAnswerVisible(false);
    setAiPanel(defaultAiPanelState);
  }, [card.id]);

  const isThaiLearnsChinese = learningMode === 'thai-learns-chinese';
  const promptText = isThaiLearnsChinese ? card.zh : card.th;
  const answerText = isThaiLearnsChinese ? card.th : card.zh;
  const promptLang = isThaiLearnsChinese ? 'zh-CN' : 'th-TH';
  const answerLang = isThaiLearnsChinese ? 'th-TH' : 'zh-CN';
  const progress = renderProgress(cardIndex, totalCards);
  const sentenceVariants = React.useMemo(() => {
    if (card.sentenceVariants && card.sentenceVariants.length > 0) {
      return card.sentenceVariants.slice(0, 3);
    }

    if (!card.sentenceZh && !card.sentenceTh) {
      return [];
    }

    return [
      {
        id: `${card.id}-fallback-example`,
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

  const rate = React.useCallback(
    (rating: ReviewRating) => {
      if (!answerVisible) return;
      if (rating === 'again') setAnswerVisible(false);
      onRate(card.id, rating);
    },
    [answerVisible, card.id, onRate]
  );

  React.useEffect(() => {
    if (audioMuted || (!autoPlayWord && !autoPlaySentence)) return;

    const targets: Array<{
      text: string;
      lang: SpeechLang;
      key: string;
    }> = [];

    if (!answerVisible && autoPlayWord) {
      targets.push({
        text: promptText,
        lang: promptLang,
        key: `review-prompt-auto-${card.id}`,
      });
    }

    if (answerVisible && autoPlayWord) {
      targets.push({
        text: answerText,
        lang: answerLang,
        key: `review-answer-auto-${card.id}`,
      });
    }

    if (answerVisible && showSentence && autoPlaySentence) {
      const variant = sentenceVariants[0];
      const sentenceText =
        learningMode === 'thai-learns-chinese' ? variant?.zh || card.sentenceZh : variant?.th || card.sentenceTh;

      if (sentenceText) {
        targets.push({
          text: sentenceText,
          lang: learningMode === 'thai-learns-chinese' ? 'zh-CN' : 'th-TH',
          key: `review-sentence-auto-${card.id}`,
        });
      }
    }

    const autoPlayKey = targets.map((target) => target.key).join('|');
    if (!autoPlayKey || lastAutoPlayKeyRef.current === autoPlayKey) return;

    lastAutoPlayKeyRef.current = autoPlayKey;

    void (async () => {
      for (const target of targets) {
        await onSpeak(target.text, target.lang, target.key);
      }
    })();
  }, [
    answerLang,
    answerText,
    answerVisible,
    audioMuted,
    autoPlaySentence,
    autoPlayWord,
    card.id,
    card.sentenceTh,
    card.sentenceZh,
    learningMode,
    onSpeak,
    promptLang,
    promptText,
    sentenceVariants,
    showSentence,
  ]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        if (!answerVisible) {
          setAnswerVisible(true);
        }
        return;
      }

      const matched = ratingButtons.find((item) => item.hotkey === event.key);
      if (matched) {
        event.preventDefault();
        rate(matched.rating);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [answerVisible, rate]);

  async function loadHint() {
    setAiPanel((current) => ({ ...current, loading: 'hint' }));
    const hint = await generateHint({
      zh: card.zh,
      th: card.th,
      pinyin: card.pinyin,
      category: card.category,
    });
    setAiPanel((current) => ({ ...current, hint, loading: null }));
  }

  async function loadExplanation() {
    setAiPanel((current) => ({ ...current, loading: 'explanation' }));
    const explanation = await explainWord({
      zh: card.zh,
      th: card.th,
      pinyin: card.pinyin,
      category: card.category,
    });
    setAiPanel((current) => ({
      ...current,
      explanation: `${explanation.summary} ${explanation.usage} ${explanation.compare}`,
      loading: null,
    }));
  }

  async function loadExamples() {
    setAiPanel((current) => ({ ...current, loading: 'examples' }));
    const examples = await generateExamples({
      zh: card.zh,
      th: card.th,
      pinyin: card.pinyin,
      category: card.category,
    });
    setAiPanel((current) => ({ ...current, examples, loading: null }));
  }

  return (
    <div className="duo-surface mx-auto max-w-4xl rounded-[28px]">
      <div className="space-y-4 p-4 sm:p-5 md:space-y-5 md:p-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="rounded-full bg-[#F3FBE8] px-3 py-1 text-sm font-medium text-[#36521A]">
            {card.category || 'Review'}
          </span>
          <div className="flex items-center gap-2 text-sm font-medium text-[#6B7C8F]">
            <span>{cardIndex + 1} / {totalCards}</span>
            <span className="rounded-full bg-[#F3FBE8] px-3 py-1 text-xs text-[#36521A]">
              {remainingCards} left
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#D8E9C9] bg-[#F8FDEB] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[#6B7C8F]">Progress</p>
            <p className="mt-2 text-2xl font-bold text-[#163047]">{progress}%</p>
          </div>
          <div className="rounded-2xl border border-[#D8E9C9] bg-[#F8FDEB] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[#6B7C8F]">Reviewed</p>
            <p className="mt-2 text-2xl font-bold text-[#163047]">{cardIndex + 1}</p>
          </div>
          <div className="rounded-2xl border border-[#D8E9C9] bg-[#F8FDEB] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[#6B7C8F]">Shortcuts</p>
            <p className="mt-2 text-sm font-medium text-[#163047]">Enter reveal | 1 2 3 4 rate</p>
          </div>
        </div>

        <div className="duo-progress-track h-3 overflow-hidden rounded-full">
          <div
            className="duo-progress-fill h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-[#58CC02] via-[#72D620] to-[#14B8A6] p-4 text-center text-white sm:p-6 md:p-10">
          {card.image && <div className="mb-4 text-4xl sm:text-5xl">{card.image}</div>}

          <p className="text-sm uppercase tracking-[0.2em] text-white/75">
            {isThaiLearnsChinese ? 'Chinese' : 'Thai'}
          </p>

          <div className="mt-4 flex items-center justify-center gap-2 sm:gap-3">
            <h2 className="text-3xl font-bold leading-tight sm:text-5xl md:text-6xl">
              {promptText}
            </h2>
            <button
              type="button"
              onClick={() => onSpeak(promptText, promptLang, `review-prompt-${card.id}`)}
              className="rounded-full bg-white/20 p-2.5 text-white hover:bg-white/30 sm:p-3"
            >
              <Volume2 className="h-5 w-5" />
            </button>
          </div>

          {isThaiLearnsChinese && showPinyin && card.pinyin ? (
            <p className="mt-4 text-lg text-cyan-100 md:text-xl">{card.pinyin}</p>
          ) : null}

          {!isThaiLearnsChinese && showThaiReading && card.thaiPronunciation ? (
            <p className="mt-4 text-lg text-cyan-100 md:text-xl">{card.thaiPronunciation}</p>
          ) : null}
        </div>

        {!answerVisible ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setAnswerVisible(true)}
              className="duo-primary h-14 w-full rounded-2xl px-5 text-lg font-semibold"
            >
              Show Answer
            </button>

            <div className="grid gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => void loadHint()}
                className="duo-secondary flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
              >
                <Lightbulb className="h-4 w-4 text-[#58CC02]" />
                Personalized Hint
              </button>
            </div>

            {aiPanel.hint ? (
              <div className="rounded-2xl border border-[#D8E9C9] bg-[#F8FDEB] p-4 text-sm text-[#163047]">
                <div className="mb-2 flex items-center gap-2 font-semibold text-[#58CC02]">
                  <Lightbulb className="h-4 w-4" />
                  Hint
                </div>
                <p className="leading-6">{aiPanel.hint}</p>
              </div>
            ) : aiPanel.loading === 'hint' ? (
              <div className="rounded-2xl border border-[#D8E9C9] bg-[#F8FDEB] p-4 text-sm text-[#6B7C8F]">
                Building hint...
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4 rounded-3xl border border-[#D8E9C9] bg-[#F8FDEB] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#6B7C8F]">Answer</p>
                <p className="mt-1 text-xl font-bold text-[#163047] sm:text-2xl">{answerText}</p>
                {!isThaiLearnsChinese && showPinyin && card.pinyin ? (
                  <p className="mt-2 text-base text-[#6B7C8F]">{card.pinyin}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onSpeak(answerText, answerLang, `review-answer-${card.id}`)}
                className="rounded-full bg-white p-3 shadow-sm hover:bg-[#F2FBE7]"
              >
                <Volume2 className="h-5 w-5 text-[#58CC02]" />
              </button>
            </div>

            {showSentence && sentenceVariants.length > 0 ? (
              <div className="rounded-2xl border border-[#D8E9C9] bg-white p-4 text-sm text-[#163047] sm:text-base">
                <p className="font-medium text-[#6B7C8F]">Example Set</p>

                <div className="mt-3 space-y-3">
                  {sentenceVariants.map((variant) => (
                    <div
                      key={variant.id}
                      className="rounded-2xl border border-[#D8E9C9] bg-[#F8FDEB] px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4D7C0F]">
                          {variant.label}
                        </span>

                        <div className="flex items-center gap-2">
                          {variant.zh ? (
                            <button
                              type="button"
                              onClick={() => onSpeak(variant.zh, 'zh-CN', `review-example-zh-${variant.id}`)}
                              className="rounded-full bg-white p-2 shadow-sm hover:bg-[#F2FBE7]"
                            >
                              <Volume2 className="h-4 w-4 text-[#58CC02]" />
                            </button>
                          ) : null}
                          {variant.th ? (
                            <button
                              type="button"
                              onClick={() => onSpeak(variant.th, 'th-TH', `review-example-th-${variant.id}`)}
                              className="rounded-full bg-white p-2 shadow-sm hover:bg-[#F2FBE7]"
                            >
                              <Volume2 className="h-4 w-4 text-[#2EA7E0]" />
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {variant.zh ? <p className="mt-3 font-medium text-[#58CC02]">{variant.zh}</p> : null}
                      {showPinyin && variant.pinyin ? (
                        <p className="mt-2 rounded-xl bg-white px-3 py-2 text-[#36521A]">
                          {variant.pinyin}
                        </p>
                      ) : null}
                      {variant.th ? (
                        <div className="mt-2 flex items-start justify-between gap-3">
                          <p>{variant.th}</p>
                          <button
                            type="button"
                            onClick={() => onSpeak(variant.th, 'th-TH', `review-example-th-line-${variant.id}`)}
                            className="shrink-0 rounded-full bg-white p-2 shadow-sm hover:bg-[#F2FBE7]"
                          >
                            <Volume2 className="h-4 w-4 text-[#2EA7E0]" />
                          </button>
                        </div>
                      ) : null}
                      {showThaiReading && variant.thaiPronunciation ? (
                        <p className="mt-1 text-[#6B7C8F]">{variant.thaiPronunciation}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => void loadExplanation()}
                className="duo-secondary flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
              >
                <Brain className="h-4 w-4 text-[#58CC02]" />
                Explain
              </button>
              <button
                type="button"
                onClick={() => void loadExamples()}
                className="duo-secondary flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
              >
                <MessageSquareMore className="h-4 w-4 text-[#58CC02]" />
                More Examples
              </button>
              <button
                type="button"
                onClick={() => void loadHint()}
                className="duo-secondary flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
              >
                <Sparkles className="h-4 w-4 text-[#58CC02]" />
                Refresh Hint
              </button>
            </div>

            {aiPanel.loading ? (
              <div className="rounded-2xl border border-[#D8E9C9] bg-white p-4 text-sm text-[#6B7C8F]">
                Loading {aiPanel.loading}...
              </div>
            ) : null}

            {aiPanel.explanation ? (
              <div className="rounded-2xl border border-[#D8E9C9] bg-white p-4">
                <p className="text-sm font-semibold text-[#163047]">Smart Explanation</p>
                <p className="mt-2 text-sm leading-6 text-[#55677A]">{aiPanel.explanation}</p>
              </div>
            ) : null}

            {aiPanel.examples.length > 0 ? (
              <div className="rounded-2xl border border-[#D8E9C9] bg-white p-4">
                <p className="text-sm font-semibold text-[#163047]">Generated Examples</p>
                <div className="mt-2 space-y-2 text-sm leading-6 text-[#55677A]">
                  {aiPanel.examples.map((example, index) => (
                    <p key={`${example}-${index}`}>{example}</p>
                  ))}
                </div>
              </div>
            ) : null}

            {aiPanel.hint ? (
              <div className="rounded-2xl border border-[#D8E9C9] bg-white p-4">
                <p className="text-sm font-semibold text-[#163047]">Hint</p>
                <p className="mt-2 text-sm leading-6 text-[#55677A]">{aiPanel.hint}</p>
              </div>
            ) : null}
          </div>
        )}

        <div className="sticky bottom-3 z-10 rounded-[28px] bg-white/95 p-2 shadow-[0_12px_40px_rgba(22,48,71,0.12)] backdrop-blur md:static md:rounded-none md:bg-transparent md:p-0 md:shadow-none">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {ratingButtons.map((item) => (
              <button
                key={item.rating}
                type="button"
                onClick={() => rate(item.rating)}
                disabled={!answerVisible}
                className={`min-h-[74px] rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:border-[#D9E7F0] disabled:bg-[#F4FAFD] disabled:text-[#9BAABA] ${item.className}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="block text-base font-bold">{item.label}</span>
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold">
                    {item.hotkey}
                  </span>
                </div>
                <span className="mt-1 block text-xs opacity-80">{item.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReviewComplete({ total, onReset }: ReviewCompleteProps) {
  return (
    <div className="duo-surface mx-auto max-w-4xl rounded-[28px] p-8 text-center md:p-10">
      <p className="text-2xl font-bold text-[#163047]">Review Completed</p>
      <p className="mt-2 text-[#6B7C8F]">
        {total > 0 ? `${total} cards reviewed` : 'No due cards right now'}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="duo-primary mt-6 h-12 rounded-2xl px-6 font-semibold"
      >
        Back to Cards
      </button>
    </div>
  );
}
