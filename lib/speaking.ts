import {
  getPreferredSentenceVariant,
  type SentenceVariant,
} from '@/lib/sentence-variants';
import type { LearningMode } from '@/types/app';

export type SpeakingPracticeMode = 'word' | 'sentence';
export type SpeakingFeedbackLevel = 'excellent' | 'good' | 'fair' | 'retry';

export type SpeakingCard = {
  zh: string;
  pinyin?: string;
  th: string;
  sentenceZh?: string;
  sentencePinyin?: string;
  sentenceTh?: string;
  thaiPronunciation?: string;
  sentenceThaiPronunciation?: string;
  sentenceVariants?: SentenceVariant[];
  category?: string;
};

export type SpeakingTarget = {
  label: string;
  text: string;
  guide?: string;
  speechLang: 'zh-CN' | 'th-TH';
};

export type SpeakingScoreResult = {
  score: number;
  exact: boolean;
  level: SpeakingFeedbackLevel;
  feedback: string;
  normalizedTarget: string;
  normalizedTranscript: string;
};

function stripMarks(text: string) {
  return text
    .normalize('NFKC')
    .replace(/[“”"'`.,!?;:(){}\[\]<>|/\\_-]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let row = 0; row < rows; row += 1) {
    matrix[row][0] = row;
  }

  for (let col = 0; col < cols; col += 1) {
    matrix[0][col] = col;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = a[row - 1] === b[col - 1] ? 0 : 1;

      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost
      );
    }
  }

  return matrix[rows - 1][cols - 1];
}

export function getSpeakingTarget(
  card: SpeakingCard,
  learningMode: LearningMode,
  mode: SpeakingPracticeMode
): SpeakingTarget {
  const preferredSentence = getPreferredSentenceVariant(card.sentenceVariants, 'applied');

  if (learningMode === 'thai-learns-chinese') {
    if (mode === 'sentence' && (preferredSentence?.zh || card.sentenceZh)) {
      return {
        label: 'Speak Chinese Sentence',
        text: preferredSentence?.zh || card.sentenceZh || card.zh,
        guide: preferredSentence?.pinyin || card.sentencePinyin || card.pinyin,
        speechLang: 'zh-CN',
      };
    }

    return {
      label: 'Speak Chinese Word',
      text: card.zh,
      guide: card.pinyin,
      speechLang: 'zh-CN',
    };
  }

  if (mode === 'sentence' && (preferredSentence?.th || card.sentenceTh)) {
    return {
      label: 'Speak Thai Sentence',
      text: preferredSentence?.th || card.sentenceTh || card.th,
      guide:
        preferredSentence?.thaiPronunciation ||
        card.sentenceThaiPronunciation ||
        card.thaiPronunciation,
      speechLang: 'th-TH',
    };
  }

  return {
    label: 'Speak Thai Word',
    text: card.th,
    guide: card.thaiPronunciation,
    speechLang: 'th-TH',
  };
}

export function calculateSpeakingScore(
  target: string,
  transcript: string
): SpeakingScoreResult {
  const normalizedTarget = stripMarks(target);
  const normalizedTranscript = stripMarks(transcript);

  if (!normalizedTranscript) {
    return {
      score: 0,
      exact: false,
      level: 'retry',
      feedback: 'No speech was detected. Try again with a clear, steady voice.',
      normalizedTarget,
      normalizedTranscript,
    };
  }

  const exact = normalizedTarget === normalizedTranscript;
  const maxLength = Math.max(normalizedTarget.length, normalizedTranscript.length, 1);
  const distance = levenshtein(normalizedTarget, normalizedTranscript);
  let score = Math.round((1 - distance / maxLength) * 100);

  if (normalizedTranscript.includes(normalizedTarget) || normalizedTarget.includes(normalizedTranscript)) {
    score = Math.max(score, 82);
  }

  score = Math.max(0, Math.min(score, 100));

  if (score >= 90 || exact) {
    return {
      score,
      exact,
      level: 'excellent',
      feedback: 'Excellent pronunciation flow. Keep the same rhythm and confidence.',
      normalizedTarget,
      normalizedTranscript,
    };
  }

  if (score >= 75) {
    return {
      score,
      exact,
      level: 'good',
      feedback: 'Good job. Tighten the last syllable and keep your pace smooth.',
      normalizedTarget,
      normalizedTranscript,
    };
  }

  if (score >= 55) {
    return {
      score,
      exact,
      level: 'fair',
      feedback: 'You are close. Break the phrase into smaller chunks and repeat once more.',
      normalizedTarget,
      normalizedTranscript,
    };
  }

  return {
    score,
    exact,
    level: 'retry',
    feedback: 'Try again. Listen once, copy the rhythm, then speak more slowly and clearly.',
    normalizedTarget,
    normalizedTranscript,
  };
}

export function getSpeakingTips(target: SpeakingTarget, category?: string) {
  const tips = [
    `Listen first, then repeat the ${target.label.toLowerCase()} in one smooth phrase.`,
    `Keep the phrase short and steady${category ? ` for ${category.toLowerCase()} vocabulary` : ''}.`,
  ];

  if (target.guide) {
    tips.push(`Use the guide "${target.guide}" as your pronunciation checkpoint.`);
  }

  if (target.speechLang === 'zh-CN') {
    tips.push('Focus on tone shape and syllable endings, not just speed.');
  } else {
    tips.push('Focus on vowel length and natural Thai rhythm.');
  }

  return tips;
}
