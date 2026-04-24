import { factoryEnglish900th } from '@/lib/factory-english-900-th';
import { hsk4Data } from '@/lib/hsk4-data';
import { supabase } from '@/lib/supabase';
import { createWeakWordSnapshot } from '@/lib/weak-logic';
import type { LearningMode, VocabSet } from '@/types/app';

export type RecommendedWordReason = 'review' | 'weak' | 'low_accuracy' | 'new';

export type RecommendedWord = {
  cardId: string;
  vocabSet: VocabSet;
  reason: RecommendedWordReason;
  score: number;
  accuracy: number | null;
  nextReviewAt: string | null;
};

type RecommendationWordStat = {
  user_id: string;
  card_id: string;
  learning_mode: LearningMode;
  vocab_set: VocabSet | string;
  correct_count: number;
  wrong_count: number;
  wrong_streak?: number | null;
  last_result?: boolean | null;
  last_seen_at?: string | null;
  next_review_at?: string | null;
  accuracy?: number | null;
};

type ReviewQueueRow = {
  user_id: string;
  card_id: string;
  learning_mode?: LearningMode | null;
  vocab_set?: VocabSet | string | null;
  priority?: number | null;
  next_review_at?: string | null;
};

type HskCard = {
  id?: string | number;
};

type FactoryCard = {
  id: string | number;
};

const DEFAULT_LIMIT = 30;
const NEW_WORD_RATIO = 0.2;

function toRows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

