export type WeakWordStats = {
  correct_count?: number | null;
  wrong_count?: number | null;
  last_result?: boolean | null;
  wrong_streak?: number | null;
};

export type WeakWordSnapshot = {
  totalAttempts: number;
  accuracy: number;
  wrongStreak: number;
  isWeak: boolean;
};

export const WEAK_ACCURACY_THRESHOLD = 0.6;
export const WEAK_WRONG_STREAK_THRESHOLD = 2;

function normalizeCount(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

export function getAccuracy(stats: WeakWordStats) {
  const correct = normalizeCount(stats.correct_count);
  const wrong = normalizeCount(stats.wrong_count);
  const total = correct + wrong;

  if (total === 0) return 1;
  return correct / total;
}

export function getWrongStreak(stats: WeakWordStats) {
  if (typeof stats.wrong_streak === 'number' && Number.isFinite(stats.wrong_streak)) {
    return Math.max(0, stats.wrong_streak);
  }

  return stats.last_result === false ? 1 : 0;
}

export function getNextWrongStreak(stats: WeakWordStats | null | undefined, isCorrect: boolean) {
  if (isCorrect) return 0;
  return getWrongStreak(stats ?? {}) + 1;
}

export function isWeakWord(stats: WeakWordStats) {
  const totalAttempts = normalizeCount(stats.correct_count) + normalizeCount(stats.wrong_count);
  const accuracy = getAccuracy(stats);
  const wrongStreak = getWrongStreak(stats);

  return (
    (totalAttempts > 0 && accuracy < WEAK_ACCURACY_THRESHOLD) ||
    wrongStreak >= WEAK_WRONG_STREAK_THRESHOLD
  );
}

export function createWeakWordSnapshot(stats: WeakWordStats): WeakWordSnapshot {
  const correct = normalizeCount(stats.correct_count);
  const wrong = normalizeCount(stats.wrong_count);
  const totalAttempts = correct + wrong;
  const accuracy = totalAttempts === 0 ? 1 : correct / totalAttempts;
  const wrongStreak = getWrongStreak(stats);

  return {
    totalAttempts,
    accuracy,
    wrongStreak,
    isWeak:
      (totalAttempts > 0 && accuracy < WEAK_ACCURACY_THRESHOLD) ||
      wrongStreak >= WEAK_WRONG_STREAK_THRESHOLD,
  };
}
