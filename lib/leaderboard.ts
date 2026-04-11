import { supabase } from './supabase';

type RankingPeriod = 'daily' | 'weekly' | 'monthly';

export function getDateRange(period: RankingPeriod) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);

  if (period === 'daily') {
    start.setHours(0, 0, 0, 0);
  }

  if (period === 'weekly') {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
  }

  if (period === 'monthly') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export async function getLeaderboard(
  mode: string,
  period: RankingPeriod
) {
  const { start, end } = getDateRange(period);

  const { data, error } = await supabase
    .from('daily_scores')
    .select('*')
    .eq('mode', mode)
    .gte('score_date', start)
    .lte('score_date', end);

  if (error) throw error;

  const rows = data ?? [];
  const grouped = new Map<string, any>();

  rows.forEach((item: any) => {
    const key = item.employee_code || item.name;

    if (!grouped.has(key)) {
      grouped.set(key, {
        ...item,
        score: Number(item.score) || 0,
      });
    } else {
      const existing = grouped.get(key);
      existing.score += Number(item.score) || 0;
    }
  });

  return Array.from(grouped.values())
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 10);
}