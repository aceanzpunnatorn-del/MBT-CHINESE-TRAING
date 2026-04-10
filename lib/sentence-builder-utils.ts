export type SentenceLanguage = 'th' | 'zh' | 'en';

export type SentenceBuilderItem = {
  id: string;
  source: 'hsk4' | 'factory';
  difficulty: 'easy' | 'medium' | 'hard';
  th: string;
  thRoman?: string;
  zh: string;
  en: string;
  tokensTh: string[];
  tokensZh: string[];
  tokensEn: string[];
};

export function shuffleArray<T>(items: T[]): T[] {
  const cloned = [...items];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

export function normalizeSentence(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function tokenizeThai(text: string): string[] {
  return text
    .split(' ')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function tokenizeEnglish(text: string): string[] {
  return text
    .replace(/([,.!?])/g, ' $1 ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function tokenizeChinese(text: string): string[] {
  const cleaned = text.replace(/[，。！？]/g, '').trim();
  if (!cleaned) return [];
  return cleaned.split(/(?<=.)/u).filter(Boolean);
}

export function compareTokenArrays(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}