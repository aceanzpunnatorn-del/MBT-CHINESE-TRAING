import { buildSentenceVariants } from '@/lib/sentence-variants';

type WordPayload = {
  zh: string;
  th: string;
  pinyin?: string;
  category?: string;
};

function delay<T>(value: T) {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(value), 120);
  });
}

export async function explainWord(word: WordPayload) {
  return delay({
    summary: `${word.zh} means "${word.th}" and appears often in ${word.category || 'daily communication'} situations.`,
    usage: `Use ${word.zh}${word.pinyin ? ` (${word.pinyin})` : ''} when you want to express ${word.th.toLowerCase()} clearly and directly.`,
    compare: `This word is usually more natural than a literal translation when speaking in short workplace instructions or everyday conversations.`,
  });
}

export async function generateExamples(word: WordPayload) {
  const source =
    word.category?.toLowerCase().includes('hsk') ? 'hsk4' : 'factory';

  const variants = buildSentenceVariants({
    id: `ai-${word.zh}-${word.th}`,
    zh: word.zh,
    pinyin: word.pinyin,
    th: word.th,
    source,
    category: word.category,
  });

  return delay(
    variants.slice(0, 3).map((variant) => {
      const guide = variant.pinyin ? ` (${variant.pinyin})` : '';
      return `${variant.label}: ${variant.zh}${guide} / ${variant.th}`;
    })
  );
}

export async function generateHint(word: WordPayload) {
  const firstThai = word.th.trim().charAt(0);
  const firstChinese = word.zh.trim().charAt(0);
  const clue = word.pinyin?.split(' ')[0] || '';

  return delay(
    `Think about the ${word.category || 'work'} context, the first clue "${firstThai || firstChinese}", and the sound ${clue || 'of the first syllable'}.`
  );
}
