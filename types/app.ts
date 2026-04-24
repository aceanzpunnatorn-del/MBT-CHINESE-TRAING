export type LearningMode = 'thai-learns-chinese' | 'chinese-learns-thai';
export type VocabSet = 'all' | 'hsk4' | 'factory';
export type AppMode = 'flashcards' | 'quiz' | 'review';
export type DeckMode = 'normal' | 'smart' | 'weak' | 'review';
export type UserRole = 'learner' | 'manager' | 'admin';

export type AppUser = {
  id: string;
  employee_code: string;
  name: string;
  department: string;
  role?: UserRole;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string | null;
};

export type UserProgress = {
  id?: string;
  user_id: string;
  learning_mode: LearningMode;
  vocab_set: VocabSet | string;
  current_index: number;
  streak?: number;
  best_streak?: number;
  combo?: number;
  today_done?: boolean;
  last_study_date?: string | null;
  updated_at?: string;
};

export type BadgeId =
  | 'streak_7'
  | 'streak_30'
  | 'accuracy_90'
  | 'fast_learner'
  | 'review_master'
  | 'weak_conqueror';

export type Badge = {
  id: BadgeId;
  label: string;
  description: string;
  icon: string;
};

export const BADGE_DEFINITIONS: Record<BadgeId, Badge> = {
  streak_7: {
    id: 'streak_7',
    label: '7-Day Streak',
    description: 'Study 7 days in a row',
    icon: '\u{1F525}',
  },
  streak_30: {
    id: 'streak_30',
    label: '30-Day Streak',
    description: 'Study 30 days in a row',
    icon: '\u{1F3C6}',
  },
  accuracy_90: {
    id: 'accuracy_90',
    label: 'Sharpshooter',
    description: 'Quiz accuracy above 90%',
    icon: '\u{1F3AF}',
  },
  fast_learner: {
    id: 'fast_learner',
    label: 'Fast Learner',
    description: 'Complete 100 cards in one session',
    icon: '\u26A1',
  },
  review_master: {
    id: 'review_master',
    label: 'Review Master',
    description: 'Complete a full SRS review session',
    icon: '\u{1F9E0}',
  },
  weak_conqueror: {
    id: 'weak_conqueror',
    label: 'Weak Conqueror',
    description: 'Clear all weak words',
    icon: '\u{1F4AA}',
  },
};

export function computeBadges(params: {
  streak: number;
  quizCorrect: number;
  quizTotal: number;
  sessionCards: number;
  reviewDone: boolean;
  weakWordsLeft: number;
}): BadgeId[] {
  const earned: BadgeId[] = [];
  const { streak, quizCorrect, quizTotal, sessionCards, reviewDone, weakWordsLeft } = params;

  if (streak >= 7) earned.push('streak_7');
  if (streak >= 30) earned.push('streak_30');
  if (quizTotal >= 10 && quizCorrect / quizTotal >= 0.9) earned.push('accuracy_90');
  if (sessionCards >= 100) earned.push('fast_learner');
  if (reviewDone) earned.push('review_master');
  if (weakWordsLeft === 0 && sessionCards > 0) earned.push('weak_conqueror');

  return earned;
}
