import { supabase, throwIfSupabaseError } from './supabase';
import type { LearningMode, UserProgress, VocabSet } from '@/types/app';

function normalizeDateValue(value?: string | null) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return trimmed;
}

export async function getUserProgress(
  userId: string,
  learningMode: LearningMode,
  vocabSet: VocabSet | string
): Promise<UserProgress | null> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('learning_mode', learningMode)
    .eq('vocab_set', vocabSet)
    .maybeSingle();

  throwIfSupabaseError(error, 'Unable to load user progress');

  return (data as UserProgress | null) ?? null;
}

export async function upsertUserProgress(input: {
  userId: string;
  learningMode: LearningMode;
  vocabSet: VocabSet | string;
  currentIndex: number;
  streak?: number;
  bestStreak?: number;
  combo?: number;
  todayDone?: boolean;
  lastStudyDate?: string | null;
}) {
  const lastStudyDate = normalizeDateValue(input.lastStudyDate);

  const { error } = await supabase
    .from('user_progress')
    .upsert(
      {
        user_id: input.userId,
        learning_mode: input.learningMode,
        vocab_set: input.vocabSet,
        current_index: input.currentIndex,
        streak: input.streak ?? 0,
        best_streak: input.bestStreak ?? 0,
        combo: input.combo ?? 0,
        today_done: input.todayDone ?? false,
        last_study_date: lastStudyDate,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,learning_mode,vocab_set',
      }
    );

  throwIfSupabaseError(error, 'Unable to save user progress');
}
