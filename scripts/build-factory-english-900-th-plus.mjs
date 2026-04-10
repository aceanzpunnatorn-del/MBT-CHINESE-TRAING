import fs from 'fs';
import path from 'path';

const INPUT_PATH = path.resolve('./lib/factory-english-900.ts');
const OUTPUT_PATH = path.resolve('./lib/factory-english-900-th.ts');
const CACHE_PATH = path.resolve('./scripts/.translation-cache-factory-900.json');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readCache() {
  if (!fs.existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
}

function extractFactoryEnglish900(tsSource) {
  const match = tsSource.match(
    /export const factoryEnglish900:[^{=\n]*=\s*(\[[\s\S]*\]);?\s*$/
  );

  if (!match) {
    throw new Error('Cannot find factoryEnglish900 array in lib/factory-english-900.ts');
  }

  return Function(`"use strict"; return (${match[1]});`)();
}

function cleanText(text = '') {
  return String(text).replace(/\s+/g, ' ').trim();
}

async function translateText(text, sourceLang, targetLang, cache) {
  const raw = cleanText(text);
  if (!raw) return '';

  const cacheKey = `${sourceLang}->${targetLang}::${raw}`;
  if (cache[cacheKey]) return cache[cacheKey];

  const url =
    'https://translate.googleapis.com/translate_a/single?' +
    new URLSearchParams({
      client: 'gtx',
      sl: sourceLang,
      tl: targetLang,
      dt: 't',
      q: raw,
    }).toString();

  let lastError = null;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const translated = Array.isArray(data?.[0])
        ? data[0].map((chunk) => chunk?.[0] || '').join('')
        : '';

      if (!translated) throw new Error('Empty translation result');

      const cleaned = cleanText(translated);
      cache[cacheKey] = cleaned;
      writeCache(cache);
      return cleaned;
    } catch (error) {
      lastError = error;
      await sleep(800 * attempt);
    }
  }

  throw new Error(`Translate failed for "${raw}": ${lastError?.message || lastError}`);
}

/**
 * Thai romanization แบบอ่านง่ายเพื่อใช้งานจริง
 * ไม่ใช่มาตรฐานวิชาการเต็มรูปแบบ แต่พอใช้ในระบบ internal ได้
 */
function romanizeThai(text = '') {
  const map = [
    ['ก', 'g'], ['ข', 'kh'], ['ค', 'kh'], ['ฆ', 'kh'],
    ['ง', 'ng'], ['จ', 'j'], ['ฉ', 'ch'], ['ช', 'ch'],
    ['ซ', 's'], ['ฌ', 'ch'], ['ญ', 'y'], ['ฎ', 'd'],
    ['ฏ', 'dt'], ['ฐ', 'th'], ['ฑ', 'th'], ['ฒ', 'th'],
    ['ณ', 'n'], ['ด', 'd'], ['ต', 'dt'], ['ถ', 'th'],
    ['ท', 'th'], ['ธ', 'th'], ['น', 'n'], ['บ', 'b'],
    ['ป', 'bp'], ['ผ', 'ph'], ['ฝ', 'f'], ['พ', 'ph'],
    ['ฟ', 'f'], ['ภ', 'ph'], ['ม', 'm'], ['ย', 'y'],
    ['ร', 'r'], ['ล', 'l'], ['ว', 'w'], ['ศ', 's'],
    ['ษ', 's'], ['ส', 's'], ['ห', 'h'], ['ฬ', 'l'],
    ['อ', 'o'], ['ฮ', 'h'],

    ['ะ', 'a'], ['ั', 'a'], ['า', 'aa'], ['ำ', 'am'],
    ['ิ', 'i'], ['ี', 'ii'], ['ึ', 'ue'], ['ื', 'uue'],
    ['ุ', 'u'], ['ู', 'uu'], ['เ', 'e'], ['แ', 'ae'],
    ['โ', 'o'], ['ใ', 'ai'], ['ไ', 'ai'], ['็', ''],
    ['่', ''], ['้', ''], ['๊', ''], ['๋', ''], ['์', ''],
    ['ๆ', ''], ['ฯ', ''], [' ', ' '],
  ];

  let result = text;
  for (const [th, ro] of map) {
    result = result.split(th).join(ro);
  }

  return result.replace(/\s+/g, ' ').trim();
}

function toTsFile(entries) {
  return `export type FactoryEnglishEntryTH = {
  id: number;
  code: string;
  en: string;
  uk: string;
  us: string;
  pos: string;
  zhMeaning: string;
  thMeaning: string;
  thRoman?: string;
  sentenceEn: string;
  sentenceZh: string;
  sentenceTh: string;
  sentenceThRoman?: string;
};

export const factoryEnglish900th: FactoryEnglishEntryTH[] = ${JSON.stringify(entries, null, 2)};
`;
}

async function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(`Input file not found: ${INPUT_PATH}`);
  }

  const inputSource = fs.readFileSync(INPUT_PATH, 'utf8');
  const sourceEntries = extractFactoryEnglish900(inputSource);
  const cache = readCache();

  console.log(`Found ${sourceEntries.length} source entries`);

  const outputEntries = [];

  for (let i = 0; i < sourceEntries.length; i += 1) {
    const item = sourceEntries[i];

    const thMeaning = await translateText(item.zhMeaning, 'zh-CN', 'th', cache);

    let sentenceTh = '';
    if (item.sentenceZh?.trim()) {
      sentenceTh = await translateText(item.sentenceZh, 'zh-CN', 'th', cache);
    } else if (item.sentenceEn?.trim()) {
      sentenceTh = await translateText(item.sentenceEn, 'en', 'th', cache);
    }

    const thRoman = romanizeThai(thMeaning);
    const sentenceThRoman = romanizeThai(sentenceTh);

    outputEntries.push({
      id: item.id,
      code: item.code,
      en: item.en,
      uk: item.uk,
      us: item.us,
      pos: item.pos,
      zhMeaning: item.zhMeaning,
      thMeaning,
      thRoman,
      sentenceEn: item.sentenceEn,
      sentenceZh: item.sentenceZh,
      sentenceTh,
      sentenceThRoman,
    });

    console.log(`[${i + 1}/${sourceEntries.length}] ${item.en} -> ${thMeaning}`);
    await sleep(120);
  }

  fs.writeFileSync(OUTPUT_PATH, toTsFile(outputEntries), 'utf8');

  console.log(`Done`);
  console.log(`Output: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error('Failed:', error);
  process.exit(1);
});