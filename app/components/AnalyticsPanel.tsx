'use client';

import React from 'react';
import { Activity, BarChart3, Clock3, Flame, Sparkles, Target } from 'lucide-react';

import type { UserMetrics } from '@/lib/analytics';

type Props = {
  metrics: UserMetrics | null;
  loading: boolean;
};

function maxValue(values: number[]) {
  return Math.max(1, ...values);
}

function EmptyBar({ label }: { label: string }) {
  return (
    <div className="rounded-xl bg-white/80 px-3 py-3 text-sm text-[#6B7C8F]">
      {label}
    </div>
  );
}

export function AnalyticsPanel({ metrics, loading }: Props) {
  return (
    <div className="duo-surface rounded-[28px] p-4">
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-[#58CC02]" />
        <p className="font-semibold text-[#163047]">Learning Analytics</p>
      </div>

      {loading ? (
        <div className="rounded-xl bg-[#F8FDEB] px-3 py-3 text-sm text-[#6B7C8F]">
          Loading analytics...
        </div>
      ) : !metrics ? (
        <div className="rounded-xl bg-[#F8FDEB] px-3 py-3 text-sm text-[#6B7C8F]">
          Start studying to build your learning analytics.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricChip icon={<Target className="h-4 w-4" />} label="Accuracy" value={`${metrics.accuracy}%`} />
            <MetricChip icon={<Clock3 className="h-4 w-4" />} label="Study Time" value={`${metrics.dailyStudyMinutes}m`} />
            <MetricChip icon={<Flame className="h-4 w-4" />} label="Streak" value={String(metrics.streak)} />
            <MetricChip icon={<Activity className="h-4 w-4" />} label="Weak Words" value={String(metrics.weakWordCount)} />
            <MetricChip icon={<BarChart3 className="h-4 w-4" />} label="Cards Learned" value={String(metrics.cardsLearned)} />
            <MetricChip icon={<Target className="h-4 w-4" />} label="Answers" value={String(metrics.totalAnswers)} />
          </div>

          <div className="rounded-2xl bg-[#F8FDEB] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#163047]">
              <Sparkles className="h-4 w-4 text-[#58CC02]" />
              Insight
            </div>
            <p className="text-sm leading-6 text-[#55677A]">{metrics.insight}</p>
          </div>

          <div className="rounded-2xl bg-[#F8FDEB] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#163047]">Accuracy Trend</p>
              <span className="text-xs text-[#6B7C8F]">Last 7-14 reviews</span>
            </div>
            {metrics.accuracyTrend.length === 0 ? (
              <EmptyBar label="No trend data yet" />
            ) : (
              <div className="flex h-28 items-end gap-2 sm:h-32">
                {metrics.accuracyTrend.map((point) => (
                  <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="flex h-16 w-full items-end sm:h-20">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-[#58CC02] to-[#9AE65A]"
                        style={{ height: `${Math.max(8, point.accuracy)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#6B7C8F]">
                      {point.date.slice(5).replace('-', '/')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-[#F8FDEB] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#163047]">Activity</p>
              <span className="text-xs text-[#6B7C8F]">7 day rhythm</span>
            </div>
            {metrics.activityHeatmap.length === 0 ? (
              <EmptyBar label="No activity data yet" />
            ) : (
              <div className="flex gap-2">
                {metrics.activityHeatmap.map((point) => {
                  const peak = maxValue(metrics.activityHeatmap.map((item) => item.sessions));
                  const intensity = Math.max(0.18, point.sessions / peak);
                  return (
                    <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      <div
                        className="h-12 w-full rounded-xl border border-[#D8E9C9] sm:h-14"
                        style={{
                          backgroundColor: `rgba(88, 204, 2, ${intensity})`,
                        }}
                      />
                      <span className="text-[10px] text-[#6B7C8F]">
                        {point.date.slice(5).replace('-', '/')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D8E9C9] bg-[#F8FDEB] p-3">
      <div className="flex items-center gap-2 text-[#58CC02]">{icon}</div>
      <div className="mt-2 text-base font-bold text-[#163047] sm:text-lg">{value}</div>
      <div className="text-xs text-[#6B7C8F]">{label}</div>
    </div>
  );
}
