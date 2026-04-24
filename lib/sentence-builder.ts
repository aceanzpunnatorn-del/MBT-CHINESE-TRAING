import { getPreferredSentenceVariant, type SentenceDifficulty, type SentenceVariant } from '@/lib/sentence-variants';
import type { LearningMode } from '@/types/app';

export type SentenceBuilderLang = 'zh-CN' | 'th-TH';

export type SentenceBuilderCard = {
  id: string;
  zh: string;
  pinyin?: string;
  th: string;
  sentenceZh?: string;
  sentencePinyin?: string;
  sentenceTh?: string;
  sentenceThaiPronunciation?: string;
  sentenceVariants?: SentenceVariant[];
  category?: string;
};

export type SentenceBuilderToken = {
  id: string;
  text: string;
  order: number;
};

export type SentenceBuilderExercise = {
  id: string;
  difficulty: SentenceDifficulty;
  label: string;
  instruction: string;
  prompt: string;
  promptLang: SentenceBuilderLang;
  target: string;
  targetLang: SentenceBuilderLang;
  guide?: string;
  tokens: SentenceBuilderToken[];
};

function cleanText(text?: string) {
  return text?.replace(/\s+/g, ' ').trim() ?? '';
}

function isPunctuation(text: string) {
  return /^[.,!?;:，。！？；：（）()、"“”'’]+$/u.test(text);
}

function segmentWithIntl(text: string, lang: SentenceBuilderLang) {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter === 'undefined') {
    return [];
  }

  const locale = lang === 'zh-CN' ? 'zh-CN' : 'th-TH';
  const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
  const tokens: string[] = [];

  for (const segment of segmenter.segment(text)) {
    const value = cleanText(segment.segment);
    if (!value) continue;

    if (segment.isWordLike || isPunctuation(value)) {
      tokens.push(value);
      continue;
    }

    if (!/\s/u.test(value)) {
      tokens.push(value);
    }
  }

  return tokens;
}

function fallbackChineseTokens(text: string) {
  const tokens: string[] = [];
  const particleSet = new Set(['了', '吗', '呢', '吧', '的', '得', '地', '着', '过']);
  let current = '';

  for (const char of Array.from(text)) {
    if (/\s/u.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    if (isPunctuation(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      tokens.push(char);
      continue;
    }

    if (particleSet.has(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      tokens.push(char);
      continue;
    }

    current += char;

    if (current.length >= 2) {
      tokens.push(current);
      current = '';
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function fallbackThaiTokens(text: string) {
  return text
    .replace(/([.,!?;:，。！？；：（）()])/gu, ' $1 ')
    .split(/\s+/u)
    .map((part) => cleanText(part))
    .filter(Boolean);
}

function tokenizeSentence(text: string, lang: SentenceBuilderLang) {
  const normalized = cleanText(text);
  if (!normalized) return [];

  const segmented = segmentWithIntl(normalized, lang);
  if (segmented.length >= 2) {
    return segmented;
  }

  return lang === 'zh-CN' ? fallbackChineseTokens(normalized) : fallbackThaiTokens(normalized);
}

function shuffleArray<T>(items: T[]) {
  const cloned = [...items];

  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [cloned[index], cloned[randomIndex]] = [cloned[randomIndex], cloned[index]];
  }

  return cloned;
}

function getVariantByDifficulty(
  variants: SentenceVariant[] | undefined,
  difficulty: SentenceDifficulty
) {
  if (!variants || variants.length === 0) return null;
  return (
    variants.find((variant) => variant.difficulty === difficulty) ||
    getPreferredSentenceVariant(variants, 'applied') ||
    variants[0]
  );
}

export function getAvailableSentenceDifficulties(card: SentenceBuilderCard) {
  const variantDifficulties = Array.from(
    new Set((card.sentenceVariants ?? []).map((variant) => variant.difficulty))
  );

  if (variantDifficulties.length > 0) {
    return variantDifficulties;
  }

  if (card.sentenceZh || card.sentenceTh) {
    return ['applied'] as SentenceDifficulty[];
  }

  return [] as SentenceDifficulty[];
}

export function createSentenceBuilderExercise(params: {
  card: SentenceBuilderCard;
  learningMode: LearningMode;
  difficulty: SentenceDifficulty;
  shuffleSeed?: number;
}): SentenceBuilderExercise | null {
  const { card, learningMode, difficulty, shuffleSeed = 0 } = params;
  const variant = getVariantByDifficulty(card.sentenceVariants, difficulty);

  const target =
    learningMode === 'thai-learns-chinese'
      ? cleanText(variant?.zh || card.sentenceZh)
      : cleanText(variant?.th || card.sentenceTh);

  const prompt =
    learningMode === 'thai-learns-chinese'
      ? cleanText(variant?.th || card.sentenceTh || card.th)
      : cleanText(variant?.zh || card.sentenceZh || card.zh);

  if (!target || !prompt) {
    return null;
  }

  const targetLang: SentenceBuilderLang =
    learningMode === 'thai-learns-chinese' ? 'zh-CN' : 'th-TH';
  const promptLang: SentenceBuilderLang =
    learningMode === 'thai-learns-chinese' ? 'th-TH' : 'zh-CN';

  const tokens = tokenizeSentence(target, targetLang);
  if (tokens.length < 2) {
    return null;
  }

  const orderedTokens: SentenceBuilderToken[] = tokens.map((token, index) => ({
    id: `${card.id}-${difficulty}-${index}`,
    text: token,
    order: index,
  }));

  const shuffledTokens = shuffleArray(
    orderedTokens.map((token, index) => ({
      ...token,
      id: `${token.id}-${shuffleSeed}-${index}`,
    }))
  );

  return {
    id: `${card.id}-${difficulty}-${learningMode}-${shuffleSeed}`,
    difficulty,
    label: variant?.label || 'Sentence Practice',
    instruction:
      learningMode === 'thai-learns-chinese'
        ? 'Arrange the Chinese sentence from the Thai meaning'
        : 'Arrange the Thai sentence from the Chinese meaning',
    prompt,
    promptLang,
    target,
    targetLang,
    guide:
      learningMode === 'thai-learns-chinese'
        ? cleanText(variant?.pinyin || card.sentencePinyin)
        : cleanText(variant?.thaiPronunciation || card.sentenceThaiPronunciation),
    tokens: shuffledTokens,
  };
}

export function isSentenceBuilderCorrect(
  selectedTokenIds: string[],
  exercise: SentenceBuilderExercise
) {
  if (selectedTokenIds.length !== exercise.tokens.length) {
    return false;
  }

  const tokenById = new Map(exercise.tokens.map((token) => [token.id, token]));

  return selectedTokenIds.every((tokenId, index) => {
    const token = tokenById.get(tokenId);
    return token?.order === index;
  });
}