function count(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function isMissingColumnError(
  error: { message?: string; details?: string; hint?: string } | null,
  column: string
) {
  const message = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return message.includes(column.toLowerCase());
}

function getAccuracy(stat: RecommendationWordStat) {
  if (typeof stat.accuracy === 'number' && Number.isFinite(stat.accuracy)) {
    return stat.accuracy > 1 ? stat.accuracy / 100 : stat.accuracy;
  }

  const correct = count(stat.correct_count);
  const total = correct + count(stat.wrong_count);
  return total === 0 ? null : correct / total;
}

function getAllVocabularyIds() {
  const hskIds = (hsk4Data as readonly HskCard[]).map((card, index) => ({
    cardId: `hsk4-${card.id ?? index + 1}`,
    vocabSet: 'hsk4' as VocabSet,
  }));

  const factoryIds = (factoryEnglish900th as readonly FactoryCard[]).map((card) => ({
    cardId: `factory-${card.id}`,
    vocabSet: 'factory' as VocabSet,
  }));

  return [...hskIds, ...factoryIds];
}

function normalizeVocabSet(value: string | null | undefined): VocabSet {
  if (value === 'hsk4' || value === 'factory' || value === 'all') return value;
  return 'all';
}

function createRecommendedWord(
  stat: RecommendationWordStat,
  reason: RecommendedWordReason,
  baseScore: number
): RecommendedWord {
  const accuracy = getAccuracy(stat);
  const weak = createWeakWordSnapshot(stat);
  const overdueBoost =
    stat.next_review_at && stat.next_review_at <= new Date().toISOString() ? 15 : 0;

  return {
    cardId: stat.card_id,
    vocabSet: normalizeVocabSet(stat.vocab_set),
    reason,
    score:
      baseScore +
      overdueBoost +
      count(stat.wrong_count) * 2 +
      weak.wrongStreak * 8 +
      (accuracy === null ? 0 : Math.round((1 - accuracy) * 20)),
    accuracy,
    nextReviewAt: stat.next_review_at ?? null,
  };
}

function mergeRecommendations(recommendations: RecommendedWord[]) {
  const byCard = new Map<string, RecommendedWord>();

  recommendations.forEach((word) => {
    const existing = byCard.get(word.cardId);
    if (!existing || word.score > existing.score) {
      byCard.set(word.cardId, word);
    }
  });

  return Array.from(byCard.values());
}

async function getReviewQueueRows(userId: string, learningMode?: LearningMode) {
  let scopedQuery = supabase
    .from('review_queue')
    .select('user_id, card_id, learning_mode, vocab_set, priority, next_review_at')
    .eq('user_id', userId);

  if (learningMode) {
    scopedQuery = scopedQuery.eq('learning_mode', learningMode);
  }

  const scopedResult = await scopedQuery.order('priority', { ascending: false });

  if (!scopedResult.error) {
    return toRows<ReviewQueueRow>(scopedResult.data);
  }

  if (!isMissingColumnError(scopedResult.error, 'learning_mode')) {
    return [];
  }

  const legacyResult = await supabase
    .from('review_queue')
    .select('user_id, card_id, vocab_set, priority, next_review_at')
    .eq('user_id', userId)
    .order('priority', { ascending: false });

  if (legacyResult.error) return [];
  return toRows<ReviewQueueRow>(legacyResult.data);
}

export async function getRecommendedWords(
  userId: string,
  options?: {
    limit?: number;
    learningMode?: LearningMode;
    vocabSet?: VocabSet;
  }
): Promise<RecommendedWord[]> {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const nowIso = new Date().toISOString();

  let statsQuery = supabase
    .from('user_word_stats')
    .select('user_id, card_id, learning_mode, vocab_set, correct_count, wrong_count, wrong_streak, last_result, last_seen_at, next_review_at, accuracy')
    .eq('user_id', userId);

  if (options?.learningMode) {
    statsQuery = statsQuery.eq('learning_mode', options.learningMode);
  }

  if (options?.vocabSet && options.vocabSet !== 'all') {
    statsQuery = statsQuery.eq('vocab_set', options.vocabSet);
  }

  const [statsResult, reviewQueueRows] = await Promise.all([
    statsQuery,
    getReviewQueueRows(userId, options?.learningMode),
  ]);

  if (statsResult.error) throw statsResult.error;

  const stats = toRows<RecommendationWordStat>(statsResult.data);
  const seenIds = new Set(stats.map((stat) => stat.card_id));
  const statsById = new Map(stats.map((stat) => [stat.card_id, stat]));
  const newWordCount = Math.max(1, Math.floor(limit * NEW_WORD_RATIO));
  const learnedWordLimit = Math.max(1, limit - newWordCount);

  const reviewRecommendations = mergeRecommendations([
    ...reviewQueueRows.map((row) => {
      const stat = statsById.get(row.card_id);
      return stat
        ? createRecommendedWord(stat, 'review', 100 + count(row.priority))
        : {
            cardId: row.card_id,
            vocabSet: normalizeVocabSet(row.vocab_set ?? undefined),
            reason: 'review' as RecommendedWordReason,
            score: 100 + count(row.priority),
            accuracy: null,
            nextReviewAt: row.next_review_at ?? null,
          };
    }),
    ...stats
      .filter((stat) => stat.next_review_at !== null && stat.next_review_at !== undefined)
      .filter((stat) => String(stat.next_review_at) <= nowIso)
      .map((stat) => createRecommendedWord(stat, 'review', 95)),
  ]).sort((a, b) => {
    if (a.nextReviewAt && b.nextReviewAt && a.nextReviewAt !== b.nextReviewAt) {
      return a.nextReviewAt.localeCompare(b.nextReviewAt);
    }

    return b.score - a.score;
  });

  const weakRecommendations = stats
    .filter((stat) => createWeakWordSnapshot(stat).isWeak)
    .map((stat) => createRecommendedWord(stat, 'weak', 70))
    .sort((a, b) => b.score - a.score);

  const lowAccuracyRecommendations = stats
    .filter((stat) => {
      const accuracy = getAccuracy(stat);
      return accuracy !== null && accuracy < 0.75;
    })
    .map((stat) => createRecommendedWord(stat, 'low_accuracy', 55))
    .sort((a, b) => b.score - a.score);

  const learnedRecommendations = mergeRecommendations([
    ...reviewRecommendations,
    ...weakRecommendations,
    ...lowAccuracyRecommendations,
  ]).slice(0, learnedWordLimit);

  const newRecommendations = getAllVocabularyIds()
    .filter((word) => {
      if (options?.vocabSet && options.vocabSet !== 'all' && word.vocabSet !== options.vocabSet) {
        return false;
      }

      return !seenIds.has(word.cardId);
    })
    .slice(0, Math.max(newWordCount, limit - learnedRecommendations.length))
    .map((word, index) => ({
      cardId: word.cardId,
      vocabSet: word.vocabSet,
      reason: 'new' as RecommendedWordReason,
      score: 10 - index,
      accuracy: null,
      nextReviewAt: null,
    }));

  return [...learnedRecommendations, ...newRecommendations].slice(0, limit);
}
