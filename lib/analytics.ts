import { supabase } from '@/lib/supabase';
import { getUserInsight } from '@/lib/insight';
import { createWeakWordSnapshot } from '@/lib/weak-logic';
import { getDailyScores, type ScoreboardRow } from '@/lib/scoreboard';
import type { LearningMode } from '@/types/app';

export type AnalyticsWordStat = {
  user_id: string;
  card_id: string;
  learning_mode: LearningMode;
  vocab_set: string;
  correct_count: number;
  wrong_count: number;
  wrong_streak?: number | null;
  last_result?: boolean | null;
  last_seen_at?: string | null;
  last_review_at?: string | null;
  next_review_at?: string | null;
  accuracy?: number | null;
};

export type UserProgressRow = {
  user_id: string;
  learning_mode?: LearningMode | null;
  vocab_set?: string | null;
  streak?: number | null;
  best_streak?: number | null;
  combo?: number | null;
  updated_at?: string | null;
};

export type UserRow = {
  id: string;
  employee_code?: string | null;
  name?: string | null;
  department?: string | null;
  last_login_at?: string | null;
};

export type DailyScoreRow = ScoreboardRow;

export type UserMetrics = {
  userId: string;
  accuracy: number;
  totalAnswers: number;
  correct: number;
  wrong: number;
  streak: number;
  weakWordCount: number;
  dailyStudyMinutes: number;
  cardsLearned: number;
  accuracyTrend: AccuracyPoint[];
  activityHeatmap: ActivityPoint[];
  insight: string;
};

export type DepartmentMetrics = {
  department: string;
  avgAccuracy: number;
  totalActivity: number;
  totalStudyMinutes: number;
  learnerCount: number;
  activeUsers: number;
  topLearners: DailyScoreRow[];
};

export type ActivityPoint = {
  date: string;
  sessions: number;
  averageScore: number;
};

export type AccuracyPoint = {
  date: string;
  accuracy: number;
};

export type ManagerDashboardAnalytics = {
  totalLearners: number;
  activeUsers: number;
  totalSessions: number;
  averageAccuracy: number;
  topPerformers: DailyScoreRow[];
  weakestWords: AnalyticsWordStat[];
  departmentRanking: DepartmentMetrics[];
  activityTrend: ActivityPoint[];
  accuracyTrend: AccuracyPoint[];
};

const emptyManagerAnalytics: ManagerDashboardAnalytics = {
  totalLearners: 0,
  activeUsers: 0,
  totalSessions: 0,
  averageAccuracy: 0,
  topPerformers: [],
  weakestWords: [],
  departmentRanking: [],
  activityTrend: [],
  accuracyTrend: [],
};

function toRows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

