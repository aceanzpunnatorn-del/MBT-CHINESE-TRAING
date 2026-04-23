'use client';

import React from 'react';
import { Mic, MicOff, Radio, Sparkles, Volume2, Waves } from 'lucide-react';

import {
  calculateSpeakingScore,
  getSpeakingTarget,
  getSpeakingTips,
  type SpeakingCard,
  type SpeakingPracticeMode,
  type SpeakingScoreResult,
} from '@/lib/speaking';
import type { LearningMode } from '@/types/app';

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionResultListLike = {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
};

type SpeechRecognitionEventLike = Event & {
  results: SpeechRecognitionResultListLike;
};

type SpeechRecognitionErrorEventLike = Event & {
  error?: string;
};

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type Props = {
  card: SpeakingCard;
  learningMode: LearningMode;
  showSentence: boolean;
  showPinyin: boolean;
  showThaiReading: boolean;
  onSpeak: (
    text: string | undefined,
    lang: 'zh-CN' | 'th-TH' | 'en-US',
    key: string
  ) => void | Promise<void>;
};

function cn(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function getScoreStyle(score: SpeakingScoreResult | null) {
  if (!score) return 'border-[#D9E7F0] bg-[#F8FCFE] text-[#163047]';
  if (score.level === 'excellent') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (score.level === 'good') return 'border-cyan-200 bg-cyan-50 text-cyan-800';
  if (score.level === 'fair') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-rose-200 bg-rose-50 text-rose-800';
}

export function SpeakingPracticePanel({
  card,
  learningMode,
  showSentence,
  showPinyin,
  showThaiReading,
  onSpeak,
}: Props) {
  const [practiceMode, setPracticeMode] = React.useState<SpeakingPracticeMode>('word');
  const [isListening, setIsListening] = React.useState(false);
  const [isSupported, setIsSupported] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [attemptCount, setAttemptCount] = React.useState(0);
  const [bestScore, setBestScore] = React.useState(0);
  const [score, setScore] = React.useState<SpeakingScoreResult | null>(null);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);

  const sentenceAvailable =
    Boolean(card.sentenceZh?.trim()) || Boolean(card.sentenceTh?.trim());

  React.useEffect(() => {
    if (!showSentence && practiceMode === 'sentence') {
      setPracticeMode('word');
    }
  }, [showSentence, practiceMode]);

  React.useEffect(() => {
    if (!sentenceAvailable && practiceMode === 'sentence') {
      setPracticeMode('word');
    }
  }, [sentenceAvailable, practiceMode]);

  const target = React.useMemo(
    () => getSpeakingTarget(card, learningMode, practiceMode),
    [card, learningMode, practiceMode]
  );

  const tips = React.useMemo(
    () => getSpeakingTips(target, card.category),
    [target, card.category]
  );

  React.useEffect(() => {
    setTranscript('');
    setErrorMessage('');
    setScore(null);
    setAttemptCount(0);
    setBestScore(0);
    setIsListening(false);
    recognitionRef.current?.stop();
  }, [card, practiceMode, learningMode]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = target.speechLang;

    recognition.onresult = (event) => {
      let nextTranscript = '';

      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const alternative = result[0];

        if (alternative?.transcript) {
          nextTranscript += `${alternative.transcript} `;
        }
      }

      const cleanTranscript = nextTranscript.trim();
      setTranscript(cleanTranscript);

      const nextScore = calculateSpeakingScore(target.text, cleanTranscript);
      setScore(nextScore);
      setBestScore((current) => Math.max(current, nextScore.score));
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setErrorMessage(
        event.error === 'not-allowed'
          ? 'Microphone access is blocked. Please allow microphone permission.'
          : 'Speech recognition could not start. Please try again.'
      );
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsSupported(true);

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [target.speechLang, target.text]);

  function startPractice() {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    setErrorMessage('');
    setTranscript('');
    setScore(null);
    setAttemptCount((current) => current + 1);
    recognition.lang = target.speechLang;
    setIsListening(true);
    recognition.start();
  }

  function stopPractice() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  return (
    <div className="mx-auto max-w-4xl rounded-[24px] border border-[#D9E7F0] bg-white p-5 shadow-[0_10px_30px_rgba(46,167,224,0.08)] md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-[#2EA7E0]" />
          <h3 className="text-lg font-bold text-[#163047]">Speaking Practice</h3>
        </div>
        <span className="rounded-full bg-[#F4FAFD] px-3 py-1 text-xs font-semibold text-[#2EA7E0]">
          Listen / Speak / Score
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'word', label: 'Word Drill', disabled: false },
              {
                key: 'sentence',
                label: 'Sentence Drill',
                disabled: !showSentence || !sentenceAvailable,
              },
            ] as Array<{
              key: SpeakingPracticeMode;
              label: string;
              disabled: boolean;
            }>).map((item) => (
              <button
                key={item.key}
                type="button"
                disabled={item.disabled}
                onClick={() => setPracticeMode(item.key)}
                className={cn(
                  'rounded-2xl border px-4 py-2 text-sm font-medium',
                  practiceMode === item.key
                    ? 'border-[#2EA7E0] bg-[#2EA7E0] text-white'
                    : 'border-[#D9E7F0] bg-white text-[#163047]',
                  item.disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-800 p-5 text-white">
            <p className="text-xs uppercase tracking-[0.18em] text-white/70">{target.label}</p>
            <p className="mt-3 text-3xl font-bold leading-tight md:text-4xl">{target.text}</p>

            {target.speechLang === 'zh-CN' && showPinyin && target.guide ? (
              <p className="mt-3 text-base text-cyan-100 md:text-lg">{target.guide}</p>
            ) : null}

            {target.speechLang === 'th-TH' && showThaiReading && target.guide ? (
              <p className="mt-3 text-base text-cyan-100 md:text-lg">{target.guide}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  void onSpeak(target.text, target.speechLang, `speaking-${practiceMode}-${card.zh}-${card.th}`)
                }
                className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-3 text-sm font-medium text-white hover:bg-white/25"
              >
                <Volume2 className="h-4 w-4" />
                Listen
              </button>

              {isSupported ? (
                isListening ? (
                  <button
                    type="button"
                    onClick={stopPractice}
                    className="inline-flex items-center gap-2 rounded-2xl bg-rose-500/90 px-4 py-3 text-sm font-medium text-white hover:bg-rose-500"
                  >
                    <MicOff className="h-4 w-4" />
                    Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startPractice}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/90 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-500"
                  >
                    <Mic className="h-4 w-4" />
                    Start Speaking
                  </button>
                )
              ) : (
                <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/75">
                  <MicOff className="h-4 w-4" />
                  Browser speech scoring unavailable
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[#6B7C8F]">Attempts</p>
              <p className="mt-2 text-2xl font-bold text-[#163047]">{attemptCount}</p>
            </div>
            <div className="rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[#6B7C8F]">Best Score</p>
              <p className="mt-2 text-2xl font-bold text-[#163047]">{bestScore}</p>
            </div>
            <div className="rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[#6B7C8F]">Status</p>
              <p className="mt-2 text-sm font-semibold text-[#163047]">
                {isListening ? 'Listening...' : isSupported ? 'Ready to practice' : 'Listen only'}
              </p>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className={cn('rounded-2xl border p-4', getScoreStyle(score))}>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Waves className="h-4 w-4" />
              Pronunciation Score
            </div>
            <div className="mt-3 text-3xl font-bold">{score ? score.score : '--'}</div>
            <p className="mt-2 text-sm leading-6">
              {score ? score.feedback : 'Speak after listening once, then compare your result.'}
            </p>
          </div>

          <div className="rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#163047]">
              <Sparkles className="h-4 w-4 text-[#2EA7E0]" />
              Recognized Speech
            </div>
            <p className="min-h-[72px] rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-[#163047]">
              {transcript || 'Your recognized speech will appear here after you speak.'}
            </p>
          </div>

          <div className="rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4">
            <p className="mb-3 text-sm font-semibold text-[#163047]">Coaching Tips</p>
            <div className="space-y-2 text-sm leading-6 text-[#55677A]">
              {tips.map((tip, index) => (
                <p key={`${tip}-${index}`} className="rounded-xl bg-white px-3 py-2">
                  {tip}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
