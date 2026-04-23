'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  Flame,
  Heart,
  RotateCcw,
  Search,
  Shield,
  Shuffle,
  Sparkles,
  Star,
  Trophy,
  Users,
} from 'lucide-react';

import { hsk4Data } from '@/lib/hsk4-data';
import { factoryEnglish900th } from '@/lib/factory-english-900-th';
import { supabase } from '@/lib/supabase';
import { getUserSession, updateUserSession } from '@/lib/session';
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
        'rounded-[24px] border border-[#D9E7F0] bg-white shadow-[0_10px_30px_rgba(46,167,224,0.08)]',
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

type LeaderboardEntry = {
  id?: number;
  name: string;
  employee_code?: string | null;
  department?: string | null;
  score: number;
  mode: LearningMode;
  score_date?: string;
  created_at?: string;
};

type DisplayCard = {
  id: string;
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

    return {
      id: `hsk4-${hskItem.id ?? idx + 1}`,
      zh: hskItem.zh,
      pinyin: hskItem.pinyin,
      th: hskItem.th,
      thToZh: hskItem.thToZh,
      category: hskItem.category || 'HSK4',
      sentenceZh: hskItem.sentenceZh,
      sentencePinyin: hskItem.sentencePinyin,
      sentenceTh: hskItem.sentenceTh,
      sentenceEn: hskItem.sentenceEn || '',
      thaiPronunciation: hskItem.thaiPronunciation,
      sentenceThaiPronunciation: hskItem.sentenceThaiPronunciation,
      image: getSafeCardImage(hskItem.image, 'hsk4'),
      source: 'hsk4',
    };
  }

  const factoryItem = item as FactoryDataItem;

  return {
    id: `factory-${factoryItem.id}`,
    zh: factoryItem.zhMeaning,
    pinyin: factoryItem.en,
    th: factoryItem.thMeaning,
    thToZh: factoryItem.zhMeaning,
    category: factoryItem.pos || 'Factory English',
    sentenceZh: factoryItem.sentenceZh,
    sentencePinyin: factoryItem.uk,
    sentenceTh: factoryItem.sentenceTh,
    sentenceEn: factoryItem.sentenceEn,
    thaiPronunciation: factoryItem.us,
    sentenceThaiPronunciation: factoryItem.code,
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
  const [showThaiReading, setShowThaiReading] = useState(false);
  const [showPinyinGuide, setShowPinyinGuide] = useState(false);

  const [deckSeed, setDeckSeed] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });

  const [ttsState, setTtsState] = useState<TtsAudioState>({
    key: null,
    loading: false,
  });

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

  const [showManagerDashboard, setShowManagerDashboard] = useState(true);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    const savedLearningMode = localStorage.getItem('midea-learning-mode');
    const savedAppMode = localStorage.getItem('midea-app-mode');

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
    const session = getUserSession();

    if (session) {
      setSessionUser(session);
      setPlayerName(session.name || '');
      setEmployeeCode(session.employee_code || '');
      setDepartment(session.department || 'HR');
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

    const { data, error } = await supabase
      .from('daily_scores')
      .select('*')
      .eq('mode', learningMode)
      .gte('score_date', start)
      .lte('score_date', end);

    if (!error && data) {
      const grouped = new Map<string, LeaderboardEntry>();

      (data as LeaderboardEntry[]).forEach((item) => {
        const key = item.employee_code || item.name;
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
    } else {
      setLeaderboard([]);
      setPlayerCount(0);
    }

    setLoadingBoard(false);
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
          card.sentenceZh,
          card.sentencePinyin,
          card.sentenceTh,
          card.sentenceEn,
          card.thaiPronunciation,
          card.sentenceThaiPronunciation,
          card.source,
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
    if (!flipped) setFlipped(true);
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

  async function handleSpeak(text?: string, lang: 'zh-CN' | 'th-TH' | 'en-US' = 'zh-CN', cacheKey?: string) {
    if (!text) return;

    window.speechSynthesis?.cancel();
    const safeKey = cacheKey ?? text;

    try {
      setTtsState({ key: safeKey, loading: true });

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('TTS request failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.preload = 'auto';

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setTtsState({ key: null, loading: false });
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setTtsState({ key: null, loading: false });
      };

      await audio.play();
    } catch {
      setTtsState({ key: null, loading: false });
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = lang === 'th-TH' ? 0.95 : 0.92;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  }

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
    setDeckSeed((prev) => prev + 1);
    setIndex(0);
    resetCardView();
  }

  async function saveTodayScore() {
    const trimmedName = playerName.trim();
    const trimmedCode = employeeCode.trim();

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

    const { data: existing, error: existingError } = await supabase
      .from('daily_scores')
      .select('*')
      .eq('name', trimmedName)
      .eq('score_date', today)
      .eq('mode', learningMode)
      .limit(1);

    if (existingError) {
      setSaveMessage('Save failed');
      setTimeout(() => setSaveMessage(''), 2000);
      return;
    }

    if (existing && existing.length > 0) {
      const currentBest = existing[0] as LeaderboardEntry;

      if (score > currentBest.score) {
        await supabase
          .from('daily_scores')
          .update({
            score,
            employee_code: trimmedCode || null,
            department,
          })
          .eq('id', currentBest.id);
      }
    } else {
      await supabase.from('daily_scores').insert({
        name: trimmedName,
        employee_code: trimmedCode || null,
        department,
        score,
        mode: learningMode,
        score_date: today,
      });
    }

    await loadLeaderboard();
    setSaveMessage('Score saved successfully');
    setTimeout(() => setSaveMessage(''), 2000);
  }

  if (!currentCard && mode !== 'review') {
    return (
      <div className="w-full bg-[#F4FAFD] p-3 sm:p-4 md:p-8">
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
    <div className="w-full bg-[#F4FAFD] p-3 sm:p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <CardShell className="overflow-hidden border-[#CFE5F2] bg-white">
          <div className="flex flex-col gap-5 bg-gradient-to-r from-[#2EA7E0] to-[#1D8FC7] p-5 text-white md:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm">
                  <Building2 className="h-4 w-4" />
                  Midea Internal Learning System
                </div>

                <h1 className="text-2xl font-bold sm:text-3xl md:text-5xl">
                  Midea Thai-China Language Platform
                </h1>

                <p className="text-sm text-white/90 sm:text-base md:text-lg">
                  Daily learning, pronunciation practice, quiz, ranking, and streak for internal staff
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setLearningMode('thai-learns-chinese');
                      localStorage.setItem('midea-learning-mode', 'thai');
                      resetCardView();
                    }}
                    className={cn(
                      'h-11 rounded-2xl border px-4 text-sm sm:text-base',
                      learningMode === 'thai-learns-chinese'
                        ? 'border-white bg-white text-[#1D8FC7]'
                        : 'border-white/40 bg-white/10 text-white'
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
                      'h-11 rounded-2xl border px-4 text-sm sm:text-base',
                      learningMode === 'chinese-learns-thai'
                        ? 'border-white bg-white text-[#1D8FC7]'
                        : 'border-white/40 bg-white/10 text-white'
                    )}
                  >
                    Chinese Staff Learning Thai
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
                {[
                  [
                    'Vocabulary Set',
                    vocabularySource === 'all'
                      ? 'All'
                      : vocabularySource === 'hsk4'
                      ? 'HSK4'
                      : 'Factory',
                  ],
                  ['Total Vocabulary', smartFilteredCards.length],
                  [
                    'Current Card',
                    `${Math.min(index + 1, Math.max(smartFilteredCards.length, 1))}/${smartFilteredCards.length}`,
                  ],
                  ['Completion', `${progress}%`],
                  ['Session Goal', `${Math.min(sessionCardCount, sessionGoal)}/${sessionGoal}`],
                  ['XP', xp],
                  ['Level', level],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-2xl border border-white/25 bg-white/15 p-4 backdrop-blur"
                  >
                    <p className="text-xs text-white/80 sm:text-sm">{label}</p>
                    <p className="text-2xl font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardShell>

        {showManagerDashboard &&
          (sessionUser?.role === 'manager' || sessionUser?.role === 'admin') && (
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

        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          <CardShell className="border-[#D9E7F0] bg-white">
            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4">
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

              <div className="flex gap-2">
                {(
                  [
                    { key: 'flashcards', label: 'Cards' },
                    { key: 'quiz', label: 'Quiz' },
                    {
                      key: 'review',
                      label: `Review${dueReviewIds.length > 0 ? ` (${dueReviewIds.length})` : ''}`,
                    },
                  ] as { key: AppMode; label: string }[]
                ).map((m) => (
                  <button
                    key={m.key}
                    className={cn(
                      'h-11 flex-1 rounded-full border text-xs font-medium',
                      mode === m.key
                        ? 'border-[#2EA7E0] bg-[#2EA7E0] text-white'
                        : 'border-[#D9E7F0] bg-white text-[#163047]'
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

              <div className="rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4">
                <p className="mb-3 text-sm font-semibold text-[#163047]">Vocabulary Set</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['all', 'hsk4', 'factory'] as VocabSet[]).map((source) => (
                    <button
                      key={source}
                      onClick={() => {
                        setVocabularySource(source);
                        setIndex(0);
                        resetCardView();
                      }}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-sm font-medium',
                        vocabularySource === source
                          ? 'border-[#2EA7E0] bg-[#2EA7E0] text-white'
                          : 'border-[#D9E7F0] bg-white text-[#163047]'
                      )}
                    >
                      {source === 'all' ? 'All' : source === 'hsk4' ? 'HSK4' : 'Factory'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4">
                <p className="mb-3 text-sm font-semibold text-[#163047]">Study Deck</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'smart', label: `Smart (${smartDeckCount})` },
                    { key: 'normal', label: 'Normal' },
                    { key: 'review', label: `Review (${dueReviewIds.length})` },
                    { key: 'weak', label: `Weak (${weakWordIds.length})` },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() =>
                        openDeck(
                          item.key as DeckMode,
                          item.key === 'review' ? 'review' : 'flashcards'
                        )
                      }
                      className={cn(
                        'rounded-xl border px-3 py-2 text-xs font-medium',
                        deckMode === item.key
                          ? 'border-[#2EA7E0] bg-[#2EA7E0] text-white'
                          : 'border-[#D9E7F0] bg-white text-[#163047]'
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
                  <span className="rounded-full bg-[#F4FAFD] px-3 py-1 text-xs font-semibold text-[#2EA7E0]">
                    {recommendationLoading ? 'Syncing...' : `${smartDeckCount} cards`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-[#F8FCFE] p-3 text-center">
                    <p className="text-[11px] text-[#6B7C8F]">Due</p>
                    <p className="mt-1 text-lg font-bold text-[#163047]">
                      {recommendationSummary.review}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F8FCFE] p-3 text-center">
                    <p className="text-[11px] text-[#6B7C8F]">Weak</p>
                    <p className="mt-1 text-lg font-bold text-[#163047]">
                      {recommendationSummary.weak + recommendationSummary.low_accuracy}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F8FCFE] p-3 text-center">
                    <p className="text-[11px] text-[#6B7C8F]">New</p>
                    <p className="mt-1 text-lg font-bold text-[#163047]">
                      {recommendationSummary.new}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2">
                  <button
                    onClick={() => openDeck('smart', 'flashcards')}
                    className="h-11 rounded-2xl bg-[#2EA7E0] px-4 text-sm font-semibold text-white hover:bg-[#1D8FC7]"
                  >
                    Start Smart Session
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openDeck('review', 'review')}
                      className="h-11 rounded-2xl border border-[#D9E7F0] bg-white px-4 text-sm font-medium text-[#163047]"
                    >
                      Review Due
                    </button>
                    <button
                      onClick={() => openDeck('weak', 'review')}
                      className="h-11 rounded-2xl border border-[#D9E7F0] bg-white px-4 text-sm font-medium text-[#163047]"
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
                    'h-11 w-full rounded-2xl border text-sm font-medium',
                    showSentence
                      ? 'border-[#2EA7E0] bg-[#2EA7E0] text-white'
                      : 'border-[#D9E7F0] bg-white text-[#163047]'
                  )}
                  onClick={() => setShowSentence((v) => !v)}
                >
                  {showSentence ? 'Sentence Mode: ON' : 'Sentence Mode: OFF'}
                </button>

                <button
                  className={cn(
                    'h-11 w-full rounded-2xl border text-sm font-medium',
                    showImage
                      ? 'border-[#2EA7E0] bg-[#2EA7E0] text-white'
                      : 'border-[#D9E7F0] bg-white text-[#163047]'
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
                  className="w-full rounded-2xl border border-[#D9E7F0] bg-white px-4 py-3 text-sm text-[#163047]"
                >
                  {showPinyin ? 'Hide Pinyin' : 'Show Pinyin'}
                </button>

                <button
                  onClick={() => setShowThaiReading((v) => !v)}
                  className="w-full rounded-2xl border border-[#D9E7F0] bg-white px-4 py-3 text-sm text-[#163047]"
                >
                  {showThaiReading ? 'Hide Thai Reading' : 'Show Thai Reading'}
                </button>

                <button
                  onClick={() => setShowPinyinGuide((v) => !v)}
                  className="w-full rounded-2xl border border-[#D9E7F0] bg-white px-4 py-3 text-sm text-[#163047]"
                >
                  {showPinyinGuide ? 'Hide Tone Guide' : 'Show Tone Guide'}
                </button>
              </div>

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

              <div>
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
                    className="h-11 w-full rounded-2xl border border-[#D9E7F0] bg-white pl-9 pr-3 text-base text-[#163047] outline-none placeholder:text-[#9BAABA]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
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
                <div className="h-3 overflow-hidden rounded-full bg-[#D9E7F0]">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#2EA7E0] to-[#1D8FC7]"
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
                <div className="h-3 overflow-hidden rounded-full bg-[#D9E7F0]">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#FDBA74] to-[#F97316]"
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
                      if (!playerName.trim()) return;
                      localStorage.setItem('midea-player-name', playerName.trim());
                      localStorage.setItem('midea-employee-code', employeeCode.trim());
                      localStorage.setItem('midea-department', department);
                      setSaveMessage('Profile saved');
                      setTimeout(() => setSaveMessage(''), 1500);
                    }}
                    className="h-11 w-full rounded-2xl bg-[#2EA7E0] px-4 text-white hover:bg-[#1D8FC7]"
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
                        'rounded-xl border px-3 py-2 text-sm font-medium',
                        rankingPeriod === period
                          ? 'border-[#2EA7E0] bg-[#2EA7E0] text-white'
                          : 'border-[#D9E7F0] bg-white text-[#163047]'
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

                {(sessionUser?.role === 'manager' || sessionUser?.role === 'admin') && (
                  <button
                    onClick={() => setShowManagerDashboard((v) => !v)}
                    className={cn(
                      'mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border text-sm font-medium',
                      showManagerDashboard
                        ? 'border-[#2EA7E0] bg-[#2EA7E0] text-white'
                        : 'border-[#D9E7F0] bg-white text-[#163047]'
                    )}
                  >
                    <Shield className="h-4 w-4" />
                    {showManagerDashboard ? 'Hide Dashboard' : 'Manager Dashboard'}
                  </button>
                )}

                <button
                  onClick={() => void saveTodayScore()}
                  className="mb-3 h-11 w-full rounded-2xl bg-[#2EA7E0] px-4 font-medium text-white hover:bg-[#1D8FC7]"
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

          <div className="space-y-4">
            <div className="mx-auto max-w-4xl rounded-2xl border border-[#D9E7F0] bg-white px-4 py-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[#6B7C8F]">
                <span>
                  {deckMode === 'smart'
                    ? 'Smart session'
                    : deckMode === 'review'
                    ? 'Review deck'
                    : deckMode === 'weak'
                    ? 'Weak deck'
                    : 'Normal deck'}
                </span>
                <span>
                  Card {Math.min(index + 1, Math.max(smartFilteredCards.length, 1))} /{' '}
                  {smartFilteredCards.length || 1}
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-[#D9E7F0]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#2EA7E0] to-[#1D8FC7]"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.35 }}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#6B7C8F]">
                <span>Session goal {Math.min(sessionCardCount, sessionGoal)} / {sessionGoal}</span>
                <span>Due {dueReviewIds.length} | Weak {weakWordIds.length} | Smart {smartDeckCount}</span>
              </div>
            </div>

            <AnimatePresence>
              {answerResult ? (
                <motion.div
                  key={answerResult}
                  initial={{ opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    'mx-auto max-w-3xl rounded-2xl border px-4 py-3 text-center font-medium',
                    answerResult === 'correct'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
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
              <SpeakingPracticePanel
                card={currentCard}
                learningMode={learningMode}
                showSentence={showSentence}
                showPinyin={showPinyin}
                showThaiReading={showThaiReading}
                onSpeak={handleSpeak}
              />
            ) : null}

            {mode !== 'review' && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={prevCard}
                  className="min-w-[160px] rounded-2xl border border-[#D9E7F0] bg-white px-6 py-4 text-lg font-semibold text-[#163047]"
                >
                  Previous
                </button>
                <button
                  onClick={nextCard}
                  className="min-w-[160px] rounded-2xl bg-[#2EA7E0] px-6 py-4 text-lg font-semibold text-white hover:bg-[#1D8FC7]"
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

        <div className="text-center text-sm text-[#6B7C8F]">
          Internal Use Only | Midea Thailand Language Training Platform
        </div>
      </div>
    </div>
  );
}
