'use client';

import React from 'react';
import { ArrowDownUp, BarChart3, Clock3, Shield, Trophy, Users } from 'lucide-react';

import {
  getEmptyManagerDashboardAnalytics,
  type AccuracyPoint,
  type ActivityPoint,
  type AnalyticsWordStat,
  type DepartmentMetrics,
  type ManagerDashboardAnalytics,
} from '@/lib/analytics';
import type { AppUser } from '@/types/app';

type Props = {
  sessionUser?: AppUser | null;
};

type SortKey = 'avgAccuracy' | 'totalStudyMinutes' | 'activeUsers' | 'totalActivity';

function isManager(user?: AppUser | null) {
  return user?.role === 'manager' || user?.role === 'admin';
}

function maxValue(values: number[]) {
  return Math.max(1, ...values);
}

function formatDateLabel(date: string) {
  const [, month, day] = date.split('-');
  return month && day ? `${month}/${day}` : date;
}

function inferWeakCluster(word: AnalyticsWordStat) {
  if (word.vocab_set === 'factory') return 'Factory Terms';
  if (word.card_id.startsWith('hsk4-')) return 'HSK4 Group';
  return 'General Vocabulary';
}

function buildWeakClusters(words: AnalyticsWordStat[]) {
  const grouped = new Map<string, number>();

  words.forEach((word) => {
    const key = inferWeakCluster(word);
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  });

  return Array.from(grouped.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function ManagerDashboard({ sessionUser }: Props) {
  const [dashboard, setDashboard] = React.useState<ManagerDashboardAnalytics>(
    getEmptyManagerDashboardAnalytics()
  );
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [departmentFilter, setDepartmentFilter] = React.useState('All');
  const [sortKey, setSortKey] = React.useState<SortKey>('avgAccuracy');

  React.useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!isManager(sessionUser)) return;

      setLoading(true);
      setErrorMessage('');

      try {
        const response = await fetch('/api/manager/dashboard', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(response.status === 403 ? 'Forbidden' : 'Unable to load dashboard');
        }

        const data = (await response.json()) as ManagerDashboardAnalytics;
        if (!cancelled) setDashboard(data);
      } catch {
        if (!cancelled) {
          setErrorMessage('Dashboard data is temporarily unavailable');
          setDashboard(getEmptyManagerDashboardAnalytics());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [sessionUser]);

  const departments = React.useMemo(() => {
    const list = dashboard.departmentRanking.map((department) => department.department);
    return ['All', ...list];
  }, [dashboard.departmentRanking]);

  const departmentRows = React.useMemo(() => {
    const filtered =
      departmentFilter === 'All'
        ? dashboard.departmentRanking
        : dashboard.departmentRanking.filter((item) => item.department === departmentFilter);

    return [...filtered].sort((a, b) => {
      if (sortKey === 'avgAccuracy') return b.avgAccuracy - a.avgAccuracy;
      if (sortKey === 'totalStudyMinutes') return b.totalStudyMinutes - a.totalStudyMinutes;
      if (sortKey === 'activeUsers') return b.activeUsers - a.activeUsers;
      return b.totalActivity - a.totalActivity;
    });
  }, [dashboard.departmentRanking, departmentFilter, sortKey]);

  const weakClusters = React.useMemo(
    () => buildWeakClusters(dashboard.weakestWords).slice(0, 6),
    [dashboard.weakestWords]
  );

  if (!isManager(sessionUser)) {
    return null;
  }

  return (
    <div className="space-y-5 rounded-3xl bg-white/10 p-6 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-cyan-100" />
          <h2 className="text-xl font-bold">Manager Dashboard</h2>
        </div>
        <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
          Enterprise Analytics
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200/40 bg-rose-500/20 px-4 py-3 text-sm">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total Learners" value={dashboard.totalLearners} />
        <MetricCard label="Active Users" value={dashboard.activeUsers} />
        <MetricCard label="Total Sessions" value={dashboard.totalSessions} />
        <MetricCard label="Avg Accuracy" value={`${dashboard.averageAccuracy}%`} />
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white/10 p-4 text-sm text-white/75">
          Loading analytics...
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Accuracy Trend" icon={<BarChart3 className="h-4 w-4" />}>
              <AccuracyChart points={dashboard.accuracyTrend} />
            </Panel>

            <Panel title="Daily Activity" icon={<Clock3 className="h-4 w-4" />}>
              <ActivityChart points={dashboard.activityTrend} />
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Panel title="Department Performance" icon={<Users className="h-4 w-4" />}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <select
                  value={departmentFilter}
                  onChange={(event) => setDepartmentFilter(event.target.value)}
                  className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none"
                >
                  {departments.map((department) => (
                    <option key={department} value={department} className="text-slate-900">
                      {department}
                    </option>
                  ))}
                </select>

                <div className="flex flex-wrap gap-2">
                  {([
                    ['avgAccuracy', 'Accuracy'],
                    ['totalStudyMinutes', 'Study Time'],
                    ['activeUsers', 'Learners'],
                    ['totalActivity', 'Activity'],
                  ] as Array<[SortKey, string]>).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSortKey(key)}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        sortKey === key
                          ? 'border-white/25 bg-white/20 text-white'
                          : 'border-white/10 bg-white/5 text-white/80'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <ArrowDownUp className="h-3.5 w-3.5" />
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr] bg-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  <span>Department</span>
                  <span>Accuracy</span>
                  <span>Study Time</span>
                  <span>Active</span>
                </div>
                <div className="divide-y divide-white/10">
                  {departmentRows.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-white/70">No department data yet</div>
                  ) : (
                    departmentRows.map((department) => (
                      <DepartmentTableRow key={department.department} department={department} />
                    ))
                  )}
                </div>
              </div>
            </Panel>

            <div className="space-y-4">
              <Panel title="Top Performers" icon={<Trophy className="h-4 w-4" />}>
                {dashboard.topPerformers.length === 0 ? (
                  <EmptyState label="No score data yet" />
                ) : (
                  dashboard.topPerformers.slice(0, 5).map((player, index) => (
                    <div
                      key={`${player.name}-${player.employee_code ?? index}`}
                      className="mb-2 rounded-xl bg-white/10 px-3 py-3 text-sm last:mb-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate font-medium">{player.name}</span>
                        <span className="shrink-0 font-bold">{player.score}</span>
                      </div>
                      <div className="mt-1 text-xs text-white/65">
                        {player.department || 'No department'}
                      </div>
                    </div>
                  ))
                )}
              </Panel>

              <Panel title="Weak Word Clusters" icon={<BarChart3 className="h-4 w-4" />}>
                {weakClusters.length === 0 ? (
                  <EmptyState label="No weak clusters yet" />
                ) : (
                  weakClusters.map((cluster) => (
                    <div
                      key={cluster.label}
                      className="mb-2 rounded-xl bg-white/10 px-3 py-3 text-sm last:mb-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{cluster.label}</span>
                        <span className="font-bold">{cluster.count}</span>
                      </div>
                    </div>
                  ))
                )}
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white/10 p-4 text-center">
      <p className="text-sm text-white/70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function AccuracyChart({ points }: { points: AccuracyPoint[] }) {
  if (points.length === 0) return <EmptyState label="No accuracy trend yet" />;

  return (
    <div className="flex h-40 items-end gap-2 rounded-2xl bg-white/10 p-3">
      {points.map((point) => (
        <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="flex h-28 w-full items-end">
            <div
              className="w-full rounded-t-lg bg-cyan-300"
              style={{ height: `${Math.max(6, point.accuracy)}%` }}
            />
          </div>
          <div className="text-[10px] text-white/65">{formatDateLabel(point.date)}</div>
        </div>
      ))}
    </div>
  );
}

function ActivityChart({ points }: { points: ActivityPoint[] }) {
  if (points.length === 0) return <EmptyState label="No daily activity yet" />;

  const maxSessions = maxValue(points.map((point) => point.sessions));

  return (
    <div className="flex h-40 items-end gap-2 rounded-2xl bg-white/10 p-3">
      {points.map((point) => (
        <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="flex h-28 w-full items-end">
            <div
              className="w-full rounded-t-lg bg-emerald-300"
              style={{ height: `${Math.max(6, (point.sessions / maxSessions) * 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-white/65">{formatDateLabel(point.date)}</div>
        </div>
      ))}
    </div>
  );
}

function DepartmentTableRow({ department }: { department: DepartmentMetrics }) {
  return (
    <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr] px-4 py-3 text-sm text-white">
      <div className="min-w-0">
        <p className="truncate font-medium">{department.department}</p>
        <p className="text-xs text-white/65">
          {department.learnerCount} learners / {department.totalActivity} activities
        </p>
      </div>
      <span>{department.avgAccuracy}%</span>
      <span>{department.totalStudyMinutes}m</span>
      <span>{department.activeUsers}</span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-xl bg-white/10 px-3 py-3 text-sm text-white/65">{label}</div>;
}
