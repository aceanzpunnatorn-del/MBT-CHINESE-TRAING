import romanizeThai from '@dehoist/romanize-thai';

const THAI_CHAR_PATTERN = /[\u0E00-\u0E7F]/u;
const LATIN_GUIDE_PATTERN = /^[a-z0-9\s/().,'-]+$/i;

function normalizeSpaces(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function isLikelyLatinGuide(text?: string) {
  const normalized = normalizeSpaces(text || '');
  return normalized.length > 0 && LATIN_GUIDE_PATTERN.test(normalized);
}

function segmentThaiText(text: string) {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter === 'undefined') {
    return [text];
  }

  const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
  return Array.from(segmenter.segment(text), (segment) => segment.segment);
}

function romanizeToken(token: string) {
  if (!THAI_CHAR_PATTERN.test(token)) {
    return token;
  }

  return romanizeThai(token);
}

export function toThaiKaraoke(text?: string) {
  const normalized = normalizeSpaces(text || '');

  if (!normalized) {
    return '';
  }

  const parts = segmentThaiText(normalized).map(romanizeToken);

  return normalizeSpaces(
    parts
      .join(' ')
      .replace(/\s+([/(),.])/g, ' $1')
      .replace(/([/(),.])\s+/g, '$1 ')
  );
}

export function getThaiKaraoke(thaiText?: string, fallbackGuide?: string) {
  const normalizedThai = normalizeSpaces(thaiText || '');
  const normalizedFallback = normalizeSpaces(fallbackGuide || '');

  if (normalizedThai && THAI_CHAR_PATTERN.test(normalizedThai)) {
    return toThaiKaraoke(normalizedThai);
  }

  if (isLikelyLatinGuide(normalizedFallback)) {
    return normalizedFallback;
  }

  return '';
}
