'use client';

import React from 'react';
import { Brain, Lightbulb, MessageSquareMore, Sparkles, Volume2 } from 'lucide-react';

import { explainWord, generateExamples, generateHint } from '@/lib/ai';

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
  onRate,
  onSpeak,
}: ReviewPanelProps) {
  const [answerVisible, setAnswerVisible] = React.useState(false);
  const [aiPanel, setAiPanel] = React.useState<AiPanelState>(defaultAiPanelState);

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

  const rate = React.useCallback(
    (rating: ReviewRating) => {
      if (!answerVisible) return;
      if (rating === 'again') setAnswerVisible(false);
      onRate(card.id, rating);
    },
    [answerVisible, card.id, onRate]
  );

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
    <div className="mx-auto max-w-4xl overflow-hidden rounded-[24px] border border-[#D9E7F0] bg-white shadow-[0_10px_30px_rgba(46,167,224,0.08)]">
      <div className="space-y-5 p-5 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-[#F4FAFD] px-3 py-1 text-sm font-medium text-[#163047]">
            {card.category || 'Review'}
          </span>
          <div className="flex items-center gap-2 text-sm font-medium text-[#6B7C8F]">
            <span>{cardIndex + 1} / {totalCards}</span>
            <span className="rounded-full bg-[#F4FAFD] px-3 py-1 text-xs text-[#163047]">
              {remainingCards} left
            </span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[#6B7C8F]">Progress</p>
            <p className="mt-2 text-2xl font-bold text-[#163047]">{progress}%</p>
          </div>
          <div className="rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[#6B7C8F]">Reviewed</p>
            <p className="mt-2 text-2xl font-bold text-[#163047]">{cardIndex + 1}</p>
          </div>
          <div className="rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[#6B7C8F]">Shortcuts</p>
            <p className="mt-2 text-sm font-medium text-[#163047]">Enter reveal | 1 2 3 4 rate</p>
          </div>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-[#D9E7F0]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2EA7E0] to-[#1D8FC7] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-800 p-6 text-center text-white md:p-10">
          {card.image && <div className="mb-4 text-5xl">{card.image}</div>}

          <p className="text-sm uppercase tracking-[0.2em] text-white/75">
            {isThaiLearnsChinese ? 'Chinese' : 'Thai'}
          </p>

          <div className="mt-4 flex items-center justify-center gap-3">
            <h2 className="text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
              {promptText}
            </h2>
            <button
              type="button"
              onClick={() => onSpeak(promptText, promptLang, `review-prompt-${card.id}`)}
              className="rounded-full bg-white/15 p-3 text-white hover:bg-white/25"
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
              className="h-14 w-full rounded-2xl bg-[#2EA7E0] px-5 text-lg font-semibold text-white hover:bg-[#1D8FC7]"
            >
              Show Answer
            </button>

            <div className="grid gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => void loadHint()}
                className="flex items-center justify-center gap-2 rounded-2xl border border-[#D9E7F0] bg-white px-4 py-3 text-sm font-medium text-[#163047] hover:bg-[#F8FCFE]"
              >
                <Lightbulb className="h-4 w-4 text-[#2EA7E0]" />
                Personalized Hint
              </button>
            </div>

            {aiPanel.hint ? (
              <div className="rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4 text-sm text-[#163047]">
                <div className="mb-2 flex items-center gap-2 font-semibold text-[#1D8FC7]">
                  <Lightbulb className="h-4 w-4" />
                  Hint
                </div>
                <p className="leading-6">{aiPanel.hint}</p>
              </div>
            ) : aiPanel.loading === 'hint' ? (
              <div className="rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4 text-sm text-[#6B7C8F]">
                Building hint...
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4 rounded-3xl border border-[#D9E7F0] bg-[#F8FCFE] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#6B7C8F]">Answer</p>
                <p className="mt-1 text-2xl font-bold text-[#163047]">{answerText}</p>
                {!isThaiLearnsChinese && showPinyin && card.pinyin ? (
                  <p className="mt-2 text-base text-[#6B7C8F]">{card.pinyin}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onSpeak(answerText, answerLang, `review-answer-${card.id}`)}
                className="rounded-full bg-white p-3 shadow-sm hover:bg-[#EAF7FD]"
              >
                <Volume2 className="h-5 w-5 text-[#1D8FC7]" />
              </button>
            </div>

            {showSentence && (card.sentenceZh || card.sentenceTh) ? (
              <div className="rounded-2xl border border-[#D9E7F0] bg-white p-4 text-sm text-[#163047] sm:text-base">
                <p className="font-medium text-[#6B7C8F]">Example</p>
                {card.sentenceZh ? <p className="mt-2">{card.sentenceZh}</p> : null}
                {showPinyin && card.sentencePinyin ? (
                  <p className="mt-1 text-[#1D8FC7]">{card.sentencePinyin}</p>
                ) : null}
                {card.sentenceTh ? <p className="mt-2">{card.sentenceTh}</p> : null}
                {showThaiReading && card.sentenceThaiPronunciation ? (
                  <p className="mt-1 text-[#6B7C8F]">{card.sentenceThaiPronunciation}</p>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => void loadExplanation()}
                className="flex items-center justify-center gap-2 rounded-2xl border border-[#D9E7F0] bg-white px-4 py-3 text-sm font-medium text-[#163047] hover:bg-[#F4FAFD]"
              >
                <Brain className="h-4 w-4 text-[#2EA7E0]" />
                Explain
              </button>
              <button
                type="button"
                onClick={() => void loadExamples()}
                className="flex items-center justify-center gap-2 rounded-2xl border border-[#D9E7F0] bg-white px-4 py-3 text-sm font-medium text-[#163047] hover:bg-[#F4FAFD]"
              >
                <MessageSquareMore className="h-4 w-4 text-[#2EA7E0]" />
                More Examples
              </button>
              <button
                type="button"
                onClick={() => void loadHint()}
                className="flex items-center justify-center gap-2 rounded-2xl border border-[#D9E7F0] bg-white px-4 py-3 text-sm font-medium text-[#163047] hover:bg-[#F4FAFD]"
              >
                <Sparkles className="h-4 w-4 text-[#2EA7E0]" />
                Refresh Hint
              </button>
            </div>

            {aiPanel.loading ? (
              <div className="rounded-2xl border border-[#D9E7F0] bg-white p-4 text-sm text-[#6B7C8F]">
                Loading {aiPanel.loading}...
              </div>
            ) : null}

            {aiPanel.explanation ? (
              <div className="rounded-2xl border border-[#D9E7F0] bg-white p-4">
                <p className="text-sm font-semibold text-[#163047]">Smart Explanation</p>
                <p className="mt-2 text-sm leading-6 text-[#55677A]">{aiPanel.explanation}</p>
              </div>
            ) : null}

            {aiPanel.examples.length > 0 ? (
              <div className="rounded-2xl border border-[#D9E7F0] bg-white p-4">
                <p className="text-sm font-semibold text-[#163047]">Generated Examples</p>
                <div className="mt-2 space-y-2 text-sm leading-6 text-[#55677A]">
                  {aiPanel.examples.map((example, index) => (
                    <p key={`${example}-${index}`}>{example}</p>
                  ))}
                </div>
              </div>
            ) : null}

            {aiPanel.hint ? (
              <div className="rounded-2xl border border-[#D9E7F0] bg-white p-4">
                <p className="text-sm font-semibold text-[#163047]">Hint</p>
                <p className="mt-2 text-sm leading-6 text-[#55677A]">{aiPanel.hint}</p>
              </div>
            ) : null}
          </div>
        )}

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
  );
}

export function ReviewComplete({ total, onReset }: ReviewCompleteProps) {
  return (
    <div className="mx-auto max-w-4xl rounded-[24px] border border-[#D9E7F0] bg-white p-8 text-center shadow-[0_10px_30px_rgba(46,167,224,0.08)] md:p-10">
      <p className="text-2xl font-bold text-[#163047]">Review Completed</p>
      <p className="mt-2 text-[#6B7C8F]">
        {total > 0 ? `${total} cards reviewed` : 'No due cards right now'}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-6 h-12 rounded-2xl bg-[#2EA7E0] px-6 font-semibold text-white hover:bg-[#1D8FC7]"
      >
        Back to Cards
      </button>
    </div>
  );
}
