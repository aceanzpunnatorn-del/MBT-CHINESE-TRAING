import { supabase } from '@/lib/supabase';
import { calculateNextReview, getDueCards, type ReviewRating } from '@/lib/srs';
import { getWeakWords as getWeakWordRecords, prioritizeWeakCards, updateWordStats } from '@/lib/weak-engine';

export type LearningModeKey = 'thai-learns-chinese' | 'chinese-learns-thai';

export type WordStat = {
  id?: number;
  user_id: string;
  card_id: string;
  learning_mode: LearningModeKey;
  vocab_set: string;
  correct_count: number;
  wrong_count: number;
  accuracy?: number | null;
  last_result: boolean | null;
  last_seen_at: string | null;
  last_review_at?: string | null;
  last_wrong_at?: string | null;
  next_review_at: string | null;
  ease_factor: number;
  interval_days: number;
  repetitions?: number | null;
  due_date?: string | null;
  wrong_streak?: number | null;
};

type WordStatRow = WordStat & {
  created_at?: string | null;
  updated_at?: string | null;
};

type RecordWordBaseParams = {
  userId: string;
  cardId: string;
  learningMode: LearningModeKey;
  vocabSet: string;
};

const ALL_VOCAB_SETS = ['hsk4', 'factory'] as const;

function toWordStatRows(data: unknown): WordStatRow[] {
  return Array.isArray(data) ? (data as WordStatRow[]) : [];
}

