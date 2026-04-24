import { supabase } from '@/lib/supabase';

export type DashboardSummaryRow = {
  score_date: string;
  department: string | null;
  mode: 'thai-learns-chinese' | 'chinese-learns-thai';
  submissions: number;
  active_players: number;
  avg_score: number;
  top_score: number;
};

export async function getDashboardSummary(params?: {
  scoreDate?: string;
  mode?: 'thai-learns-chinese' | 'chinese-learns-thai';
}) {
  const scoreDate = params?.scoreDate ?? new Date().toISOString().slice(0, 10);

  let query = supabase
    .from('dashboard_learning_summary')
    .select('*')
    .eq('score_date', scoreDate);

  if (params?.mode) {
    query = query.eq('mode', params.mode);
  }

  const { data, error } = await query.order('department', { ascending: true });

  if (error) throw error;
  return (data ?? []) as DashboardSummaryRow[];
}

export async function getTopWeakWords(params: { userId: string; limit?: number }) {
  const { userId, limit = 10 } = params;

  const { data, error } = await supabase
    .from('user_word_stats')
    .select('card_id, wrong_count, correct_count, learning_mode, vocab_set, last_seen_at')
    .eq('user_id', userId)
    .gt('wrong_count', 0)
    .order('wrong_count', { ascending: false })
    .order('last_seen_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}