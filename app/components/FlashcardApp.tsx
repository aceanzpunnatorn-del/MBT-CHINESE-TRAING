'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  Flame,
  Gauge,
  Heart,
  Repeat2,
  RotateCcw,
  Search,
  Shield,
  Shuffle,
  Sparkles,
  Star,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';

import { hsk4Data } from '@/lib/hsk4-data';
import { factoryEnglish900th } from '@/lib/factory-english-900-th';
import { getUserSession, refreshUserSession, updateUserSession } from '@/lib/session';
import { getUserProgress, upsertUserProgress } from '@/lib/progress';
import {
  getWeakWords,
  getDueReviewWords,
  recordWordResult,
  recordWordReviewRating,
} from '@/lib/word-stats';
import { applyRatingToReviewQueue, createReviewQueue } from '@/lib/srs';
import { getUserMetrics, type UserMetrics } from '@/lib/analytics';
import { getRecommendedWords, type RecommendedWord } from '@/lib/recommendation';
import { generateHint } from '@/lib/ai';
import { getDailyScores, saveDailyScore } from '@/lib/scoreboard';
import { logError } from '@/lib/logger';
import { getThaiKaraoke } from '@/lib/thai-karaoke';
import {
  playFeedbackTone,
  speakText,
  stopSpeaking,
  type SpeechLang,
  type SpeechRatePreset,
} from '@/lib/tts';
import {
  buildSentenceVariants,
  getPreferredSentenceVariant,
  type SentenceVariant,
} from '@/lib/sentence-variants';

import { ReviewPanel, ReviewComplete, type ReviewRating } from '@/app/components/ReviewPanel';
import { ManagerDashboard } from '@/app/components/ManagerDashboard';
import { FlashcardView } from '@/app/components/FlashcardView';
import { QuizView } from '@/app/components/QuizView';
import { AnalyticsPanel } from '@/app/components/AnalyticsPanel';
import { SpeakingPracticePanel } from '@/app/components/SpeakingPracticePanel';

import type {
  AppMode,
  AppUser,
  DeckMode,
  LearningMode,
  VocabSet,
} from '@/types/app';