function toWordStatRow(data: unknown): WordStatRow | null {
  return data ? (data as WordStatRow) : null;
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

function getWrongStreak(existing: WordStatRow | null, isCorrect: boolean) {
  if (isCorrect) return 0;
  return count(existing?.wrong_streak) + 1;
}

async function getExistingWordStat(params: RecordWordBaseParams) {
  const { userId, cardId, learningMode, vocabSet } = params;

  let query = supabase
    .from('user_word_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .eq('learning_mode', learningMode);

  query =
    vocabSet === 'all'
      ? query.in('vocab_set', [...ALL_VOCAB_SETS])
      : query.eq('vocab_set', vocabSet);

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return toWordStatRow(data);
}

async function upsertReviewQueueEntry(params: {
  userId: string;
  cardId: string;
  learningMode: LearningModeKey;
  vocabSet: string;
  priority: number;
  nextReviewAt: string;
}) {
  const payload = {
    user_id: params.userId,
    card_id: params.cardId,
    learning_mode: params.learningMode,
    vocab_set: params.vocabSet,
    priority: params.priority,
    next_review_at: params.nextReviewAt,
  };

  const scopedExisting = await supabase
    .from('review_queue')
    .select('id')
    .eq('user_id', params.userId)
    .eq('card_id', params.cardId)
    .eq('learning_mode', params.learningMode)
    .maybeSingle();

  if (!scopedExisting.error) {
    if (scopedExisting.data?.id) {
      const { error } = await supabase
        .from('review_queue')
        .update(payload)
        .eq('id', scopedExisting.data.id);

      if (error) throw error;
      return;
    }

    const { error } = await supabase.from('review_queue').insert(payload);
    if (error) throw error;
    return;
  }

  if (!isMissingColumnError(scopedExisting.error, 'learning_mode')) {
    throw scopedExisting.error;
  }

  const legacyPayload = {
    user_id: params.userId,
    card_id: params.cardId,
    vocab_set: params.vocabSet,
    priority: params.priority,
    next_review_at: params.nextReviewAt,
  };

  const legacyExisting = await supabase
    .from('review_queue')
    .select('id')
    .eq('user_id', params.userId)
    .eq('card_id', params.cardId)
    .maybeSingle();

  if (legacyExisting.error) throw legacyExisting.error;

  if (legacyExisting.data?.id) {
    const { error } = await supabase
      .from('review_queue')
      .update(legacyPayload)
      .eq('id', legacyExisting.data.id);

    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('review_queue').insert(legacyPayload);
  if (error) throw error;
}

export async function getWeakWords(params: {
  userId: string;
  learningMode: LearningModeKey;
  vocabSet: string;
  limit?: number;
}) {
  const { userId, learningMode, vocabSet, limit = 30 } = params;

  let query = supabase
    .from('user_word_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('learning_mode', learningMode);

  query =
    vocabSet === 'all'
      ? query.in('vocab_set', [...ALL_VOCAB_SETS])
      : query.eq('vocab_set', vocabSet);

  const { data, error } = await query.limit(Math.max(limit * 4, limit));

  if (error) throw error;

  return prioritizeWeakCards(getWeakWordRecords(toWordStatRows(data))).slice(0, limit);
}

export async function getDueReviewWords(params: {
  userId: string;
  learningMode: LearningModeKey;
  vocabSet: string;
}) {
  const { userId, learningMode, vocabSet } = params;

  let query = supabase
    .from('user_word_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('learning_mode', learningMode);

  query =
    vocabSet === 'all'
      ? query.in('vocab_set', [...ALL_VOCAB_SETS])
      : query.eq('vocab_set', vocabSet);

  const { data, error } = await query;

  if (error) throw error;

  return getDueCards(
    toWordStatRows(data).map((row) => ({
      ...row,
      dueDate: row.due_date ?? row.next_review_at,
    }))
  ).sort((a, b) => String(a.dueDate ?? '').localeCompare(String(b.dueDate ?? '')));
}

export async function recordWordReviewRating(params: RecordWordBaseParams & {
  rating: ReviewRating;
}) {
  const { userId, cardId, learningMode, vocabSet, rating } = params;
  const existing = await getExistingWordStat(params);
  const now = new Date();
  const nextReview = calculateNextReview(
    {
      easeFactor: existing?.ease_factor,
      interval: existing?.interval_days,
      repetitions: existing?.repetitions,
      dueDate: existing?.due_date ?? existing?.next_review_at,
    },
    rating,
    now
  );
  const weakStats = updateWordStats(
    {
      correctCount: existing?.correct_count,
      wrongCount: existing?.wrong_count,
      accuracy: existing?.accuracy,
      lastWrongAt: existing?.last_wrong_at,
    },
    { isCorrect: nextReview.lastResult, now }
  );
  const nowIso = now.toISOString();
  const wrongStreak = getWrongStreak(existing, nextReview.lastResult);

  const payload = {
    user_id: userId,
    card_id: cardId,
    learning_mode: learningMode,
    vocab_set: vocabSet,
    correct_count: weakStats.correctCount,
    wrong_count: weakStats.wrongCount,
    accuracy: weakStats.accuracy,
    last_result: nextReview.lastResult,
    last_seen_at: nowIso,
    last_review_at: nowIso,
    last_wrong_at: weakStats.lastWrongAt,
    next_review_at: nextReview.dueDate,
    due_date: nextReview.dueDate,
    ease_factor: nextReview.easeFactor,
    interval_days: nextReview.interval,
    repetitions: nextReview.repetitions,
    wrong_streak: wrongStreak,
  };

  if (!existing) {
    const { error } = await supabase.from('user_word_stats').insert(payload);
    if (error) throw error;

    await upsertReviewQueueEntry({
      userId,
      cardId,
      learningMode,
      vocabSet,
      priority: rating === 'again' ? 100 : rating === 'hard' ? 70 : 50,
      nextReviewAt: nextReview.dueDate,
    });
    return;
  }

  const { error } = await supabase
    .from('user_word_stats')
    .update(payload)
    .eq('id', existing.id);

  if (error) throw error;

  await upsertReviewQueueEntry({
    userId,
    cardId,
    learningMode,
    vocabSet,
    priority: rating === 'again' ? 100 : rating === 'hard' ? 70 : rating === 'easy' ? 30 : 50,
    nextReviewAt: nextReview.dueDate,
  });
}

export async function recordWordResult(params: RecordWordBaseParams & {
  isCorrect: boolean;
}) {
  const { userId, cardId, learningMode, vocabSet, isCorrect } = params;

  await recordWordReviewRating({
    userId,
    cardId,
    learningMode,
    vocabSet,
    rating: isCorrect ? 'good' : 'again',
  });
}
