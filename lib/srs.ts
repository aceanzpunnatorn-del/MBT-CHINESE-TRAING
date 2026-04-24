export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export type SrsCardState = {
  easeFactor?: number | null;
  interval?: number | null;
  repetitions?: number | null;
  dueDate?: string | null;
};

export type SrsReviewResult = {
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: string;
  lastResult: boolean;
};

const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;

function normalizeNumber(value: number | null | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function roundEase(value: number) {
  return Math.max(MIN_EASE_FACTOR, Number(value.toFixed(2)));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function calculateNextReview(
  card: SrsCardState | null | undefined,
  rating: ReviewRating,
  now = new Date()
): SrsReviewResult {
  const easeFactor = normalizeNumber(card?.easeFactor, DEFAULT_EASE_FACTOR);
  const interval = Math.max(0, normalizeNumber(card?.interval, 0));
  const repetitions = Math.max(0, normalizeNumber(card?.repetitions, 0));

  if (rating === 'again') {
    return {
      easeFactor: roundEase(easeFactor - 0.2),
      interval: 0,
      repetitions: 0,
      dueDate: now.toISOString(),
      lastResult: false,
    };
  }

  const nextRepetitions = repetitions + 1;

  if (rating === 'hard') {
    const nextInterval =
      nextRepetitions <= 1 ? 1 : Math.max(1, Math.ceil(Math.max(interval, 1) * 1.2));

    return {
      easeFactor: roundEase(easeFactor - 0.15),
      interval: nextInterval,
      repetitions: nextRepetitions,
      dueDate: addDays(now, nextInterval).toISOString(),
      lastResult: true,
    };
  }

  if (rating === 'easy') {
    const nextEase = roundEase(easeFactor + 0.15);
    const nextInterval =
      nextRepetitions === 1
        ? 4
        : nextRepetitions === 2
        ? 7
        : Math.max(4, Math.round(Math.max(interval, 1) * nextEase * 1.3));

    return {
      easeFactor: nextEase,
      interval: nextInterval,
      repetitions: nextRepetitions,
      dueDate: addDays(now, nextInterval).toISOString(),
      lastResult: true,
    };
  }

  const nextEase = roundEase(easeFactor + 0.05);
  const nextInterval =
    nextRepetitions === 1
      ? 1
      : nextRepetitions === 2
      ? 3
      : Math.max(1, Math.round(Math.max(interval, 1) * nextEase));

  return {
    easeFactor: nextEase,
    interval: nextInterval,
    repetitions: nextRepetitions,
    dueDate: addDays(now, nextInterval).toISOString(),
    lastResult: true,
  };
}

export function isDue(card: { dueDate?: string | null } | null | undefined, now = new Date()) {
  if (!card?.dueDate) return true;
  return new Date(card.dueDate).getTime() <= now.getTime();
}

export function getDueCards<T extends { dueDate?: string | null }>(cards: T[], now = new Date()) {
  return cards.filter((card) => isDue(card, now));
}

export function createReviewQueue(cardIds: string[]) {
  return Array.from(new Set(cardIds));
}

export function applyRatingToReviewQueue(queue: string[], cardId: string, rating: ReviewRating) {
  const remaining = queue.filter((id, index) => !(index === 0 && id === cardId));

  if (rating === 'again') {
    return [cardId, ...remaining];
  }

  return remaining;
}
