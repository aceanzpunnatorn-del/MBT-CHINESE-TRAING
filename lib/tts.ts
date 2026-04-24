export type SpeechLang = 'zh-CN' | 'th-TH' | 'en-US';
export type SpeechRatePreset = 'slow' | 'clear' | 'normal';
export type FeedbackTone = 'correct' | 'wrong';

export type SpeakTextOptions = {
  text: string;
  lang: SpeechLang;
  ratePreset?: SpeechRatePreset;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
};

const RATE_MAP: Record<SpeechLang, Record<SpeechRatePreset, number>> = {
  'zh-CN': {
    slow: 0.74,
    clear: 0.88,
    normal: 1,
  },
  'th-TH': {
    slow: 0.76,
    clear: 0.9,
    normal: 1,
  },
  'en-US': {
    slow: 0.82,
    clear: 0.94,
    normal: 1,
  },
};

const VOICE_HINTS: Record<SpeechLang, string[]> = {
  'zh-CN': ['zh', 'chinese', 'mandarin', 'xiaoxiao', 'yunxi', 'huihui'],
  'th-TH': ['th', 'thai', 'achara', 'premwadee', 'niwat'],
  'en-US': ['en', 'english', 'aria', 'jenny', 'davis', 'zira'],
};

let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeAudioContext: AudioContext | null = null;

function getSpeechSynthesis() {
  if (typeof window === 'undefined') return null;
  return window.speechSynthesis ?? null;
}

function normalizeLang(lang?: string) {
  return String(lang || '').toLowerCase();
}

function resolveSpeechRate(lang: SpeechLang, preset: SpeechRatePreset = 'clear') {
  return RATE_MAP[lang][preset] ?? RATE_MAP[lang].clear;
}

function scoreVoice(voice: SpeechSynthesisVoice, lang: SpeechLang) {
  const targetLang = normalizeLang(lang);
  const voiceLang = normalizeLang(voice.lang);
  const baseTarget = targetLang.split('-')[0];
  const name = voice.name.toLowerCase();

  let score = 0;

  if (voiceLang === targetLang) score += 40;
  else if (voiceLang.startsWith(`${targetLang}-`)) score += 34;
  else if (voiceLang.startsWith(baseTarget)) score += 26;

  if (voice.default) score += 8;
  if (voice.localService) score += 10;

  if (VOICE_HINTS[lang].some((hint) => name.includes(hint))) score += 10;
  if (name.includes('natural')) score += 4;
  if (name.includes('neural')) score += 4;
  if (name.includes('google')) score += 2;
  if (name.includes('microsoft')) score += 2;

  return score;
}

function getBestVoice(voices: SpeechSynthesisVoice[], lang: SpeechLang) {
  return [...voices].sort((left, right) => scoreVoice(right, lang) - scoreVoice(left, lang))[0] ?? null;
}

async function loadVoices() {
  const synthesis = getSpeechSynthesis();
  if (!synthesis) return [];

  const existingVoices = synthesis.getVoices();
  if (existingVoices.length > 0) return existingVoices;

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      synthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      window.clearTimeout(timeoutId);
      resolve(synthesis.getVoices());
    };

    const handleVoicesChanged = () => finish();
    const timeoutId = window.setTimeout(finish, 1200);

    synthesis.addEventListener('voiceschanged', handleVoicesChanged);
  });
}

export function isSpeechSynthesisSupported() {
  return Boolean(getSpeechSynthesis());
}

export function stopSpeaking() {
  const synthesis = getSpeechSynthesis();
  activeUtterance = null;
  synthesis?.cancel();
}

export async function speakText({
  text,
  lang,
  ratePreset = 'clear',
  pitch = 1,
  volume = 1,
  onStart,
  onEnd,
  onError,
}: SpeakTextOptions) {
  const cleanText = text.trim();
  if (!cleanText) return;

  const synthesis = getSpeechSynthesis();
  if (!synthesis) {
    const error = new Error('Speech synthesis is not supported in this browser.');
    onError?.(error);
    throw error;
  }

  stopSpeaking();

  const voices = await loadVoices();

  await new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = getBestVoice(voices, lang);

    activeUtterance = utterance;
    utterance.lang = lang;
    utterance.rate = resolveSpeechRate(lang, ratePreset);
    utterance.pitch = pitch;
    utterance.volume = volume;

    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      onStart?.();
    };

    utterance.onend = () => {
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
      onEnd?.();
      resolve();
    };

    utterance.onerror = (event) => {
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }

      const error = new Error(event.error || 'Speech synthesis failed.');
      onError?.(error);
      reject(error);
    };

    synthesis.speak(utterance);
  });
}

function getAudioContextConstructor() {
  if (typeof window === 'undefined') return null;

  const extendedWindow = window as Window & {
    webkitAudioContext?: typeof AudioContext;
  };

  return window.AudioContext || extendedWindow.webkitAudioContext || null;
}

export async function playFeedbackTone(kind: FeedbackTone, volume = 0.05) {
  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) return;

  if (!activeAudioContext) {
    activeAudioContext = new AudioContextConstructor();
  }

  const context = activeAudioContext;

  if (context.state === 'suspended') {
    await context.resume();
  }

  const now = context.currentTime;
  const masterGain = context.createGain();
  masterGain.connect(context.destination);
  masterGain.gain.setValueAtTime(volume, now);

  const notes =
    kind === 'correct'
      ? [
          { frequency: 523.25, start: now, duration: 0.1 },
          { frequency: 659.25, start: now + 0.08, duration: 0.14 },
        ]
      : [
          { frequency: 220, start: now, duration: 0.12 },
          { frequency: 174.61, start: now + 0.07, duration: 0.18 },
        ];

  notes.forEach((note) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = kind === 'correct' ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(note.frequency, note.start);

    gainNode.gain.setValueAtTime(0.0001, note.start);
    gainNode.gain.exponentialRampToValueAtTime(0.9, note.start + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, note.start + note.duration);

    oscillator.connect(gainNode);
    gainNode.connect(masterGain);

    oscillator.start(note.start);
    oscillator.stop(note.start + note.duration);
  });
}
