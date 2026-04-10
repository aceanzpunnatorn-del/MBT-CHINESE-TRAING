import { hsk4Data } from '@/lib/hsk4-data';
import { factoryEnglish900th } from '@/lib/factory-english-900-th';
import {
  SentenceBuilderItem,
  tokenizeChinese,
  tokenizeEnglish,
  tokenizeThai,
} from '@/lib/sentence-builder-utils';

export const sentenceBuilderData: SentenceBuilderItem[] = [
  ...factoryEnglish900th
    .filter((item) => item.sentenceTh && item.sentenceEn && item.sentenceZh)
    .map((item) => ({
      id: `factory-${item.id}`,
      source: 'factory' as const,
      difficulty: 'medium' as const,
      th: item.sentenceTh,
      thRoman: '',
      zh: item.sentenceZh,
      en: item.sentenceEn,
      tokensTh: tokenizeThai(item.sentenceTh),
      tokensZh: tokenizeChinese(item.sentenceZh),
      tokensEn: tokenizeEnglish(item.sentenceEn),
    })),

  ...hsk4Data
    .filter((item: any) => item.sentenceTh && item.sentenceZh)
    .map((item: any, idx: number) => {
      const safeEnglish = item.sentenceEn || '';

      return {
        id: `hsk4-${item.id ?? idx + 1}`,
        source: 'hsk4' as const,
        difficulty: 'easy' as const,
        th: item.sentenceTh,
        thRoman: item.sentenceThaiPronunciation || '',
        zh: item.sentenceZh,
        en: safeEnglish,
        tokensTh: tokenizeThai(item.sentenceTh),
        tokensZh: tokenizeChinese(item.sentenceZh),
        tokensEn: safeEnglish ? tokenizeEnglish(safeEnglish) : [],
      };
    }),
];