function count(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function ratio(correct: number, total: number) {
  if (total <= 0) return 0;
  return correct / total;
}

function toPercent(value: number) {
  return Math.round(value * 100);
}

function getActiveSinceIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function getDateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function getStatAccuracy(stat: AnalyticsWordStat) {
  if (typeof stat.accuracy === 'number' && Number.isFinite(stat.accuracy)) {
    return stat.accuracy > 1 ? stat.accuracy / 100 : stat.accuracy;
  }

  return ratio(count(stat.correct_count), count(stat.correct_count) + count(stat.wrong_count));
}

function buildWeakWords(stats: AnalyticsWordStat[]) {
  return stats
    .filter((stat) => createWeakWordSnapshot(stat).isWeak)
    .sort((a, b) => {
      const aWeak = createWeakWordSnapshot(a);
      const bWeak = createWeakWordSnapshot(b);

      if (bWeak.wrongStreak !== aWeak.wrongStreak) {
        return bWeak.wrongStreak - aWeak.wrongStreak;
      }

      if (aWeak.accuracy !== bWeak.accuracy) {
        return aWeak.accuracy - bWeak.accuracy;
      }

      return count(b.wrong_count) - count(a.wrong_count);
    });
}

function buildTopPerformers(scores: DailyScoreRow[]) {
  const performers = new Map<string, DailyScoreRow>();

  scores.forEach((score) => {
    const key = score.user_id || score.employee_code || score.name;
    const existing = performers.get(key);

    if (!existing || count(score.score) > count(existing.score)) {
      performers.set(key, score);
    }
  });

  return Array.from(performers.values())
    .sort((a, b) => count(b.score) - count(a.score))
    .slice(0, 10);
}

function buildActivityTrend(scores: DailyScoreRow[]) {
  const byDate = new Map<string, { sessions: number; totalScore: number }>();

  scores.forEach((score) => {
    const existing = byDate.get(score.score_date) ?? { sessions: 0, totalScore: 0 };
    byDate.set(score.score_date, {
      sessions: existing.sessions + 1,
      totalScore: existing.totalScore + count(score.score),
    });
  });

  return Array.from(byDate.entries())
    .map(([date, value]) => ({
      date,
      sessions: value.sessions,
      averageScore: value.sessions === 0 ? 0 : Math.round(value.totalScore / value.sessions),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildAccuracyTrend(stats: AnalyticsWordStat[]) {
  const byDate = new Map<string, { correct: number; total: number }>();

  stats.forEach((stat) => {
    const date = (stat.last_review_at || stat.last_seen_at || '').slice(0, 10);
    if (!date) return;

    const correct = count(stat.correct_count);
    const total = correct + count(stat.wrong_count);
    const existing = byDate.get(date) ?? { correct: 0, total: 0 };

    byDate.set(date, {
      correct: existing.correct + correct,
      total: existing.total + total,
    });
  });

  return Array.from(byDate.entries())
    .map(([date, value]) => ({
      date,
      accuracy: toPercent(ratio(value.correct, value.total)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
}

function buildDepartmentMetrics(
  users: UserRow[],
  scores: DailyScoreRow[],
  stats: AnalyticsWordStat[]
) {
  const activeSinceIso = getActiveSinceIso(7);
  const userDepartment = new Map(users.map((user) => [user.id, user.department || 'Unassigned']));
  const departments = new Map<string, {
    department: string;
    correct: number;
    total: number;
    activity: number;
    totalStudySeconds: number;
    learners: Set<string>;
    activeUsers: Set<string>;
    scores: DailyScoreRow[];
  }>();

  users.forEach((user) => {
    const department = user.department || 'Unassigned';
    const existing = departments.get(department) ?? {
      department,
      correct: 0,
      total: 0,
      activity: 0,
      totalStudySeconds: 0,
      learners: new Set<string>(),
      activeUsers: new Set<string>(),
      scores: [],
    };

    existing.learners.add(user.id);
    if (user.last_login_at && user.last_login_at >= activeSinceIso) {
      existing.activeUsers.add(user.id);
    }
    departments.set(department, existing);
  });

  stats.forEach((stat) => {
    const department = userDepartment.get(stat.user_id) || 'Unassigned';
    const correct = count(stat.correct_count);
    const total = correct + count(stat.wrong_count);
    const existing = departments.get(department) ?? {
      department,
      correct: 0,
      total: 0,
      activity: 0,
      totalStudySeconds: 0,
      learners: new Set<string>(),
      activeUsers: new Set<string>(),
      scores: [],
    };

    existing.correct += correct;
    existing.total += total;
    existing.activity += total;
    existing.learners.add(stat.user_id);
    departments.set(department, existing);
  });

  scores.forEach((score) => {
    const department = score.department || 'Unassigned';
    const existing = departments.get(department) ?? {
      department,
      correct: 0,
      total: 0,
      activity: 0,
      totalStudySeconds: 0,
      learners: new Set<string>(),
      activeUsers: new Set<string>(),
      scores: [],
    };

    existing.activity += 1;
    existing.totalStudySeconds += count(score.session_seconds);
    existing.scores.push(score);
    departments.set(department, existing);
  });

  return Array.from(departments.values())
    .map((department) => ({
      department: department.department,
      avgAccuracy: toPercent(ratio(department.correct, department.total)),
      totalActivity: department.activity,
      totalStudyMinutes: Math.round(department.totalStudySeconds / 60),
      learnerCount: department.learners.size,
      activeUsers: department.activeUsers.size,
      topLearners: buildTopPerformers(department.scores).slice(0, 3),
    }))
    .sort((a, b) => {
      if (b.avgAccuracy !== a.avgAccuracy) return b.avgAccuracy - a.avgAccuracy;
      return b.totalActivity - a.totalActivity;
    });
}

export async function getUserMetrics(userId: string): Promise<UserMetrics> {
  const [statsResult, progressResult, userResult] = await Promise.all([
    supabase
      .from('user_word_stats')
      .select('user_id, card_id, learning_mode, vocab_set, correct_count, wrong_count, wrong_streak, last_result, last_seen_at, last_review_at, next_review_at, accuracy')
      .eq('user_id', userId),
    supabase
      .from('user_progress')
      .select('user_id, streak, best_streak, combo, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase.from('users').select('id, employee_code, name, department, last_login_at').eq('id', userId).maybeSingle(),
  ]);

  if (statsResult.error) throw statsResult.error;
  if (progressResult.error) throw progressResult.error;
  if (userResult.error) throw userResult.error;

  const stats = toRows<AnalyticsWordStat>(statsResult.data);
  const progress = toRows<UserProgressRow>(progressResult.data)[0];
  const user = (userResult.data as UserRow | null) ?? null;
  const userScores = user
    ? await getDailyScores({
        userId,
        employeeCode: user.employee_code,
        name: user.name,
        dateFrom: getDateDaysAgo(30),
        dateTo: getDateDaysAgo(0),
      })
    : [];
  const correct = stats.reduce((total, row) => total + count(row.correct_count), 0);
  const wrong = stats.reduce((total, row) => total + count(row.wrong_count), 0);
  const totalAnswers = correct + wrong;
  const accuracy = ratio(correct, totalAnswers);
  const weakWordCount = buildWeakWords(stats).length;
  const accuracyTrend = buildAccuracyTrend(stats);
  const activityHeatmap = buildActivityTrend(userScores).slice(-7);
  const totalStudySeconds = userScores.reduce(
    (sum, score) => sum + count(score.session_seconds),
    0
  );

  return {
    userId,
    accuracy: toPercent(accuracy),
    totalAnswers,
    correct,
    wrong,
    streak: count(progress?.streak),
    weakWordCount,
    dailyStudyMinutes: Math.round(totalStudySeconds / 60),
    cardsLearned: stats.filter((stat) => count(stat.correct_count) > 0).length,
    accuracyTrend,
    activityHeatmap,
    insight: getUserInsight({
      accuracy,
      totalAnswers,
      weakWordCount,
      streak: count(progress?.streak),
      factoryAccuracy: ratio(
        stats
          .filter((stat) => stat.vocab_set === 'factory')
          .reduce((total, stat) => total + count(stat.correct_count), 0),
        stats
          .filter((stat) => stat.vocab_set === 'factory')
          .reduce((total, stat) => total + count(stat.correct_count) + count(stat.wrong_count), 0)
      ),
      hskAccuracy: ratio(
        stats
          .filter((stat) => stat.vocab_set === 'hsk4')
          .reduce((total, stat) => total + count(stat.correct_count), 0),
        stats
          .filter((stat) => stat.vocab_set === 'hsk4')
          .reduce((total, stat) => total + count(stat.correct_count) + count(stat.wrong_count), 0)
      ),
    }),
  };
}

export async function getDepartmentMetrics(): Promise<DepartmentMetrics[]> {
  const [usersResult, scoresResult, statsResult] = await Promise.all([
    supabase.from('users').select('id, department, last_login_at'),
    getDailyScores({
      dateFrom: getDateDaysAgo(30),
      dateTo: getDateDaysAgo(0),
    }),
    supabase
      .from('user_word_stats')
      .select('user_id, card_id, learning_mode, vocab_set, correct_count, wrong_count, wrong_streak, last_result, last_seen_at, last_review_at, next_review_at, accuracy'),
  ]);

  if (usersResult.error) throw usersResult.error;
  if (statsResult.error) throw statsResult.error;

  return buildDepartmentMetrics(
    toRows<UserRow>(usersResult.data),
    scoresResult,
    toRows<AnalyticsWordStat>(statsResult.data)
  );
}

export async function getManagerDashboardAnalytics(): Promise<ManagerDashboardAnalytics> {
  const [usersResult, scoresResult, statsResult] = await Promise.all([
    supabase.from('users').select('id, employee_code, name, department, last_login_at'),
    getDailyScores({
      dateFrom: getDateDaysAgo(30),
      dateTo: getDateDaysAgo(0),
    }),
    supabase
      .from('user_word_stats')
      .select('user_id, card_id, learning_mode, vocab_set, correct_count, wrong_count, wrong_streak, last_result, last_seen_at, last_review_at, next_review_at, accuracy'),
  ]);

  if (usersResult.error || statsResult.error) {
    return emptyManagerAnalytics;
  }

  const users = toRows<UserRow>(usersResult.data);
  const scores = scoresResult;
  const stats = toRows<AnalyticsWordStat>(statsResult.data);
  const correct = stats.reduce((total, row) => total + count(row.correct_count), 0);
  const total = stats.reduce(
    (sum, row) => sum + count(row.correct_count) + count(row.wrong_count),
    0
  );

  return {
    totalLearners: users.length,
    activeUsers: users.filter((user) => {
      if (!user.last_login_at) return false;
      return user.last_login_at >= getActiveSinceIso(7);
    }).length,
    totalSessions: scores.length,
    averageAccuracy: toPercent(ratio(correct, total)),
    topPerformers: buildTopPerformers(scores),
    weakestWords: buildWeakWords(stats).slice(0, 10),
    departmentRanking: buildDepartmentMetrics(users, scores, stats),
    activityTrend: buildActivityTrend(scores).slice(-14),
    accuracyTrend: buildAccuracyTrend(stats),
  };
}

export function getEmptyManagerDashboardAnalytics() {
  return emptyManagerAnalytics;
}
