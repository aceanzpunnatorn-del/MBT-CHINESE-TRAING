export type UserInsightStats = {
  accuracy: number;
  previousAccuracy?: number | null;
  weakWordCount: number;
  totalAnswers: number;
  streak: number;
  factoryAccuracy?: number | null;
  hskAccuracy?: number | null;
  weakestCategories?: string[];
};

function asPercent(value: number) {
  return Math.round(value * 100);
}

export function getUserInsight(userStats: UserInsightStats) {
  const {
    accuracy,
    previousAccuracy,
    weakWordCount,
    totalAnswers,
    streak,
    factoryAccuracy,
    hskAccuracy,
    weakestCategories = [],
  } = userStats;

  if (totalAnswers === 0) {
    return 'Start with a short review session to build your first learning profile.';
  }

  if (weakestCategories.some((category) => category.toLowerCase().includes('abstract'))) {
    return 'You struggle with abstract words. Review examples slowly and say each sentence aloud.';
  }

  if (typeof previousAccuracy === 'number' && previousAccuracy - accuracy >= 0.08) {
    return 'Your accuracy dropped this week. Spend today on review and weak words before learning new words.';
  }

  if (
    typeof factoryAccuracy === 'number' &&
    typeof hskAccuracy === 'number' &&
    factoryAccuracy >= 0.75 &&
    factoryAccuracy - hskAccuracy >= 0.08
  ) {
    return 'You are improving in factory vocabulary. Keep mixing review with new production-floor terms.';
  }

  if (weakWordCount >= 10) {
    return 'Your weak-word list is growing. Focus on accuracy over speed for the next session.';
  }

  if (streak >= 7 && accuracy >= 0.8) {
    return `Strong momentum: ${streak} day streak with ${asPercent(accuracy)}% accuracy.`;
  }

  if (accuracy >= 0.85) {
    return 'Your accuracy is strong. Add a few new words while keeping daily review active.';
  }

  if (accuracy < 0.6) {
    return 'Accuracy is below target. Repeat weak words first, then take a short quiz.';
  }

  return 'You are making steady progress. Review due words first, then add a small set of new words.';
}
