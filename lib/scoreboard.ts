import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import type { AppUser, LearningMode } from '@/types/app';

export type ScoreboardRow = {
  id?: number;
  user_id?: string | null;
  name: string;
  employee_code?: string | null;
  department?: string | null;
  score: number;
  mode: LearningMode;
  score_date: string;
  created_at?: string | null;
  session_seconds?: number | null;
  correct_answers?: number | null;
  wrong_answers?: number | null;
  cards_completed?: number | null;
};

type DailyScoreQuery = {
  learningMode?: LearningMode;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  employeeCode?: string | null;
  name?: string | null;
};

type SaveDailyScoreInput = {
  user: Pick<AppUser, 'id' | 'name' | 'employee_code' | 'department'>;
  learningMode: LearningMode;
  score: number;
  scoreDate: string;
  sessionSeconds: number;
  correctAnswers: number;
  wrongAnswers: number;
  cardsCompleted: number;
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null;

function toRows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

function count(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function isMissingColumnError(error: SupabaseErrorLike, column: string) {
  const message = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return message.includes(column.toLowerCase());
}

function normalizeScoreRows(data: unknown) {
  return toRows<Partial<ScoreboardRow>>(data).map((row) => ({
    id: row.id,
    user_id: row.user_id ?? null,
    name: row.name ?? 'Unknown Learner',
    employee_code: row.employee_code ?? null,
    department: row.department ?? null,
    score: count(row.score),
    mode: row.mode as LearningMode,
    score_date: row.score_date ?? '',
    created_at: row.created_at ?? null,
    session_seconds: row.session_seconds ?? null,
    correct_answers: row.correct_answers ?? null,
    wrong_answers: row.wrong_answers ?? null,
    cards_completed: row.cards_completed ?? null,
  }));
}

function buildDailyScoreQuery(selectClause: string, params: DailyScoreQuery, useUserIdFilter: boolean) {
  let query = supabase.from('daily_scores').select(selectClause);

  if (params.learningMode) {
    query = query.eq('mode', params.learningMode);
  }

  if (params.dateFrom) {
    query = query.gte('score_date', params.dateFrom);
  }

  if (params.dateTo) {
    query = query.lte('score_date', params.dateTo);
  }

  if (useUserIdFilter && params.userId) {
    query = query.eq('user_id', params.userId);
  } else if (params.employeeCode) {
    query = query.eq('employee_code', params.employeeCode);
  } else if (params.name) {
    query = query.eq('name', params.name);
  }

  return query;
}

export async function getDailyScores(params: DailyScoreQuery = {}) {
  const richSelect =
    'id,user_id,name,employee_code,department,score,mode,score_date,created_at,session_seconds,correct_answers,wrong_answers,cards_completed';
  const fallbackSelect = 'id,name,employee_code,department,score,mode,score_date,created_at';

  const primary = await buildDailyScoreQuery(richSelect, params, true);

  if (!primary.error) {
    return normalizeScoreRows(primary.data);
  }

  const missingIdentity =
    isMissingColumnError(primary.error, 'user_id') ||
    isMissingColumnError(primary.error, 'session_seconds') ||
    isMissingColumnError(primary.error, 'correct_answers') ||
    isMissingColumnError(primary.error, 'wrong_answers') ||
    isMissingColumnError(primary.error, 'cards_completed');

  if (!missingIdentity) {
    throw primary.error;
  }

  const fallback = await buildDailyScoreQuery(fallbackSelect, params, false);
  if (fallback.error) throw fallback.error;
  return normalizeScoreRows(fallback.data);
}

async function findExistingDailyScore(input: SaveDailyScoreInput) {
  const userScoped = await getDailyScores({
    userId: input.user.id,
    employeeCode: input.user.employee_code,
    name: input.user.name,
    learningMode: input.learningMode,
    dateFrom: input.scoreDate,
    dateTo: input.scoreDate,
  });

  return userScoped[0] ?? null;
}

async function insertScore(payload: Record<string, unknown>) {
  const richInsert = await supabase.from('daily_scores').insert(payload).select('*').single();

  if (!richInsert.error) {
    return richInsert.data;
  }

  const fallbackNeeded =
    isMissingColumnError(richInsert.error, 'user_id') ||
    isMissingColumnError(richInsert.error, 'session_seconds') ||
    isMissingColumnError(richInsert.error, 'correct_answers') ||
    isMissingColumnError(richInsert.error, 'wrong_answers') ||
    isMissingColumnError(richInsert.error, 'cards_completed');

  if (!fallbackNeeded) {
    throw richInsert.error;
  }

  const fallbackPayload = {
    name: payload.name,
    employee_code: payload.employee_code,
    department: payload.department,
    score: payload.score,
    mode: payload.mode,
    score_date: payload.score_date,
  };

  const fallbackInsert = await supabase
    .from('daily_scores')
    .insert(fallbackPayload)
    .select('*')
    .single();

  if (fallbackInsert.error) throw fallbackInsert.error;
  return fallbackInsert.data;
}

async function updateScore(id: number, payload: Record<string, unknown>) {
  const richUpdate = await supabase
    .from('daily_scores')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (!richUpdate.error) {
    return richUpdate.data;
  }

  const fallbackNeeded =
    isMissingColumnError(richUpdate.error, 'user_id') ||
    isMissingColumnError(richUpdate.error, 'session_seconds') ||
    isMissingColumnError(richUpdate.error, 'correct_answers') ||
    isMissingColumnError(richUpdate.error, 'wrong_answers') ||
    isMissingColumnError(richUpdate.error, 'cards_completed');

  if (!fallbackNeeded) {
    throw richUpdate.error;
  }

  const fallbackPayload = {
    name: payload.name,
    employee_code: payload.employee_code,
    department: payload.department,
    score: payload.score,
  };

  const fallbackUpdate = await supabase
    .from('daily_scores')
    .update(fallbackPayload)
    .eq('id', id)
    .select('*')
    .single();

  if (fallbackUpdate.error) throw fallbackUpdate.error;
  return fallbackUpdate.data;
}

export async function saveDailyScore(input: SaveDailyScoreInput) {
  const existing = await findExistingDailyScore(input);
  const nextScore = Math.max(count(existing?.score), input.score);

  const payload = {
    user_id: input.user.id,
    name: input.user.name,
    employee_code: input.user.employee_code || null,
    department: input.user.department || null,
    score: nextScore,
    mode: input.learningMode,
    score_date: input.scoreDate,
    session_seconds: input.sessionSeconds,
    correct_answers: input.correctAnswers,
    wrong_answers: input.wrongAnswers,
    cards_completed: input.cardsCompleted,
  };

  try {
    const saved =
      existing?.id !== undefined
        ? await updateScore(existing.id, payload)
        : await insertScore(payload);

    return normalizeScoreRows(saved ? [saved] : [])[0] ?? null;
  } catch (error) {
    logError('saveDailyScore', error, {
      userId: input.user.id,
      learningMode: input.learningMode,
      scoreDate: input.scoreDate,
    });
    throw error;
  }
}