function cn(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ');
}

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
      className={cn(
        'duo-surface rounded-[28px]',
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}

function renderPinyinWithToneColor(text?: string) {
  if (!text) return null;

  const tone1 = /[\u0101\u0113\u012b\u014d\u016b\u01d6]/u;
  const tone2 = /[\u00e1\u00e9\u00ed\u00f3\u00fa\u01d8]/u;
  const tone3 = /[\u01ce\u011b\u01d0\u01d2\u01d4\u01da]/u;
  const tone4 = /[\u00e0\u00e8\u00ec\u00f2\u00f9\u01dc]/u;

  return text.split(' ').map((syllable, index) => {
    let className = 'text-white';
    if (tone1.test(syllable)) className = 'text-sky-300';
    else if (tone2.test(syllable)) className = 'text-emerald-300';
    else if (tone3.test(syllable)) className = 'text-yellow-300';
    else if (tone4.test(syllable)) className = 'text-rose-300';

    return (
      <span key={`${syllable}-${index}`} className={`mr-2 font-semibold drop-shadow-sm ${className}`}>
        {syllable}
      </span>
    );
  });
}

function renderPinyinWithToneColorLight(text?: string) {
  if (!text) return null;

  const tone1 = /[\u0101\u0113\u012b\u014d\u016b\u01d6]/u;
  const tone2 = /[\u00e1\u00e9\u00ed\u00f3\u00fa\u01d8]/u;
  const tone3 = /[\u01ce\u011b\u01d0\u01d2\u01d4\u01da]/u;
  const tone4 = /[\u00e0\u00e8\u00ec\u00f2\u00f9\u01dc]/u;

  return text.split(' ').map((syllable, index) => {
    let className = 'text-slate-700';
    if (tone1.test(syllable)) className = 'text-sky-600';
    else if (tone2.test(syllable)) className = 'text-emerald-600';
    else if (tone3.test(syllable)) className = 'text-amber-600';
    else if (tone4.test(syllable)) className = 'text-rose-600';

    return (
      <span key={`${syllable}-${index}`} className={`mr-2 font-medium ${className}`}>
        {syllable}
      </span>
    );
  });
}

function shuffleArray<T>(items: T[]) {
  const cloned = [...items];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

type RankingPeriod = 'daily' | 'weekly' | 'monthly';

type TtsAudioState = {
  key: string | null;
  loading: boolean;
};

type AudioPlaybackTarget = {
  text: string;
  lang: SpeechLang;
  key: string;
};

type LeaderboardEntry = {
  id?: number;
  user_id?: string | null;
  name: string;
  employee_code?: string | null;
  department?: string | null;
  score: number;
  mode: LearningMode;
  score_date?: string;
  created_at?: string;
  session_seconds?: number | null;
};

type DisplayCard = {
  id: string;
  zh: string;
  pinyin?: string;
  th: string;
  thToZh?: string;
  category?: string;
  partOfSpeech?: string;
  sentenceZh?: string;
  sentencePinyin?: string;
  sentenceTh?: string;
  sentenceEn?: string;
  thaiPronunciation?: string;
  sentenceThaiPronunciation?: string;
  sentenceVariants?: SentenceVariant[];
  image?: string;
  source: 'hsk4' | 'factory';
};

type Hsk4DataItem = {
  id?: string | number;
  zh: string;
  pinyin?: string;
  th: string;
  thToZh?: string;
  category?: string;
  sentenceZh?: string;
  sentencePinyin?: string;
  sentenceTh?: string;
  sentenceEn?: string;
  thaiPronunciation?: string;
  sentenceThaiPronunciation?: string;
  image?: string;
};

type FactoryDataItem = {
  id: string | number;
  zhMeaning: string;
  en?: string;
  thMeaning: string;
  pos?: string;
  sentenceZh?: string;
  uk?: string;
  sentenceTh?: string;
  sentenceEn?: string;
  us?: string;
  code?: string;
};

const DEPARTMENTS = [
  'HR',
  'Production',
  'Warehouse',
  'Engineering',
  'Quality',
  'IE',
  'Supply Chain',
  'Finance',
  'IT',
  'Admin',
  'Other',
];

const AUDIO_SPEED_OPTIONS: Array<{
  key: SpeechRatePreset;
  label: string;
}> = [
  { key: 'slow', label: 'Slow' },
  { key: 'clear', label: 'Clear' },
  { key: 'normal', label: 'Normal' },
];

const MOJIBAKE_PATTERN = /[\u00c3\u00c4\u00c5\u00c7\u00f0\u00e2]|\uFFFD/u;

function getSafeCardImage(image: string | undefined, source: 'hsk4' | 'factory') {
  const trimmed = image?.trim();

  if (!trimmed || MOJIBAKE_PATTERN.test(trimmed)) {
    return source === 'hsk4' ? '\u{1F4D8}' : '\u{1F3ED}';
  }

  return trimmed;
}

function normalizeCard(
  item: Hsk4DataItem | FactoryDataItem,
  idx: number,
  source: 'hsk4' | 'factory'
): DisplayCard {
  if (source === 'hsk4') {
    const hskItem = item as Hsk4DataItem;
    const sentenceVariants = buildSentenceVariants({
      id: `hsk4-${hskItem.id ?? idx + 1}`,
      zh: hskItem.zh,
      pinyin: hskItem.pinyin,
      th: hskItem.th,
      sentenceZh: hskItem.sentenceZh,
      sentencePinyin: hskItem.sentencePinyin,
      sentenceTh: hskItem.sentenceTh,
      sentenceEn: hskItem.sentenceEn,
      sentenceThaiPronunciation: hskItem.sentenceThaiPronunciation,
      source: 'hsk4',
      category: hskItem.category || 'HSK4',
    });
    const preferredSentence = getPreferredSentenceVariant(sentenceVariants, 'applied');

    return {
      id: `hsk4-${hskItem.id ?? idx + 1}`,
      zh: hskItem.zh,
      pinyin: hskItem.pinyin,
      th: hskItem.th,
      thToZh: hskItem.thToZh,
      category: hskItem.category || 'HSK4',
      sentenceZh: preferredSentence?.zh || hskItem.sentenceZh,
      sentencePinyin: preferredSentence?.pinyin || hskItem.sentencePinyin,
      sentenceTh: preferredSentence?.th || hskItem.sentenceTh,
      sentenceEn: preferredSentence?.en || hskItem.sentenceEn || '',
      thaiPronunciation: getThaiKaraoke(hskItem.th, hskItem.thaiPronunciation),
      sentenceThaiPronunciation:
        preferredSentence?.thaiPronunciation ||
        getThaiKaraoke(
          preferredSentence?.th || hskItem.sentenceTh,
          hskItem.sentenceThaiPronunciation
        ),
      sentenceVariants,
      image: getSafeCardImage(hskItem.image, 'hsk4'),
      source: 'hsk4',
    };
  }

  const factoryItem = item as FactoryDataItem;
  const sentenceVariants = buildSentenceVariants({
    id: `factory-${factoryItem.id}`,
    zh: factoryItem.zhMeaning,
    pinyin: factoryItem.en,
    th: factoryItem.thMeaning,
    sentenceZh: factoryItem.sentenceZh,
    sentencePinyin: factoryItem.uk,
    sentenceTh: factoryItem.sentenceTh,
    sentenceEn: factoryItem.sentenceEn,
    sentenceThaiPronunciation: factoryItem.code,
    source: 'factory',
    category: factoryItem.pos || 'Factory English',
    partOfSpeech: factoryItem.pos,
  });
  const preferredSentence = getPreferredSentenceVariant(sentenceVariants, 'applied');

  return {
    id: `factory-${factoryItem.id}`,
    zh: factoryItem.zhMeaning,
    pinyin: factoryItem.en,
    th: factoryItem.thMeaning,
    thToZh: factoryItem.zhMeaning,
    category: factoryItem.pos || 'Factory English',
    partOfSpeech: factoryItem.pos,
    sentenceZh: preferredSentence?.zh || factoryItem.sentenceZh,
    sentencePinyin: preferredSentence?.pinyin || factoryItem.uk,
    sentenceTh: preferredSentence?.th || factoryItem.sentenceTh,
    sentenceEn: preferredSentence?.en || factoryItem.sentenceEn,
    thaiPronunciation: getThaiKaraoke(factoryItem.thMeaning, factoryItem.us),
    sentenceThaiPronunciation:
      preferredSentence?.thaiPronunciation ||
      getThaiKaraoke(preferredSentence?.th || factoryItem.sentenceTh, factoryItem.code),
    sentenceVariants,
    image: getSafeCardImage(undefined, 'factory'),
    source: 'factory',
  };
}

export default function FlashcardApp() {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState<AppMode>('flashcards');
  const [learningMode, setLearningMode] = useState<LearningMode>('thai-learns-chinese');

  const [showSentence, setShowSentence] = useState(true);
  const [showImage, setShowImage] = useState(true);
  const [showPinyin, setShowPinyin] = useState(true);
  const [showThaiReading, setShowThaiReading] = useState(true);
  const [showPinyinGuide, setShowPinyinGuide] = useState(false);

  const [deckSeed, setDeckSeed] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });

  const [ttsState, setTtsState] = useState<TtsAudioState>({
    key: null,
    loading: false,
  });
  const [audioMuted, setAudioMuted] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState<SpeechRatePreset>('clear');
  const [autoPlayWord, setAutoPlayWord] = useState(false);
  const [autoPlaySentence, setAutoPlaySentence] = useState(false);
  const [feedbackToneEnabled, setFeedbackToneEnabled] = useState(true);

  const [playerName, setPlayerName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [department, setDepartment] = useState('HR');
  const [sessionUser, setSessionUser] = useState<AppUser | null>(null);
  const [lastStudyDate, setLastStudyDate] = useState('');
  const [progressLoaded, setProgressLoaded] = useState(false);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [saveMessage, setSaveMessage] = useState('');
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [rankingPeriod, setRankingPeriod] = useState<RankingPeriod>('daily');
  const [playerCount, setPlayerCount] = useState(0);

  const [vocabularySource, setVocabularySource] = useState<VocabSet>('all');
  const [deckMode, setDeckMode] = useState<DeckMode>('smart');

  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [todayDone, setTodayDone] = useState(false);
  const [combo, setCombo] = useState(0);
  const [answerResult, setAnswerResult] = useState<'correct' | 'wrong' | null>(null);
  const [showStreakBurst, setShowStreakBurst] = useState(false);

  const [lives, setLives] = useState(3);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);

  const [weakWordIds, setWeakWordIds] = useState<string[]>([]);
  const [dueReviewIds, setDueReviewIds] = useState<string[]>([]);
  const [smartDeckRefreshKey, setSmartDeckRefreshKey] = useState(0);

  const [reviewQueue, setReviewQueue] = useState<string[]>([]);
  const [reviewSessionTotal, setReviewSessionTotal] = useState(0);
  const [reviewDone, setReviewDone] = useState(false);
  const [sessionCardCount, setSessionCardCount] = useState(0);
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [recommendedWords, setRecommendedWords] = useState<RecommendedWord[]>([]);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [quizHint, setQuizHint] = useState('');
  const [quizHintLoading, setQuizHintLoading] = useState(false);
  const [minimalLearningView, setMinimalLearningView] = useState(true);
  const [showLearningTools, setShowLearningTools] = useState(false);

  const [showManagerDashboard, setShowManagerDashboard] = useState(true);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const sessionStartedAtRef = React.useRef(Date.now());
  const lastSpokenRef = React.useRef<AudioPlaybackTarget | null>(null);
  const lastAutoPlayKeyRef = React.useRef<string>('');
  const autoPlaySequenceRef = React.useRef(0);
  const audioSettingsLoadedRef = React.useRef(false);

  useEffect(() => {
    const savedLearningMode = localStorage.getItem('midea-learning-mode');
    const savedAppMode = localStorage.getItem('midea-app-mode');
    const savedMinimalView = localStorage.getItem('midea-minimal-learning-view');
    const savedAudioMuted = localStorage.getItem('midea-audio-muted');
    const savedAudioSpeed = localStorage.getItem('midea-audio-speed');
    const savedAutoPlayWord = localStorage.getItem('midea-audio-autoplay-word');
    const savedAutoPlaySentence = localStorage.getItem('midea-audio-autoplay-sentence');
    const savedFeedbackTone = localStorage.getItem('midea-audio-feedback-tone');

    if (savedLearningMode === 'thai' || savedLearningMode === 'thai-learns-chinese') {
      setLearningMode('thai-learns-chinese');
    } else if (savedLearningMode === 'chinese' || savedLearningMode === 'chinese-learns-thai') {
      setLearningMode('chinese-learns-thai');
    }

    if (
      savedAppMode === 'flashcards' ||
      savedAppMode === 'quiz' ||
      savedAppMode === 'review'
    ) {
      setMode(savedAppMode);
    }

    if (savedMinimalView === 'false') {
      setMinimalLearningView(false);
    }

    if (
      savedAudioSpeed === 'slow' ||
      savedAudioSpeed === 'clear' ||
      savedAudioSpeed === 'normal'
    ) {
      setAudioSpeed(savedAudioSpeed);
    }

    if (savedAudioMuted === 'true') {
      setAudioMuted(true);
    }

    if (savedAutoPlayWord === 'true') {
      setAutoPlayWord(true);
    }

    if (savedAutoPlaySentence === 'true') {
      setAutoPlaySentence(true);
    }

    if (savedFeedbackTone === 'false') {
      setFeedbackToneEnabled(false);
    }

    audioSettingsLoadedRef.current = true;
  }, []);

  useEffect(() => {
    localStorage.setItem(
      'midea-learning-mode',
      learningMode === 'thai-learns-chinese' ? 'thai' : 'chinese'
    );
  }, [learningMode]);

  useEffect(() => {
    localStorage.setItem('midea-app-mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('midea-minimal-learning-view', minimalLearningView ? 'true' : 'false');
  }, [minimalLearningView]);

  useEffect(() => {
    if (!audioSettingsLoadedRef.current) return;
    localStorage.setItem('midea-audio-muted', audioMuted ? 'true' : 'false');
  }, [audioMuted]);

  useEffect(() => {
    if (audioMuted) {
      stopCurrentAudio();
    }
  }, [audioMuted]);

  useEffect(() => {
    if (!audioSettingsLoadedRef.current) return;
    localStorage.setItem('midea-audio-speed', audioSpeed);
  }, [audioSpeed]);

  useEffect(() => {
    if (!audioSettingsLoadedRef.current) return;
    localStorage.setItem('midea-audio-autoplay-word', autoPlayWord ? 'true' : 'false');
  }, [autoPlayWord]);

  useEffect(() => {
    if (!audioSettingsLoadedRef.current) return;
    localStorage.setItem('midea-audio-autoplay-sentence', autoPlaySentence ? 'true' : 'false');
  }, [autoPlaySentence]);

  useEffect(() => {
    if (!audioSettingsLoadedRef.current) return;
    localStorage.setItem('midea-audio-feedback-tone', feedbackToneEnabled ? 'true' : 'false');
  }, [feedbackToneEnabled]);

  useEffect(() => {
    lastAutoPlayKeyRef.current = '';
  }, [audioMuted, autoPlaySentence, autoPlayWord, learningMode, mode]);

  useEffect(() => {
    let cancelled = false;
    const session = getUserSession();

    if (session) {
      setPlayerName(session.name || '');
      setEmployeeCode(session.employee_code || '');
      setDepartment(session.department || 'HR');

      void refreshUserSession()
        .then((verifiedSession) => {
          if (cancelled) return;

          if (!verifiedSession) {
            setSessionUser(null);
            return;
          }

          setSessionUser(verifiedSession);
          setPlayerName(verifiedSession.name || '');
          setEmployeeCode(verifiedSession.employee_code || '');
          setDepartment(verifiedSession.department || 'HR');
        })
        .catch((error) => {
          if (cancelled) return;
          setSessionUser(null);
          logError('refreshUserSession', error);
        });
    } else {
      const savedName = localStorage.getItem('midea-player-name') || '';
      const savedCode = localStorage.getItem('midea-employee-code') || '';
      const savedDept = localStorage.getItem('midea-department') || 'HR';
      if (savedName) setPlayerName(savedName);
      if (savedCode) setEmployeeCode(savedCode);
      if (savedDept) setDepartment(savedDept);
    }

    const savedLives = Number(localStorage.getItem('midea-lives') || '3');
    const savedXp = Number(localStorage.getItem('midea-xp') || '0');
    const savedLevel = Number(localStorage.getItem('midea-level') || '1');

    setLives(savedLives > 0 ? savedLives : 3);
    setXp(savedXp);
    setLevel(savedLevel > 0 ? savedLevel : 1);

    return () => {
      cancelled = true;
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('midea-lives', String(lives));
    localStorage.setItem('midea-xp', String(xp));
    localStorage.setItem('midea-level', String(level));
  }, [lives, xp, level]);

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      if (!sessionUser?.id) {
        const today = new Date().toISOString().slice(0, 10);
        const savedStreak = Number(localStorage.getItem('midea-streak') || '0');
        const savedBestStreak = Number(localStorage.getItem('midea-best-streak') || '0');
        const savedLastStudyDate = localStorage.getItem('midea-last-study-date') || '';
        const savedTodayDone = localStorage.getItem('midea-today-done') === 'true';
        const savedCombo = Number(localStorage.getItem('midea-combo') || '0');

        if (cancelled) return;

        setStreak(savedStreak);
        setBestStreak(savedBestStreak);
        setCombo(savedCombo);
        setLastStudyDate(savedLastStudyDate);
        setTodayDone(savedLastStudyDate === today && savedTodayDone);
        setProgressLoaded(true);
        return;
      }

      try {
        const progress = await getUserProgress(
          sessionUser.id,
          learningMode,
          vocabularySource
        );

        if (cancelled) return;

        if (progress) {
          setIndex(progress.current_index ?? 0);
          setStreak(progress.streak ?? 0);
          setBestStreak(progress.best_streak ?? 0);
          setCombo(progress.combo ?? 0);
          setTodayDone(Boolean(progress.today_done));
          setLastStudyDate(progress.last_study_date ?? '');
        } else {
          setIndex(0);
          setStreak(0);
          setBestStreak(0);
          setCombo(0);
          setTodayDone(false);
          setLastStudyDate('');
        }
      } catch {
        if (cancelled) return;
      }

      setProgressLoaded(true);
    }

    setProgressLoaded(false);
    void loadProgress();

    return () => {
      cancelled = true;
    };
  }, [sessionUser?.id, learningMode, vocabularySource]);

  useEffect(() => {
    if (!progressLoaded) return;

    localStorage.setItem('midea-streak', String(streak));
    localStorage.setItem('midea-best-streak', String(bestStreak));
    localStorage.setItem('midea-combo', String(combo));
    localStorage.setItem('midea-last-study-date', lastStudyDate);
    localStorage.setItem('midea-today-done', todayDone ? 'true' : 'false');

    if (!sessionUser?.id) return;

    void upsertUserProgress({
      userId: sessionUser.id,
      learningMode,
      vocabSet: vocabularySource,
      currentIndex: index,
      streak,
      bestStreak,
      combo,
      todayDone,
      lastStudyDate,
    });
  }, [
    sessionUser?.id,
    progressLoaded,
    learningMode,
    vocabularySource,
    index,
    streak,
    bestStreak,
    combo,
    todayDone,
    lastStudyDate,
  ]);

  useEffect(() => {
    async function loadSmartDecks() {
      if (!sessionUser?.id) {
        setWeakWordIds([]);
        setDueReviewIds([]);
        return;
      }

      try {
        const [weakRows, dueRows] = await Promise.all([
          getWeakWords({
            userId: sessionUser.id,
            learningMode,
            vocabSet: vocabularySource,
            limit: 50,
          }),
          getDueReviewWords({
            userId: sessionUser.id,
            learningMode,
            vocabSet: vocabularySource,
          }),
        ]);

        setWeakWordIds(weakRows.map((row) => row.card_id));
        setDueReviewIds(dueRows.map((row) => row.card_id));
      } catch {
        setWeakWordIds([]);
        setDueReviewIds([]);
      }
    }

    void loadSmartDecks();
  }, [
    sessionUser?.id,
    learningMode,
    vocabularySource,
    quizScore.total,
    mode,
    smartDeckRefreshKey,
  ]);

  useEffect(() => {
    void loadLeaderboard();
  }, [learningMode, rankingPeriod]);

  useEffect(() => {
    let cancelled = false;

    async function loadUserMetrics() {
      if (!sessionUser?.id) {
        if (!cancelled) setUserMetrics(null);
        return;
      }

      setMetricsLoading(true);

      try {
        const nextMetrics = await getUserMetrics(sessionUser.id);
        if (!cancelled) setUserMetrics(nextMetrics);
      } catch {
        if (!cancelled) setUserMetrics(null);
      } finally {
        if (!cancelled) setMetricsLoading(false);
      }
    }

    void loadUserMetrics();

    return () => {
      cancelled = true;
    };
  }, [sessionUser?.id, learningMode, vocabularySource, smartDeckRefreshKey, quizScore.total]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      if (!sessionUser?.id) {
        if (!cancelled) setRecommendedWords([]);
        return;
      }

      setRecommendationLoading(true);

      try {
        const nextRecommendations = await getRecommendedWords(sessionUser.id, {
          limit: 18,
          learningMode,
          vocabSet: vocabularySource,
        });

        if (!cancelled) setRecommendedWords(nextRecommendations);
      } catch {
        if (!cancelled) setRecommendedWords([]);
      } finally {
        if (!cancelled) setRecommendationLoading(false);
      }
    }

    void loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, [sessionUser?.id, learningMode, vocabularySource, smartDeckRefreshKey, quizScore.total]);

  function getDateRange(period: RankingPeriod) {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const start = new Date(now);

    if (period === 'daily') {
      start.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }

    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }

  async function loadLeaderboard() {
    setLoadingBoard(true);

    const { start, end } = getDateRange(rankingPeriod);
    try {
      const scores = await getDailyScores({
        learningMode,
        dateFrom: start,
        dateTo: end,
      });
      const grouped = new Map<string, LeaderboardEntry>();

      scores.forEach((item) => {
        const key = item.user_id || item.employee_code || item.name;
        if (!grouped.has(key)) {
          grouped.set(key, { ...item, score: Number(item.score) || 0 });
        } else {
          const existing = grouped.get(key)!;
          existing.score += Number(item.score) || 0;
        }
      });

      const sorted = Array.from(grouped.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      setLeaderboard(sorted);
      setPlayerCount(grouped.size);
    } catch (error) {
      logError('loadLeaderboard', error, { learningMode, rankingPeriod });
      setLeaderboard([]);
      setPlayerCount(0);
    } finally {
      setLoadingBoard(false);
    }
  }

  const mergedCards = useMemo<DisplayCard[]>(() => {
    const hskCards = (hsk4Data as readonly Hsk4DataItem[]).map((item, idx) =>
      normalizeCard(item, idx, 'hsk4')
    );
    const factoryCards = (factoryEnglish900th as readonly FactoryDataItem[]).map((item, idx) =>
      normalizeCard(item, idx, 'factory')
    );

    if (vocabularySource === 'hsk4') return hskCards;
    if (vocabularySource === 'factory') return factoryCards;
    return [...hskCards, ...factoryCards];
  }, [vocabularySource]);

  const effectiveCards = useMemo(() => {
    if (combo >= 5 && vocabularySource === 'all') {
      const harder = mergedCards.filter((card) => card.source === 'factory');
      return harder.length ? harder : mergedCards;
    }
    return mergedCards;
  }, [mergedCards, combo, vocabularySource]);

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = [...effectiveCards];

    if (q) {
      result = result.filter((card) =>
        [
          card.zh,
          card.pinyin,
          card.th,
          card.thToZh,
          card.category,
          card.partOfSpeech,
          card.sentenceZh,
          card.sentencePinyin,
          card.sentenceTh,
          card.sentenceEn,
          card.thaiPronunciation,
          card.sentenceThaiPronunciation,
          card.source,
          ...(card.sentenceVariants ?? []).flatMap((variant) => [
            variant.label,
            variant.zh,
            variant.th,
            variant.pinyin,
            variant.en,
            variant.thaiPronunciation,
          ]),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }

    if (deckSeed > 0) result = shuffleArray(result);
    return result;
  }, [query, deckSeed, effectiveCards]);

  const cardById = useMemo(() => {
    return new Map(mergedCards.map((card) => [card.id, card]));
  }, [mergedCards]);

  const fallbackRecommendations = useMemo<RecommendedWord[]>(() => {
    const seen = new Set<string>();
    const recommendations: RecommendedWord[] = [];

    dueReviewIds.forEach((cardId, index) => {
      if (seen.has(cardId)) return;
      const card = cardById.get(cardId);
      if (!card) return;

      seen.add(cardId);
      recommendations.push({
        cardId,
        vocabSet: card.source,
        reason: 'review',
        score: 90 - index,
        accuracy: null,
        nextReviewAt: null,
      });
    });

    weakWordIds.forEach((cardId, index) => {
      if (seen.has(cardId)) return;
      const card = cardById.get(cardId);
      if (!card) return;

      seen.add(cardId);
      recommendations.push({
        cardId,
        vocabSet: card.source,
        reason: 'weak',
        score: 70 - index,
        accuracy: null,
        nextReviewAt: null,
      });
    });

    filteredCards.slice(0, 12).forEach((card, index) => {
      if (seen.has(card.id)) return;

      seen.add(card.id);
      recommendations.push({
        cardId: card.id,
        vocabSet: card.source,
        reason: 'new',
        score: 20 - index,
        accuracy: null,
        nextReviewAt: null,
      });
    });

    return recommendations;
  }, [cardById, dueReviewIds, weakWordIds, filteredCards]);

  const activeRecommendations = useMemo(
    () => (recommendedWords.length > 0 ? recommendedWords : fallbackRecommendations),
    [recommendedWords, fallbackRecommendations]
  );

  const smartDeckCards = useMemo(() => {
    const orderedCards = activeRecommendations
      .map((item) => filteredCards.find((card) => card.id === item.cardId))
      .filter((card): card is DisplayCard => Boolean(card));

    return orderedCards.length > 0 ? orderedCards : filteredCards;
  }, [activeRecommendations, filteredCards]);

  const recommendationSummary = useMemo(() => {
    return activeRecommendations.reduce(
      (summary, item) => {
        summary[item.reason] += 1;
        return summary;
      },
      { review: 0, weak: 0, low_accuracy: 0, new: 0 }
    );
  }, [activeRecommendations]);

  const smartFilteredCards = useMemo(() => {
    if (deckMode === 'smart') {
      return smartDeckCards;
    }

    if (deckMode === 'review') {
      const dueCards = filteredCards.filter((card) => dueReviewIds.includes(card.id));
      return dueCards.length > 0 ? dueCards : filteredCards;
    }

    if (deckMode === 'weak') {
      const weakCards = filteredCards.filter((card) => weakWordIds.includes(card.id));
      return weakCards.length > 0 ? weakCards : filteredCards;
    }

    return filteredCards;
  }, [filteredCards, deckMode, dueReviewIds, weakWordIds, smartDeckCards]);

  const reviewCards = useMemo(() => {
    const reviewIds = deckMode === 'weak' ? weakWordIds : dueReviewIds;
    if (reviewIds.length === 0) return [];

    return reviewIds
      .map((id) => filteredCards.find((card) => card.id === id))
      .filter((card): card is DisplayCard => Boolean(card));
  }, [filteredCards, dueReviewIds, weakWordIds, deckMode]);

  const reviewCardsKey = useMemo(
    () => reviewCards.map((card) => card.id).join('|'),
    [reviewCards]
  );

  const reviewCardMap = useMemo(() => {
    return new Map(reviewCards.map((card) => [card.id, card]));
  }, [reviewCards]);

  const currentReviewCard = reviewQueue.length > 0 ? reviewCardMap.get(reviewQueue[0]) ?? null : null;

  useEffect(() => {
    if (mode !== 'review') return;

    const nextQueue = createReviewQueue(reviewCards.map((card) => card.id));
    setReviewQueue(nextQueue);
    setReviewSessionTotal(nextQueue.length);
    setReviewDone(nextQueue.length === 0);
  }, [mode, reviewCardsKey, reviewCards]);

  useEffect(() => {
    if (!smartFilteredCards.length) return;
    if (index >= smartFilteredCards.length) setIndex(0);
  }, [smartFilteredCards.length, index]);

  useEffect(() => {
    setIndex(0);
    setReviewQueue([]);
    setReviewSessionTotal(0);
    setReviewDone(false);
    resetCardView();
  }, [learningMode, vocabularySource, mode, deckMode]);

  const currentCard = smartFilteredCards[index] ?? null;

  const progress = smartFilteredCards.length
    ? Math.round(((index + 1) / smartFilteredCards.length) * 100)
    : 0;
  const sessionGoal = 20;
  const sessionGoalProgress = Math.min(100, Math.round((sessionCardCount / sessionGoal) * 100));
  const smartDeckCount = smartDeckCards.length;
  const currentCardNumber = Math.min(index + 1, Math.max(smartFilteredCards.length, 1));
  const shouldShowLearningTools = !minimalLearningView || showLearningTools;
  const currentSentenceVariant = useMemo(
    () => getPreferredSentenceVariant(currentCard?.sentenceVariants, 'applied'),
    [currentCard]
  );
  const quizSentenceVariant = useMemo(() => {
    if (!currentCard) return null;

    return (
      currentCard.sentenceVariants?.find((variant) => variant.difficulty === 'challenge') ||
      currentCard.sentenceVariants?.find((variant) => variant.difficulty === 'applied') ||
      currentCard.sentenceVariants?.[0] ||
      null
    );
  }, [currentCard]);
  const deckLabel =
    deckMode === 'smart'
      ? 'Smart session'
      : deckMode === 'review'
      ? 'Review deck'
      : deckMode === 'weak'
      ? 'Weak deck'
      : 'Normal deck';
  const isManagerUser = sessionUser?.role === 'manager' || sessionUser?.role === 'admin';
  const modeOptions: Array<{ key: AppMode; label: string }> = [
    { key: 'flashcards', label: 'Cards' },
    { key: 'quiz', label: 'Quiz' },
    {
      key: 'review',
      label: `Review${dueReviewIds.length > 0 ? ` (${dueReviewIds.length})` : ''}`,
    },
  ];
  const sourceOptions: Array<{ key: VocabSet; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'hsk4', label: 'HSK4' },
    { key: 'factory', label: 'Factory' },
  ];

  function getFlashcardWordTarget(card: DisplayCard): AudioPlaybackTarget {
    if (learningMode === 'thai-learns-chinese') {
      return flipped
        ? { text: card.th, lang: 'th-TH', key: `auto-flash-answer-${card.id}` }
        : { text: card.zh, lang: 'zh-CN', key: `auto-flash-front-${card.id}` };
    }

    return flipped
      ? { text: card.zh, lang: 'zh-CN', key: `auto-flash-answer-${card.id}` }
      : { text: card.th, lang: 'th-TH', key: `auto-flash-front-${card.id}` };
  }

  function getFlashcardSentenceTarget(card: DisplayCard): AudioPlaybackTarget | null {
    const sentenceText =
      learningMode === 'thai-learns-chinese'
        ? currentSentenceVariant?.zh || card.sentenceZh
        : currentSentenceVariant?.th || card.sentenceTh;

    if (!sentenceText) return null;

    return {
      text: sentenceText,
      lang: learningMode === 'thai-learns-chinese' ? 'zh-CN' : 'th-TH',
      key: `auto-flash-sentence-${card.id}`,
    };
  }

  function getQuizWordTarget(card: DisplayCard): AudioPlaybackTarget {
    return {
      text: learningMode === 'thai-learns-chinese' ? card.zh : card.th,
      lang: learningMode === 'thai-learns-chinese' ? 'zh-CN' : 'th-TH',
      key: `auto-quiz-word-${card.id}`,
    };
  }

  function getQuizSentenceTarget(card: DisplayCard): AudioPlaybackTarget | null {
    const sentenceText =
      learningMode === 'thai-learns-chinese'
        ? quizSentenceVariant?.zh || card.sentenceZh
        : quizSentenceVariant?.th || card.sentenceTh;

    if (!sentenceText) return null;

    return {
      text: sentenceText,
      lang: learningMode === 'thai-learns-chinese' ? 'zh-CN' : 'th-TH',
      key: `auto-quiz-sentence-${card.id}`,
    };
  }
  const deckOptions: Array<{ key: DeckMode; label: string; nextMode: AppMode }> = [
    { key: 'smart', label: `Smart (${smartDeckCount})`, nextMode: 'flashcards' },
    { key: 'normal', label: 'Normal', nextMode: 'flashcards' },
    { key: 'review', label: `Review (${dueReviewIds.length})`, nextMode: 'review' },
    { key: 'weak', label: `Weak (${weakWordIds.length})`, nextMode: 'review' },
  ];
  const heroMetrics: Array<{
    label: string;
    value: string | number;
    hideOnMobile?: boolean;
  }> = [
    {
      label: 'Vocabulary Set',
      value:
        vocabularySource === 'all'
          ? 'All'
          : vocabularySource === 'hsk4'
          ? 'HSK4'
          : 'Factory',
    },
    {
      label: 'Current Card',
      value: `${currentCardNumber}/${smartFilteredCards.length || 1}`,
    },
    {
      label: 'Session Goal',
      value: `${Math.min(sessionCardCount, sessionGoal)}/${sessionGoal}`,
    },
    {
      label: 'Streak',
      value: streak,
    },
    {
      label: 'Weak Words',
      value: weakWordIds.length,
      hideOnMobile: true,
    },
    {
      label: 'XP',
      value: xp,
      hideOnMobile: true,
    },
    {
      label: 'Level',
      value: level,
      hideOnMobile: true,
    },
  ];

  function openDeck(nextDeckMode: DeckMode, nextMode: AppMode = mode) {
    setDeckMode(nextDeckMode);
    setMode(nextMode);
    setIndex(0);
    setReviewQueue([]);
    setReviewSessionTotal(0);
    setReviewDone(false);
    resetCardView();
  }

  function getCardVocabSet(card?: DisplayCard | null) {
    return card?.source ?? vocabularySource;
  }

  function resetCardView() {
    stopCurrentAudio();
    setFlipped(false);
    setQuizAnswer('');
    setQuizSubmitted(false);
    setAnswerResult(null);
    setQuizHint('');
    setQuizHintLoading(false);
  }

  function nextCard() {
    if (!smartFilteredCards.length) return;
    setIndex((prev) => (prev + 1) % smartFilteredCards.length);
    resetCardView();
  }

  function prevCard() {
    if (!smartFilteredCards.length) return;
    setIndex((prev) => (prev - 1 + smartFilteredCards.length) % smartFilteredCards.length);
    resetCardView();
  }

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.changedTouches[0].clientX);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (diff > 80) prevCard();
    if (diff < -80) nextCard();
    setTouchStartX(null);
  }

  function handleFlashcardTap() {
    if (!flipped) {
      stopCurrentAudio();
      setFlipped(true);
    }
    else nextCard();
  }

  function claimTodayStudy() {
    const today = new Date().toISOString().slice(0, 10);

    if (lastStudyDate === today) {
      setTodayDone(true);
      return;
    }

    let nextStreak = 1;

    if (lastStudyDate) {
      const prev = new Date(lastStudyDate);
      const curr = new Date(today);
      const diffDays = Math.floor(
        (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) nextStreak = streak + 1;
      else if (diffDays === 0) nextStreak = streak;
      else nextStreak = 1;
    }

    setStreak(nextStreak);
    setBestStreak((prev) => Math.max(prev, nextStreak));
    setTodayDone(true);
    setLastStudyDate(today);
    setShowStreakBurst(true);

    setTimeout(() => setShowStreakBurst(false), 1800);
  }

  function stopCurrentAudio() {
    autoPlaySequenceRef.current += 1;
    stopSpeaking();
    setTtsState({ key: null, loading: false });
  }

  const handleSpeak = React.useCallback(
    async (text?: string, lang: SpeechLang = 'zh-CN', cacheKey?: string) => {
      const cleanText = text?.trim();
      if (!cleanText || audioMuted) {
        setTtsState({ key: null, loading: false });
        return;
      }

      const safeKey = cacheKey ?? cleanText;
      lastSpokenRef.current = { text: cleanText, lang, key: safeKey };

      try {
        setTtsState({ key: safeKey, loading: true });

        await speakText({
          text: cleanText,
          lang,
          ratePreset: audioSpeed,
          onStart: () => setTtsState({ key: safeKey, loading: true }),
          onEnd: () => setTtsState({ key: null, loading: false }),
          onError: () => setTtsState({ key: null, loading: false }),
        });
      } catch (error) {
        setTtsState({ key: null, loading: false });
        logError('handleSpeak', error, { lang, key: safeKey, text: cleanText });
      }
    },
    [audioMuted, audioSpeed]
  );

  const handleRepeatAudio = React.useCallback(() => {
    const lastSpoken = lastSpokenRef.current;
    if (!lastSpoken) return;
    void handleSpeak(lastSpoken.text, lastSpoken.lang, `${lastSpoken.key}-repeat`);
  }, [handleSpeak]);

  const playAnswerFeedbackTone = React.useCallback(
    (result: 'correct' | 'wrong') => {
      if (audioMuted || !feedbackToneEnabled) return;

      void playFeedbackTone(result).catch((error) => {
        logError('playFeedbackTone', error, { result });
      });
    },
    [audioMuted, feedbackToneEnabled]
  );

  const runAutoPlaySequence = React.useCallback(
    async (targets: AudioPlaybackTarget[]) => {
      if (audioMuted || targets.length === 0) return;

      const sequenceId = autoPlaySequenceRef.current + 1;
      autoPlaySequenceRef.current = sequenceId;

      for (const target of targets) {
        if (sequenceId !== autoPlaySequenceRef.current) return;
        await handleSpeak(target.text, target.lang, target.key);
      }
    },
    [audioMuted, handleSpeak]
  );

  useEffect(() => {
    if (!audioSettingsLoadedRef.current) return;
    if (audioMuted || (!autoPlayWord && !autoPlaySentence)) return;

    const targets: AudioPlaybackTarget[] = [];

    if (mode === 'flashcards' && currentCard) {
      if (autoPlayWord) {
        targets.push(getFlashcardWordTarget(currentCard));
      }

      if (showSentence && autoPlaySentence) {
        const sentenceTarget = getFlashcardSentenceTarget(currentCard);
        if (sentenceTarget) {
          targets.push(sentenceTarget);
        }
      }
    }

    if (mode === 'quiz' && currentCard) {
      if (autoPlayWord) {
        targets.push(getQuizWordTarget(currentCard));
      }

      if (showSentence && autoPlaySentence) {
        const sentenceTarget = getQuizSentenceTarget(currentCard);
        if (sentenceTarget) {
          targets.push(sentenceTarget);
        }
      }
    }

    const sequenceKey = targets.map((target) => target.key).join('|');
    if (!sequenceKey || lastAutoPlayKeyRef.current === sequenceKey) return;

    lastAutoPlayKeyRef.current = sequenceKey;
    void runAutoPlaySequence(targets);
  }, [
    audioMuted,
    autoPlaySentence,
    autoPlayWord,
    currentCard,
    flipped,
    learningMode,
    mode,
    runAutoPlaySequence,
    showSentence,
  ]);

  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, []);

  const audioSystemPanel = (
    <div className="space-y-3 rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[#163047]">
          <Volume2 className="h-4 w-4 text-[#2EA7E0]" />
          <p className="text-sm font-semibold">Audio System</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#6B7C8F]">
          {audioMuted ? 'Muted' : ttsState.loading ? 'Playing' : 'Ready'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setAudioMuted((value) => !value)}
          className={cn(
            'rounded-2xl px-4 py-3 text-sm font-semibold',
            audioMuted ? 'duo-chip-inactive' : 'duo-chip-active'
          )}
        >
          {audioMuted ? 'Audio Muted' : 'Audio On'}
        </button>
        <button
          type="button"
          onClick={() => setFeedbackToneEnabled((value) => !value)}
          className={cn(
            'rounded-2xl px-4 py-3 text-sm font-semibold',
            feedbackToneEnabled ? 'duo-chip-active' : 'duo-chip-inactive'
          )}
        >
          {feedbackToneEnabled ? 'Feedback Tone On' : 'Feedback Tone Off'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setAutoPlayWord((value) => !value)}
          className={cn(
            'rounded-2xl px-4 py-3 text-sm font-semibold',
            autoPlayWord ? 'duo-chip-active' : 'duo-chip-inactive'
          )}
        >
          {autoPlayWord ? 'Auto Word On' : 'Auto Word Off'}
        </button>
        <button
          type="button"
          onClick={() => setAutoPlaySentence((value) => !value)}
          className={cn(
            'rounded-2xl px-4 py-3 text-sm font-semibold',
            autoPlaySentence ? 'duo-chip-active' : 'duo-chip-inactive'
          )}
        >
          {autoPlaySentence ? 'Auto Sentence On' : 'Auto Sentence Off'}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7C8F]">
          <Gauge className="h-4 w-4 text-[#2EA7E0]" />
          Speech Speed
        </div>
        <div className="grid grid-cols-3 gap-2">
          {AUDIO_SPEED_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setAudioSpeed(option.key)}
              className={cn(
                'rounded-xl px-3 py-2 text-sm font-semibold',
                audioSpeed === option.key ? 'duo-chip-active' : 'duo-chip-inactive'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleRepeatAudio}
          className="duo-secondary flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm"
        >
          <Repeat2 className="h-4 w-4" />
          Repeat
        </button>
        <button
          type="button"
          onClick={stopCurrentAudio}
          className="duo-secondary flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm"
        >
          {audioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          Stop
        </button>
      </div>
    </div>
  );

  async function handleReviewRate(cardId: string, rating: ReviewRating) {
    const isCorrect = rating !== 'again';
    const ratedCard = cardById.get(cardId);

    claimTodayStudy();

    if (sessionUser?.id && ratedCard) {
      await recordWordReviewRating({
        userId: sessionUser.id,
        cardId,
        learningMode,
        vocabSet: getCardVocabSet(ratedCard),
        rating,
      });
    }

    setSmartDeckRefreshKey((prev) => prev + 1);

    if (isCorrect) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      const gainedXp = rating === 'easy' ? 20 : rating === 'hard' ? 6 : 10;
      const nextXp = xp + gainedXp;
      setXp(nextXp);
      setLevel(Math.floor(nextXp / 100) + 1);
    } else {
      setCombo(0);
      setLives((prev) => Math.max(prev - 1, 0));
    }

    setSessionCardCount((prev) => prev + 1);
    setAnswerResult(isCorrect ? 'correct' : 'wrong');
    playAnswerFeedbackTone(isCorrect ? 'correct' : 'wrong');
    setTimeout(() => setAnswerResult(null), 700);

    setReviewQueue((prev) => {
      const nextQueue = applyRatingToReviewQueue(prev, cardId, rating);
      setReviewDone(nextQueue.length === 0);
      return nextQueue;
    });
  }

  const quizInstruction =
    learningMode === 'thai-learns-chinese'
      ? 'Choose the correct Thai meaning'
      : 'Choose the correct Chinese word';

  const quizPromptMain =
    learningMode === 'thai-learns-chinese' ? currentCard?.zh : currentCard?.th;

  const quizPromptSecondary =
    learningMode === 'thai-learns-chinese'
      ? currentCard?.pinyin
      : showThaiReading
      ? currentCard?.thaiPronunciation
      : '';

  const quizChoices = useMemo(() => {
    if (!currentCard) return [];

    if (learningMode === 'thai-learns-chinese') {
      const pool = shuffleArray(
        smartFilteredCards
          .filter((card) => card.th !== currentCard.th)
          .map((card) => card.th)
      ).slice(0, 3);

      return shuffleArray([currentCard.th, ...pool]);
    }

    const pool = shuffleArray(
      smartFilteredCards
        .filter((card) => card.zh !== currentCard.zh)
        .map((card) => card.zh)
    ).slice(0, 3);

    return shuffleArray([currentCard.zh, ...pool]);
  }, [currentCard, learningMode, smartFilteredCards]);

  const correctAnswer =
    learningMode === 'thai-learns-chinese' ? currentCard?.th : currentCard?.zh;

  function submitQuiz(answer: string) {
    if (!currentCard || quizSubmitted || lives === 0) return;

    const isCorrect = answer === correctAnswer;

    if (sessionUser?.id && currentCard) {
      void recordWordResult({
        userId: sessionUser.id,
        cardId: currentCard.id,
        learningMode,
        vocabSet: getCardVocabSet(currentCard),
        isCorrect,
      }).finally(() => setSmartDeckRefreshKey((prev) => prev + 1));
    }

    setQuizAnswer(answer);
    setQuizSubmitted(true);
    setAnswerResult(isCorrect ? 'correct' : 'wrong');
    playAnswerFeedbackTone(isCorrect ? 'correct' : 'wrong');

    setQuizScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
    setSessionCardCount((prev) => prev + 1);
    claimTodayStudy();

    if (isCorrect) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setQuizHint('');
      setQuizHintLoading(false);

      const gainedXp = nextCombo >= 3 ? 15 : 10;
      const nextXp = xp + gainedXp;
      setXp(nextXp);
      setLevel(Math.floor(nextXp / 100) + 1);
    } else {
      setCombo(0);
      setLives((prev) => Math.max(prev - 1, 0));
      setQuizHint('');
      setQuizHintLoading(true);

      void generateHint({
        zh: currentCard.zh,
        th: currentCard.th,
        pinyin: currentCard.pinyin,
        category: currentCard.category,
      })
        .then((hint) => setQuizHint(hint))
        .finally(() => setQuizHintLoading(false));
    }

    setTimeout(() => {
      setAnswerResult(null);
      nextCard();
    }, isCorrect ? 900 : 1800);
  }

  useEffect(() => {
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

        if (mode === 'flashcards') {
          handleFlashcardTap();
          return;
        }

        if (mode === 'review') {
          return;
        }

        if (mode === 'quiz' && quizSubmitted) {
          nextCard();
        }
        return;
      }

      if (mode !== 'quiz' || quizSubmitted || lives === 0) return;

      const answerIndex = Number(event.key) - 1;
      if (answerIndex >= 0 && answerIndex < quizChoices.length) {
        event.preventDefault();
        submitQuiz(quizChoices[answerIndex]);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, quizSubmitted, lives, quizChoices, flipped]);

  function resetAll() {
    setQuery('');
    setIndex(0);
    setDeckSeed(0);
    setMode('flashcards');
    setLearningMode('thai-learns-chinese');
    setShowSentence(true);
    setShowImage(true);
    setShowPinyin(true);
    setShowThaiReading(false);
    setShowPinyinGuide(false);
    setQuizScore({ correct: 0, total: 0 });
    setRankingPeriod('daily');
    setVocabularySource('all');
    setDeckMode('smart');
    setCombo(0);
    setLives(3);
    setXp(0);
    setLevel(1);
    setReviewQueue([]);
    setReviewSessionTotal(0);
    setReviewDone(false);
    setSessionCardCount(0);
    resetCardView();

    localStorage.setItem('midea-app-mode', 'flashcards');
    localStorage.setItem('midea-learning-mode', 'thai');
  }

  function shuffleCards() {
    stopCurrentAudio();
    setDeckSeed((prev) => prev + 1);
    setIndex(0);
    resetCardView();
  }

  async function saveTodayScore() {
    const trimmedName = playerName.trim();
    const trimmedCode = employeeCode.trim();

    if (!sessionUser?.id) {
      setSaveMessage('Please sign in again before saving score');
      setTimeout(() => setSaveMessage(''), 2000);
      return;
    }

    if (!trimmedName) {
      setSaveMessage('Please enter learner name');
      setTimeout(() => setSaveMessage(''), 2000);
      return;
    }

    localStorage.setItem('midea-player-name', trimmedName);
    localStorage.setItem('midea-employee-code', trimmedCode);
    localStorage.setItem('midea-department', department);

    updateUserSession({
      name: trimmedName,
      employee_code: trimmedCode,
      department,
    });

    const today = new Date().toISOString().slice(0, 10);
    const score = quizScore.correct + xp;
    const sessionSeconds = Math.max(
      0,
      Math.round((Date.now() - sessionStartedAtRef.current) / 1000)
    );

    try {
      await saveDailyScore({
        user: {
          id: sessionUser.id,
          name: sessionUser.name,
          employee_code: sessionUser.employee_code,
          department: sessionUser.department,
        },
        learningMode,
        score,
        scoreDate: today,
        sessionSeconds,
        correctAnswers: quizScore.correct,
        wrongAnswers: Math.max(quizScore.total - quizScore.correct, 0),
        cardsCompleted: sessionCardCount,
      });

      await loadLeaderboard();
      setSaveMessage('Score saved successfully');
    } catch (error) {
      logError('saveTodayScore', error, {
        userId: sessionUser.id,
        learningMode,
        today,
      });
      setSaveMessage('Save failed');
    } finally {
      setTimeout(() => setSaveMessage(''), 2000);
    }
  }

  if (!currentCard && mode !== 'review') {
    return (
      <div className="w-full bg-[#F4FAFD] mobile-shell p-3 pt-safe sm:p-4 md:p-8">
        <CardShell className="mx-auto max-w-3xl p-10 text-center">
          <h1 className="text-2xl font-bold text-[#163047]">
            {deckMode === 'review'
              ? 'No review words due'
              : deckMode === 'smart'
              ? 'No smart recommendations yet'
              : deckMode === 'weak'
              ? 'No weak words yet'
              : 'No vocabulary found'}
          </h1>
          <p className="mt-3 text-slate-500">
            {deckMode === 'normal'
              ? 'Please try another search keyword.'
              : deckMode === 'smart'
              ? 'Study a few cards first so the system can prioritize your next best words.'
              : 'Switch back to Normal deck or continue studying to generate review data.'}
          </p>
        </CardShell>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#F4FAFD] mobile-shell p-3 pt-safe sm:p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <CardShell className="overflow-hidden bg-white">
          <div className="flex flex-col gap-5 bg-gradient-to-r from-[#58CC02] via-[#72D620] to-[#14B8A6] p-4 text-white sm:p-5 md:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-semibold sm:text-sm">
                  <Building2 className="h-4 w-4" />
                  Today&apos;s mission
                </div>

                <h1 className="text-2xl font-bold leading-tight sm:text-3xl md:text-5xl">
                  Learn like a lesson game
                </h1>

                <p className="text-sm text-white/90 sm:text-base md:text-lg">
                  Quick rounds, clear progress, smart review, and speaking practice for every shift.
                </p>

                <div className="hide-scrollbar -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
                  <button
                    onClick={() => {
                      setLearningMode('thai-learns-chinese');
                      localStorage.setItem('midea-learning-mode', 'thai');
                      resetCardView();
                    }}
                    className={cn(
                      'h-11 min-w-[220px] rounded-2xl px-4 text-sm font-semibold sm:min-w-0 sm:text-base',
                      learningMode === 'thai-learns-chinese'
                        ? 'duo-secondary border-white bg-white text-[#3E5B1A]'
                        : 'border-white/40 bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]'
                    )}
                  >
                    Thai Staff Learning Chinese
                  </button>

                  <button
                    onClick={() => {
                      setLearningMode('chinese-learns-thai');
                      localStorage.setItem('midea-learning-mode', 'chinese');
                      resetCardView();
                    }}
                    className={cn(
                      'h-11 min-w-[220px] rounded-2xl px-4 text-sm font-semibold sm:min-w-0 sm:text-base',
                      learningMode === 'chinese-learns-thai'
                        ? 'duo-secondary border-white bg-white text-[#3E5B1A]'
                        : 'border-white/40 bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]'
                    )}
                  >
                    Chinese Staff Learning Thai
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
                {heroMetrics.map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      'rounded-2xl border border-white/25 bg-white/15 p-3 backdrop-blur sm:p-4',
                      item.hideOnMobile && 'hidden sm:block'
                    )}
                  >
                    <p className="text-[11px] text-white/80 sm:text-sm">{item.label}</p>
                    <p className="text-xl font-bold text-white sm:text-2xl">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardShell>

        {showManagerDashboard && isManagerUser && (
            <div className="mb-6">
              <ManagerDashboard sessionUser={sessionUser} />
            </div>
          )}

        {showStreakBurst && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-amber-700"
          >
            <div className="flex items-center justify-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4" />
              Streak updated! Keep going {'\u{1F525}'}
            </div>
          </motion.div>
        )}

        <CardShell className="xl:hidden border-[#D9E7F0] bg-white">
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-rose-500">
                {[1, 2, 3].map((heart) => (
                  <Heart
                    key={heart}
                    className={cn('h-5 w-5', heart <= lives ? 'fill-current' : 'opacity-25')}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 text-xs font-semibold">
                <span className="rounded-full bg-[#F3FBE8] px-3 py-2 text-[#36521A]">
                  XP {xp}
                </span>
                <span className="rounded-full bg-amber-50 px-3 py-2 text-amber-700">
                  Streak {streak}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#163047]">Study Mode</p>
              <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {modeOptions.map((m) => (
                  <button
                    key={m.key}
                    className={cn(
                      'h-11 min-w-[112px] rounded-full px-4 text-sm font-semibold',
                      mode === m.key
                        ? 'duo-chip-active'
                        : 'duo-chip-inactive'
                    )}
                    onClick={() => {
                      setMode(m.key);
                      localStorage.setItem('midea-app-mode', m.key);
                      setReviewQueue([]);
                      setReviewSessionTotal(0);
                      setReviewDone(false);
                      resetCardView();
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#163047]">Vocabulary Set</p>
              <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {sourceOptions.map((source) => (
                  <button
                    key={source.key}
                    onClick={() => {
                      setVocabularySource(source.key);
                      setIndex(0);
                      resetCardView();
                    }}
                    className={cn(
                      'min-w-[90px] rounded-2xl px-4 py-2.5 text-sm font-semibold',
                      vocabularySource === source.key ? 'duo-chip-active' : 'duo-chip-inactive'
                    )}
                  >
                    {source.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#163047]">Study Deck</p>
                <span className="rounded-full bg-[#F3FBE8] px-3 py-1 text-[11px] font-semibold text-[#58CC02]">
                  {deckLabel}
                </span>
              </div>

              <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {deckOptions.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => openDeck(item.key, item.nextMode)}
                    className={cn(
                      'min-w-[108px] rounded-2xl px-4 py-2.5 text-sm font-semibold',
                      deckMode === item.key ? 'duo-chip-active' : 'duo-chip-inactive'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-[#F8FDEB] p-3 text-center">
                <p className="text-[11px] text-[#6B7C8F]">Due</p>
                <p className="mt-1 text-base font-bold text-[#163047]">{recommendationSummary.review}</p>
              </div>
              <div className="rounded-2xl bg-[#F8FDEB] p-3 text-center">
                <p className="text-[11px] text-[#6B7C8F]">Weak</p>
                <p className="mt-1 text-base font-bold text-[#163047]">
                  {recommendationSummary.weak + recommendationSummary.low_accuracy}
                </p>
              </div>
              <div className="rounded-2xl bg-[#F8FDEB] p-3 text-center">
                <p className="text-[11px] text-[#6B7C8F]">New</p>
                <p className="mt-1 text-base font-bold text-[#163047]">{recommendationSummary.new}</p>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7C8F]" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIndex(0);
                  resetCardView();
                }}
                placeholder="Search Chinese / Thai / Pinyin"
                className="h-12 w-full rounded-2xl border border-[#D8E9C9] bg-white pl-10 pr-3 text-base text-[#163047] outline-none placeholder:text-[#9BAABA]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                className={cn(
                  'h-11 rounded-2xl text-sm font-semibold',
                  showSentence ? 'duo-chip-active' : 'duo-chip-inactive'
                )}
                onClick={() => setShowSentence((value) => !value)}
              >
                {showSentence ? 'Sentence On' : 'Sentence Off'}
              </button>
              <button
                className={cn(
                  'h-11 rounded-2xl text-sm font-semibold',
                  showImage ? 'duo-chip-active' : 'duo-chip-inactive'
                )}
                onClick={() => setShowImage((value) => !value)}
              >
                {showImage ? 'Image On' : 'Image Off'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                className="duo-secondary flex h-11 items-center justify-center rounded-2xl"
                onClick={shuffleCards}
              >
                <Shuffle className="mr-2 h-4 w-4" />
                Shuffle
              </button>

              <button
                className="duo-secondary flex h-11 items-center justify-center rounded-2xl"
                onClick={resetAll}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 xl:hidden">
              <button
                type="button"
                onClick={() => setAudioMuted((value) => !value)}
                className={cn(
                  'flex h-11 items-center justify-center gap-2 rounded-2xl text-xs font-semibold',
                  audioMuted ? 'duo-chip-inactive' : 'duo-chip-active'
                )}
              >
                {audioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                {audioMuted ? 'Muted' : 'Audio'}
              </button>
              <button
                type="button"
                onClick={handleRepeatAudio}
                className="duo-secondary flex h-11 items-center justify-center gap-2 rounded-2xl text-xs font-semibold"
              >
                <Repeat2 className="h-4 w-4" />
                Repeat
              </button>
              <button
                type="button"
                onClick={stopCurrentAudio}
                className="duo-secondary flex h-11 items-center justify-center gap-2 rounded-2xl text-xs font-semibold"
              >
                <Volume2 className="h-4 w-4" />
                Stop
              </button>
            </div>
          </div>
        </CardShell>

        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <CardShell className="order-2 self-start border-[#D9E7F0] bg-white xl:order-1 xl:sticky xl:top-6">
            <div className="space-y-4 p-5">
              <div className="hidden rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4 xl:block">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-rose-500">
                    {[1, 2, 3].map((heart) => (
                      <Heart
                        key={heart}
                        className={cn('h-5 w-5', heart <= lives ? 'fill-current' : 'opacity-25')}
                      />
                    ))}
                  </div>

                  <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#163047]">
                    XP {xp} | Lv.{level}
                  </div>
                </div>
              </div>

              <div className="hidden gap-2 xl:flex">
                {modeOptions.map((m) => (
                  <button
                    key={m.key}
                    className={cn(
                      'h-11 flex-1 rounded-full text-xs font-semibold',
                      mode === m.key ? 'duo-chip-active' : 'duo-chip-inactive'
                    )}
                    onClick={() => {
                      setMode(m.key);
                      localStorage.setItem('midea-app-mode', m.key);
                      setReviewQueue([]);
                      setReviewSessionTotal(0);
                      setReviewDone(false);
                      resetCardView();
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="hidden rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4 xl:block">
                <p className="mb-3 text-sm font-semibold text-[#163047]">Vocabulary Set</p>
                <div className="grid grid-cols-3 gap-2">
                  {sourceOptions.map((source) => (
                    <button
                      key={source.key}
                      onClick={() => {
                        setVocabularySource(source.key);
                        setIndex(0);
                        resetCardView();
                      }}
                      className={cn(
                        'rounded-xl px-3 py-2 text-sm font-semibold',
                        vocabularySource === source.key ? 'duo-chip-active' : 'duo-chip-inactive'
                      )}
                    >
                      {source.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="hidden rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4 xl:block">
                <p className="mb-3 text-sm font-semibold text-[#163047]">Study Deck</p>
                <div className="grid grid-cols-2 gap-2">
                  {deckOptions.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => openDeck(item.key, item.nextMode)}
                      className={cn(
                        'rounded-xl px-3 py-2 text-xs font-semibold',
                        deckMode === item.key ? 'duo-chip-active' : 'duo-chip-inactive'
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#D9E7F0] bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#163047]">Today&apos;s Focus</p>
                    <p className="text-xs text-[#6B7C8F]">
                      Smart queue mixes due review, weak words, and new items.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#F3FBE8] px-3 py-1 text-xs font-semibold text-[#58CC02]">
                    {recommendationLoading ? 'Syncing...' : `${smartDeckCount} cards`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-[#F8FDEB] p-3 text-center">
                    <p className="text-[11px] text-[#6B7C8F]">Due</p>
                    <p className="mt-1 text-lg font-bold text-[#163047]">
                      {recommendationSummary.review}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F8FDEB] p-3 text-center">
                    <p className="text-[11px] text-[#6B7C8F]">Weak</p>
                    <p className="mt-1 text-lg font-bold text-[#163047]">
                      {recommendationSummary.weak + recommendationSummary.low_accuracy}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F8FDEB] p-3 text-center">
                    <p className="text-[11px] text-[#6B7C8F]">New</p>
                    <p className="mt-1 text-lg font-bold text-[#163047]">
                      {recommendationSummary.new}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2">
                  <button
                    onClick={() => openDeck('smart', 'flashcards')}
                    className="duo-primary h-11 rounded-2xl px-4 text-sm font-semibold"
                  >
                    Start Smart Session
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openDeck('review', 'review')}
                      className="duo-secondary h-11 rounded-2xl px-4 text-sm font-medium"
                    >
                      Review Due
                    </button>
                    <button
                      onClick={() => openDeck('weak', 'review')}
                      className="duo-secondary h-11 rounded-2xl px-4 text-sm font-medium"
                    >
                      Weak Rescue
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-center gap-2 text-orange-700">
                    <Flame className="h-4 w-4" />
                    <span className="text-sm font-medium">Daily Streak</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-orange-800">{streak}</div>
                  <div className="mt-1 text-xs text-orange-700">
                    {todayDone ? 'Today completed' : 'Study today to keep it'}
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-amber-700">
                    <Star className="h-4 w-4" />
                    <span className="text-sm font-medium">Best / Combo</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-amber-800">
                    {bestStreak} / {combo}
                  </div>
                  <div className="mt-1 text-xs text-amber-700">Best streak / live combo</div>
                </div>
              </div>

              <div className="grid gap-2">
                <button
                  className={cn(
                    'h-11 w-full rounded-2xl text-sm font-semibold',
                    showSentence ? 'duo-chip-active' : 'duo-chip-inactive'
                  )}
                  onClick={() => setShowSentence((v) => !v)}
                >
                  {showSentence ? 'Sentence Mode: ON' : 'Sentence Mode: OFF'}
                </button>

                <button
                  className={cn(
                    'h-11 w-full rounded-2xl text-sm font-semibold',
                    showImage ? 'duo-chip-active' : 'duo-chip-inactive'
                  )}
                  onClick={() => setShowImage((v) => !v)}
                >
                  {showImage ? 'Image Mode: ON' : 'Image Mode: OFF'}
                </button>
              </div>

              <div className="space-y-2 rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4">
                <p className="text-sm font-semibold text-[#163047]">Pronunciation Tools</p>

                <button
                  onClick={() => setShowPinyin((v) => !v)}
                  className="duo-secondary w-full rounded-2xl px-4 py-3 text-sm"
                >
                  {showPinyin ? 'Hide Pinyin' : 'Show Pinyin'}
                </button>

                <button
                  onClick={() => setShowThaiReading((v) => !v)}
                  className="duo-secondary w-full rounded-2xl px-4 py-3 text-sm"
                >
                  {showThaiReading ? 'Hide Thai Reading' : 'Show Thai Reading'}
                </button>

                <button
                  onClick={() => setShowPinyinGuide((v) => !v)}
                  className="duo-secondary w-full rounded-2xl px-4 py-3 text-sm"
                >
                  {showPinyinGuide ? 'Hide Tone Guide' : 'Show Tone Guide'}
                </button>
              </div>

              {audioSystemPanel}

              {showPinyinGuide && (
                <div className="rounded-2xl border border-[#D9E7F0] bg-white p-4">
                  <p className="mb-3 text-sm font-semibold text-[#163047]">Pinyin Tone Guide</p>
                  <div className="grid gap-2 text-sm text-slate-700">
                    <div className="rounded-xl bg-[#F8FCFE] p-3">
                      <span className="font-semibold">Tone 1:</span>{' '}
                      {'\u0101 \u0113 \u012b \u014d \u016b \u01d6'}
                    </div>
                    <div className="rounded-xl bg-[#F8FCFE] p-3">
                      <span className="font-semibold">Tone 2:</span>{' '}
                      {'\u00e1 \u00e9 \u00ed \u00f3 \u00fa \u01d8'}
                    </div>
                    <div className="rounded-xl bg-[#F8FCFE] p-3">
                      <span className="font-semibold">Tone 3:</span>{' '}
                      {'\u01ce \u011b \u01d0 \u01d2 \u01d4 \u01da'}
                    </div>
                    <div className="rounded-xl bg-[#F8FCFE] p-3">
                      <span className="font-semibold">Tone 4:</span>{' '}
                      {'\u00e0 \u00e8 \u00ec \u00f2 \u00f9 \u01dc'}
                    </div>
                  </div>
                </div>
              )}

              <div className="hidden xl:block">
                <p className="mb-2 text-sm font-medium text-[#163047]">Search Vocabulary</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7C8F]" />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setIndex(0);
                      resetCardView();
                    }}
                    placeholder="Search Chinese / Thai / Pinyin"
                    className="h-11 w-full rounded-2xl border border-[#D8E9C9] bg-white pl-9 pr-3 text-base text-[#163047] outline-none placeholder:text-[#9BAABA]"
                  />
                </div>
              </div>

              <div className="hidden flex-col gap-2 sm:flex-row xl:flex">
                <button
                  className="flex h-11 flex-1 items-center justify-center rounded-2xl border border-[#D9E7F0] bg-white text-[#163047]"
                  onClick={shuffleCards}
                >
                  <Shuffle className="mr-2 h-4 w-4" />
                  Shuffle
                </button>

                <button
                  className="flex h-11 flex-1 items-center justify-center rounded-2xl border border-[#D9E7F0] bg-white text-[#163047]"
                  onClick={resetAll}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </button>
              </div>

              <div className="space-y-3 rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4">
                <div className="flex justify-between text-sm text-[#6B7C8F]">
                  <span>Completion Rate</span>
                  <span>{progress}%</span>
                </div>
                <div className="duo-progress-track h-3 overflow-hidden rounded-full">
                  <motion.div
                    className="duo-progress-fill h-full rounded-full"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.35 }}
                  />
                </div>

                <div className="mt-4 flex justify-between text-sm text-[#6B7C8F]">
                  <span>Daily Goal</span>
                  <span>
                    {Math.min(sessionCardCount, sessionGoal)}/{sessionGoal}
                  </span>
                </div>
                <div className="duo-progress-track h-3 overflow-hidden rounded-full">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#FACC4D] to-[#FF9F1C]"
                    animate={{ width: `${sessionGoalProgress}%` }}
                    transition={{ duration: 0.35 }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#D9E7F0] bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#6B7C8F]" />
                  <p className="font-semibold text-[#163047]">Learner Profile</p>
                </div>

                <div className="space-y-2">
                  <input
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Learner Name"
                    className="h-11 w-full rounded-2xl border border-[#D9E7F0] bg-white px-3 text-[#163047] outline-none placeholder:text-[#9BAABA]"
                  />

                  <input
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="Employee ID"
                    className="h-11 w-full rounded-2xl border border-[#D9E7F0] bg-white px-3 text-[#163047] outline-none placeholder:text-[#9BAABA]"
                  />

                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-[#D9E7F0] bg-white px-3 text-[#163047] outline-none"
                  >
                    {DEPARTMENTS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      void (async () => {
                        if (!playerName.trim()) return;

                        if (sessionUser?.id) {
                          try {
                            const response = await fetch('/api/session/profile', {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              credentials: 'include',
                              body: JSON.stringify({
                                name: playerName.trim(),
                                department,
                              }),
                            });

                            const payload = (await response.json()) as {
                              user?: AppUser;
                              error?: string;
                            };

                            if (!response.ok || !payload.user) {
                              throw new Error(payload.error || 'Unable to save profile');
                            }

                            setSessionUser(payload.user);
                            setPlayerName(payload.user.name);
                            setEmployeeCode(payload.user.employee_code);
                            setDepartment(payload.user.department);
                            updateUserSession(payload.user);
                            localStorage.setItem('midea-player-name', payload.user.name);
                            localStorage.setItem('midea-employee-code', payload.user.employee_code);
                            localStorage.setItem('midea-department', payload.user.department);
                            setSaveMessage('Profile saved');
                          } catch (error) {
                            logError('saveProfile', error);
                            setSaveMessage('Profile save failed');
                          }
                        } else {
                          localStorage.setItem('midea-player-name', playerName.trim());
                          localStorage.setItem('midea-employee-code', employeeCode.trim());
                          localStorage.setItem('midea-department', department);
                          setSaveMessage('Profile saved');
                        }

                        setTimeout(() => setSaveMessage(''), 1500);
                      })();
                    }}
                    className="duo-primary h-11 w-full rounded-2xl px-4 font-semibold"
                  >
                    Save Profile
                  </button>
                </div>
              </div>

              <AnalyticsPanel metrics={userMetrics} loading={metricsLoading} />

              <div className="rounded-2xl border border-[#D9E7F0] bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-[#2EA7E0]" />
                    <p className="font-semibold text-[#163047]">
                      {rankingPeriod === 'daily'
                        ? 'Daily Ranking'
                        : rankingPeriod === 'weekly'
                        ? 'Weekly Ranking'
                        : 'Monthly Ranking'}
                    </p>
                  </div>

                  <button
                    onClick={() => void loadLeaderboard()}
                    className="text-sm text-[#6B7C8F] hover:text-[#163047]"
                  >
                    Refresh
                  </button>
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  {(['daily', 'weekly', 'monthly'] as RankingPeriod[]).map((period) => (
                    <button
                      key={period}
                      onClick={() => setRankingPeriod(period)}
                      className={cn(
                        'rounded-xl px-3 py-2 text-sm font-semibold',
                        rankingPeriod === period ? 'duo-chip-active' : 'duo-chip-inactive'
                      )}
                    >
                      {period === 'daily'
                        ? 'Daily'
                        : period === 'weekly'
                        ? 'Weekly'
                        : 'Monthly'}
                    </button>
                  ))}
                </div>

                <div className="mb-3 rounded-xl bg-[#F8FCFE] px-3 py-2 text-sm text-[#163047]">
                  Active players: <span className="font-semibold">{playerCount}</span>
                </div>

                {isManagerUser && (
                  <button
                    onClick={() => setShowManagerDashboard((v) => !v)}
                    className={cn(
                      'mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold',
                      showManagerDashboard ? 'duo-chip-active' : 'duo-chip-inactive'
                    )}
                  >
                    <Shield className="h-4 w-4" />
                    {showManagerDashboard ? 'Hide Dashboard' : 'Manager Dashboard'}
                  </button>
                )}

                <button
                  onClick={() => void saveTodayScore()}
                  className="duo-primary mb-3 h-11 w-full rounded-2xl px-4 font-medium"
                >
                  Save Today Score
                </button>

                {saveMessage && (
                  <p className="mb-3 rounded-xl bg-[#F8FCFE] px-3 py-2 text-sm text-[#6B7C8F]">
                    {saveMessage}
                  </p>
                )}

                {loadingBoard ? (
                  <p className="text-sm text-[#6B7C8F]">Loading leaderboard...</p>
                ) : leaderboard.length === 0 ? (
                  <p className="text-sm text-[#6B7C8F]">
                    No {rankingPeriod} score data yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((p, i) => (
                      <div
                        key={`${p.id ?? p.name}-${i}`}
                        className="rounded-xl bg-[#F8FCFE] px-3 py-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-[#2EA7E0]">
                              {i + 1}
                            </span>
                            <span className="font-medium text-[#163047]">{p.name}</span>
                          </div>
                          <span className="font-semibold text-[#163047]">{p.score}</span>
                        </div>

                        <div className="mt-1 pl-8 text-xs text-[#6B7C8F]">
                          {(p.department || 'No department') +
                            (p.employee_code ? ` | ${p.employee_code}` : '')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardShell>

          <div className="order-1 space-y-4 pb-24 xl:order-2 xl:pb-0">
            <div className="mx-auto max-w-4xl rounded-2xl border border-[#D9E7F0] bg-white px-4 py-4">
              <div className="mb-3 flex flex-col gap-3 text-sm text-[#6B7C8F] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{deckLabel}</span>
                  <span className="rounded-full bg-[#F3FBE8] px-3 py-1 text-[11px] font-semibold text-[#58CC02]">
                    {mode === 'review' ? 'Rate 1-4' : 'Swipe / Enter'}
                  </span>
                </div>
                <span>
                  Card {currentCardNumber} / {smartFilteredCards.length || 1}
                </span>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMinimalLearningView((current) => {
                      const next = !current;
                      if (next) {
                        setShowLearningTools(false);
                      }
                      return next;
                    });
                  }}
                  className={cn(
                    'rounded-full px-3 py-2 text-xs font-semibold',
                    minimalLearningView ? 'duo-chip-active' : 'duo-chip-inactive'
                  )}
                >
                  {minimalLearningView ? 'Minimal View' : 'Expanded View'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowLearningTools((current) => !current)}
                  className={cn(
                    'rounded-full px-3 py-2 text-xs font-semibold',
                    shouldShowLearningTools ? 'duo-chip-active' : 'duo-chip-inactive'
                  )}
                >
                  {shouldShowLearningTools ? 'Hide Tools' : 'Open Tools'}
                </button>
              </div>

              <div className="duo-progress-track h-3 overflow-hidden rounded-full">
                <motion.div
                  className="duo-progress-fill h-full rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.35 }}
                />
              </div>

              {!minimalLearningView ? (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#6B7C8F] sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                  <span>Session goal {Math.min(sessionCardCount, sessionGoal)} / {sessionGoal}</span>
                  <span className="text-right sm:text-left">
                    Due {dueReviewIds.length} | Weak {weakWordIds.length} | Smart {smartDeckCount}
                  </span>
                </div>
              ) : null}
            </div>

            <AnimatePresence>
              {answerResult ? (
                <motion.div
                  key={answerResult}
                  initial={{ opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    'mx-auto rounded-2xl border text-center font-medium',
                    minimalLearningView ? 'max-w-md px-4 py-2 text-sm' : 'max-w-3xl px-4 py-3',
                    answerResult === 'correct'
                      ? 'border-[#8EDC51] bg-[#F3FBE8] text-[#3E5B1A]'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                  )}
                >
                  {answerResult === 'correct'
                    ? `Correct! Combo x${combo || 1}`
                    : 'Incorrect - try the next one'}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {mode === 'review' ? (
                reviewDone || !currentReviewCard ? (
                  <motion.div
                    key="review-done"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <ReviewComplete
                      total={reviewSessionTotal}
                      onReset={() => {
                        setMode('flashcards');
                        setReviewQueue([]);
                        setReviewSessionTotal(0);
                        setReviewDone(false);
                        resetCardView();
                      }}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key={`review-${currentReviewCard.id}-${sessionCardCount}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                  >
                    <ReviewPanel
                      card={currentReviewCard}
                      cardIndex={Math.max(0, reviewSessionTotal - reviewQueue.length)}
                      totalCards={Math.max(reviewSessionTotal, reviewQueue.length)}
                      remainingCards={reviewQueue.length}
                      learningMode={learningMode}
                      showPinyin={showPinyin}
                      showThaiReading={showThaiReading}
                      showSentence={showSentence}
                      audioMuted={audioMuted}
                      autoPlayWord={autoPlayWord}
                      autoPlaySentence={autoPlaySentence}
                      onRate={(cardId, rating) => void handleReviewRate(cardId, rating)}
                      onSpeak={handleSpeak}
                    />
                  </motion.div>
                )
              ) : null}

              {mode === 'flashcards' && currentCard ? (
                <FlashcardView
                  card={currentCard}
                  flipped={flipped}
                  learningMode={learningMode}
                  showImage={showImage}
                  showPinyin={showPinyin}
                  showThaiReading={showThaiReading}
                  showSentence={showSentence}
                  ttsLoading={ttsState.loading}
                  ttsKey={ttsState.key}
                  onCardTap={handleFlashcardTap}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onSpeak={handleSpeak}
                  renderPinyin={renderPinyinWithToneColor}
                  renderPinyinLight={renderPinyinWithToneColorLight}
                />
              ) : null}

              {mode === 'quiz' && currentCard ? (
                <QuizView
                  card={currentCard}
                  learningMode={learningMode}
                  showImage={showImage}
                  showSentence={showSentence}
                  showPinyin={showPinyin}
                  showThaiReading={showThaiReading}
                  lives={lives}
                  xp={xp}
                  level={level}
                  quizInstruction={quizInstruction}
                  quizPromptMain={quizPromptMain}
                  quizPromptSecondary={quizPromptSecondary}
                  quizChoices={quizChoices}
                  correctAnswer={correctAnswer}
                  quizAnswer={quizAnswer}
                  quizSubmitted={quizSubmitted}
                  combo={combo}
                  hint={quizHint}
                  hintLoading={quizHintLoading}
                  onRetry={() => {
                    setLives(3);
                    setCombo(0);
                  }}
                  onSubmit={submitQuiz}
                  onSpeak={handleSpeak}
                  renderPinyinLight={renderPinyinWithToneColorLight}
                />
              ) : null}
            </AnimatePresence>

            {mode !== 'review' && currentCard ? (
              shouldShowLearningTools ? (
                <SpeakingPracticePanel
                  card={currentCard}
                  learningMode={learningMode}
                  showSentence={showSentence}
                  showPinyin={showPinyin}
                  showThaiReading={showThaiReading}
                  onSpeak={handleSpeak}
                />
              ) : (
                <div className="mx-auto max-w-4xl rounded-2xl border border-[#D8E9C9] bg-white px-4 py-4 text-sm text-[#55677A]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-[#163047]">Focus mode is on</p>
                      <p className="mt-1 text-xs leading-6 text-[#6B7C8F]">
                        Speaking practice and helper panels are tucked away to keep the lesson clean.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLearningTools(true)}
                      className="duo-secondary rounded-2xl px-4 py-3 text-sm font-semibold"
                    >
                      Open Learning Tools
                    </button>
                  </div>
                </div>
              )
            ) : null}

            {mode !== 'review' && (
              <div className="hidden items-center justify-center gap-3 xl:flex">
                <button
                  onClick={prevCard}
                  className="duo-secondary min-w-[160px] rounded-2xl px-6 py-4 text-lg font-semibold"
                >
                  Previous
                </button>
                <button
                  onClick={nextCard}
                  className="duo-primary min-w-[160px] rounded-2xl px-6 py-4 text-lg font-semibold"
                >
                  Next
                </button>
              </div>
            )}

            {mode === 'review' && (
              <div className="text-center text-sm text-[#6B7C8F]">
                Session cards reviewed: <span className="font-semibold">{sessionCardCount}</span>
              </div>
            )}
          </div>
        </div>

        {mode !== 'review' && currentCard ? (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#D9E7F0] bg-white/95 px-3 py-3 shadow-[0_-12px_40px_rgba(22,48,71,0.12)] backdrop-blur xl:hidden">
            <div className="mx-auto flex max-w-4xl items-center gap-3 pb-safe">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B7C8F]">
                  {deckLabel}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#163047]">
                  Card {currentCardNumber} / {smartFilteredCards.length || 1}
                </p>
              </div>
              <button
                onClick={prevCard}
                className="duo-secondary min-w-[92px] rounded-2xl px-4 py-3 text-sm font-semibold"
              >
                Previous
              </button>
              <button
                onClick={nextCard}
                className="duo-primary min-w-[92px] rounded-2xl px-4 py-3 text-sm font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}

        <div className="text-center text-sm text-[#6B7C8F]">
          Internal Use Only | Midea Thailand Language Training Platform
        </div>
      </div>
    </div>
  );
}
