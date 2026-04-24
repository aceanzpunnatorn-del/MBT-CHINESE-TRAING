export type WeakWordRecord = {
  correctCount?: number | null;
  wrongCount?: number | null;
  accuracy?: number | null;
  lastWrongAt?: string | null;
};

export type WeakWordUpdate = {
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  lastWrongAt: string | null;
};

function count(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function normalizeAccuracy(record: WeakWordRecord) {
  if (typeof record.accuracy === 'number' && Number.isFinite(record.accuracy)) {
    return record.accuracy > 1 ? record.accuracy / 100 : record.accuracy;
  }

  const correctCount = count(record.correctCount);
  const wrongCount = count(record.wrongCount);
  const total = correctCount + wrongCount;
  return total === 0 ? 1 : correctCount / total;
}

function wasWrongWithinDays(lastWrongAt: string | null | undefined, days: number, now = new Date()) {
  if (!lastWrongAt) return false;
  const diff = now.getTime() - new Date(lastWrongAt).getTime();
  return diff <= days * 24 * 60 * 60 * 1000;
}

export function updateWordStats(
  record: WeakWordRecord | null | undefined,
  result: { isCorrect: boolean; now?: Date }
): WeakWordUpdate {
  const currentCorrect = count(record?.correctCount);
  const currentWrong = count(record?.wrongCount);
  const nextCorrect = currentCorrect + (result.isCorrect ? 1 : 0);
  const nextWrong = currentWrong + (result.isCorrect ? 0 : 1);
  const total = nextCorrect + nextWrong;
  const now = result.now ?? new Date();

  return {
    correctCount: nextCorrect,
    wrongCount: nextWrong,
    accuracy: total === 0 ? 1 : nextCorrect / total,
    lastWrongAt: result.isCorrect ? record?.lastWrongAt ?? null : now.toISOString(),
  };
}

export function getWeakWords<T extends WeakWordRecord>(cards: T[], now = new Date()) {
  return cards.filter((card) => {
    const accuracy = normalizeAccuracy(card);
    return accuracy < 0.7 || wasWrongWithinDays(card.lastWrongAt, 3, now);
  });
}

export function prioritizeWeakCards<T extends WeakWordRecord>(cards: T[], now = new Date()) {
  return [...cards].sort((a, b) => {
    const aAccuracy = normalizeAccuracy(a);
    const bAccuracy = normalizeAccuracy(b);
    const aRecentWrong = wasWrongWithinDays(a.lastWrongAt, 3, now) ? 1 : 0;
    const bRecentWrong = wasWrongWithinDays(b.lastWrongAt, 3, now) ? 1 : 0;

    if (bRecentWrong !== aRecentWrong) {
      return bRecentWrong - aRecentWrong;
    }

    if (aAccuracy !== bAccuracy) {
      return aAccuracy - bAccuracy;
    }

    return count(b.wrongCount) - count(a.wrongCount);
  });
}
