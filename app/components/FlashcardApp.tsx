'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
 BadgeCheck,
 BookOpen,
 Building2,
 Flame,
 Image as ImageIcon,
 RotateCcw,
 Search,
 Shuffle,
 Sparkles,
 Trophy,
 Users,
 Volume2,
} from 'lucide-react';
import { hsk4Data } from '@/lib/hsk4-data';
import { factoryEnglish900th } from '@/lib/factory-english-900-th';
import { saveScore } from '@/lib/saveScore';
import { getLeaderboard } from '@/lib/leaderboard';

function cn(...parts: Array<string | false | undefined>) {
 return parts.filter(Boolean).join(' ');
}

function CardShell({
 className = '',
 children,
 style,
}: {
 className?: string;
 children: React.ReactNode;
 style?: React.CSSProperties;
}) {
 return (
 <div
 className={cn(
 'rounded-[24px] border border-[#D9E7F0] bg-white shadow-[0_10px_30px_rgba(46,167,224,0.08)]',
 className
 )}
 style={style}
 >
 {children}
 </div>
 );
}

function renderPinyinWithToneColor(text?: string) {
 if (!text) return null;

 const tone1 = /[āēīōūǖ]/;
 const tone2 = /[áéíóúǘ]/;
 const tone3 = /[ǎěǐǒǔǚ]/;
 const tone4 = /[àèìòùǜ]/;

 return text.split(' ').map((syllable, index) => {
 let className = 'text-white';

 if (tone1.test(syllable)) className = 'text-sky-300';
 else if (tone2.test(syllable)) className = 'text-emerald-300';
 else if (tone3.test(syllable)) className = 'text-yellow-300';
 else if (tone4.test(syllable)) className = 'text-rose-300';

 return (
 <span
 key={`${syllable}-${index}`}
 className={`mr-2 font-semibold drop-shadow-sm ${className}`}
 >
 {syllable}
 </span>
 );
 });
}

function renderPinyinWithToneColorLight(text?: string) {
 if (!text) return null;

 const tone1 = /[āēīōūǖ]/;
 const tone2 = /[áéíóúǘ]/;
 const tone3 = /[ǎěǐǒǔǚ]/;
 const tone4 = /[àèìòùǜ]/;

 return text.split(' ').map((syllable, index) => {
 let className = 'text-slate-700';

 if (tone1.test(syllable)) className = 'text-sky-600';
 else if (tone2.test(syllable)) className = 'text-emerald-600';
 else if (tone3.test(syllable)) className = 'text-amber-600';
 else if (tone4.test(syllable)) className = 'text-rose-600';

 return (
 <span key={`${syllable}-${index}`} className={`mr-2 font-medium ${className}`}>
 {syllable}
 </span>
 );
 });
}

function getThaiRomanText(text?: string, emptyText = '-') {
 return text?.trim() || emptyText;
}

function getProgressStorageKey(params: {
 learningMode: LearningMode;
 vocabularySource: VocabularySource;
 mode: AppMode;
}) {
 return `midea-progress:${params.learningMode}:${params.vocabularySource}:${params.mode}`;
}

function getSeenStorageKey(params: {
 learningMode: LearningMode;
 vocabularySource: VocabularySource;
}) {
 return `midea-seen:${params.learningMode}:${params.vocabularySource}`;
}

function getStudyBucketStorageKey(params: {
 learningMode: LearningMode;
 vocabularySource: VocabularySource;
 bucket: 'known' | 'review' | 'hard';
}) {
 return `midea-bucket:${params.learningMode}:${params.vocabularySource}:${params.bucket}`;
}

function shuffleArray<T>(items: T[]) {
 const cloned = [...items];
 for (let i = cloned.length - 1; i > 0; i -= 1) {
 const j = Math.floor(Math.random() * (i + 1));
 [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
 }
 return cloned;
}

function unlockAudio() {
 const audio = new Audio();
 audio.play().catch(() => {});
}

type AppMode = 'flashcards' | 'quiz';
type LearningMode = 'thai-learns-chinese' | 'chinese-learns-thai';
type RankingPeriod = 'daily' | 'weekly' | 'monthly';
type VocabularySource = 'all' | 'hsk4' | 'factory';
type StudyBucket = 'all' | 'known' | 'review' | 'hard';

type TtsAudioState = {
 key: string | null;
 loading: boolean;
};

type LeaderboardEntry = {
 id?: string | number;
 name: string;
 employee_code?: string | null;
 department?: string | null;
 score: number;
 mode?: LearningMode | string;
 score_date?: string;
 created_at?: string;
};

type DisplayCard = {
 id: string;
 zh: string;
 pinyin?: string;
 th: string;
 thToZh?: string;
 category?: string;
 sentenceZh?: string;
 sentencePinyin?: string;
 sentenceTh?: string;
 sentenceEn?: string;
 thaiPronunciation?: string;
 sentenceThaiPronunciation?: string;
 image?: string;
 source: 'hsk4' | 'factory';
};

const DEPARTMENTS = [
 'HR',
 'Production',
 'Warehouse',
 'Engineering',
 'Quality',
 'IE',
 'Supply Chain',
 'Finance',
 'IT',
 'Admin',
 'Other',
];

export default function FlashcardApp() {
 const [query, setQuery] = useState('');
 const [index, setIndex] = useState(0);
 const [flipped, setFlipped] = useState(false);
 const [mode, setMode] = useState<AppMode>('flashcards');
 const [learningMode, setLearningMode] =
 useState<LearningMode>('thai-learns-chinese');

 const [showSentence, setShowSentence] = useState(true);
 const [showImage, setShowImage] = useState(true);
 const [showPinyin, setShowPinyin] = useState(true);
 const [showThaiReading, setShowThaiReading] = useState(false);
 const [showPinyinGuide, setShowPinyinGuide] = useState(false);

 const [deckSeed, setDeckSeed] = useState(0);
 const [quizAnswer, setQuizAnswer] = useState('');
 const [quizSubmitted, setQuizSubmitted] = useState(false);
 const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });

 const [ttsState, setTtsState] = useState<TtsAudioState>({
 key: null,
 loading: false,
 });

 const [playerName, setPlayerName] = useState('');
 const [employeeCode, setEmployeeCode] = useState('');
 const [department, setDepartment] = useState('HR');
 const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
 const [saveMessage, setSaveMessage] = useState('');
 const [loadingBoard, setLoadingBoard] = useState(false);
 const [rankingPeriod, setRankingPeriod] = useState<RankingPeriod>('daily');
 const [playerCount, setPlayerCount] = useState(0);
 const [vocabularySource, setVocabularySource] =
 useState<VocabularySource>('all');
 const [seenCardIds, setSeenCardIds] = useState<string[]>([]);

 const [studyBucketFilter, setStudyBucketFilter] =
 useState<StudyBucket>('all');
 const [knownCardIds, setKnownCardIds] = useState<string[]>([]);
 const [reviewCardIds, setReviewCardIds] = useState<string[]>([]);
 const [hardCardIds, setHardCardIds] = useState<string[]>([]);

 const [streak, setStreak] = useState(0);
 const [bestStreak, setBestStreak] = useState(0);
 const [todayDone, setTodayDone] = useState(false);
 const [combo, setCombo] = useState(0);
 const [answerResult, setAnswerResult] = useState<'correct' | 'wrong' | null>(null);
 const [showStreakBurst, setShowStreakBurst] = useState(false);

 useEffect(() => {
 const savedLearningMode = localStorage.getItem('midea-learning-mode');
 const savedAppMode = localStorage.getItem('midea-app-mode');

 if (
 savedLearningMode === 'thai' ||
 savedLearningMode === 'thai-learns-chinese'
 ) {
 setLearningMode('thai-learns-chinese');
 } else if (
 savedLearningMode === 'chinese' ||
 savedLearningMode === 'chinese-learns-thai'
 ) {
 setLearningMode('chinese-learns-thai');
 }

 if (savedAppMode === 'flashcards' || savedAppMode === 'quiz') {
 setMode(savedAppMode);
 }
 }, []);

 useEffect(() => {
 localStorage.setItem(
 'midea-learning-mode',
 learningMode === 'thai-learns-chinese' ? 'thai' : 'chinese'
 );
 }, [learningMode]);

 useEffect(() => {
 localStorage.setItem('midea-app-mode', mode);
 }, [mode]);

 useEffect(() => {
 const savedName = localStorage.getItem('midea-player-name') || '';
 const savedCode = localStorage.getItem('midea-employee-code') || '';
 const savedDept = localStorage.getItem('midea-department') || 'HR';

 if (savedName) setPlayerName(savedName);
 if (savedCode) setEmployeeCode(savedCode);
 if (savedDept) setDepartment(savedDept);

 return () => {
 window.speechSynthesis?.cancel();
 };
 }, []);

 useEffect(() => {
 const today = new Date().toISOString().slice(0, 10);
 const savedStreak = Number(localStorage.getItem('midea-streak') || '0');
 const savedBestStreak = Number(localStorage.getItem('midea-best-streak') || '0');
 const savedLastStudyDate = localStorage.getItem('midea-last-study-date') || '';
 const savedTodayDone = localStorage.getItem('midea-today-done') === 'true';
 const savedCombo = Number(localStorage.getItem('midea-combo') || '0');

 setStreak(savedStreak);
 setBestStreak(savedBestStreak);
 setCombo(savedCombo);

 if (savedLastStudyDate === today && savedTodayDone) {
 setTodayDone(true);
 } else {
 setTodayDone(false);
 localStorage.setItem('midea-today-done', 'false');
 }
 }, []);

 useEffect(() => {
 localStorage.setItem('midea-streak', String(streak));
 }, [streak]);

 useEffect(() => {
 localStorage.setItem('midea-best-streak', String(bestStreak));
 }, [bestStreak]);

 useEffect(() => {
 localStorage.setItem('midea-combo', String(combo));
 }, [combo]);

 useEffect(() => {
 void loadLeaderboard();
 }, [learningMode, rankingPeriod]);

 async function loadLeaderboard() {
 try {
 setLoadingBoard(true);
 const data = await getLeaderboard(learningMode, rankingPeriod);
 setLeaderboard(data as LeaderboardEntry[]);
 setPlayerCount(data.length);
 } catch (error) {
 console.error('Leaderboard load failed:', error);
 setLeaderboard([]);
 setPlayerCount(0);
 } finally {
 setLoadingBoard(false);
 }
 }

 const mergedCards = useMemo<DisplayCard[]>(() => {
 const hskCards: DisplayCard[] = hsk4Data.map((item: any, idx: number) => ({
 id: `hsk4-${item.id ?? idx + 1}`,
 zh: item.zh,
 pinyin: item.pinyin,
 th: item.th,
 thToZh: item.thToZh,
 category: item.category || 'HSK4',
 sentenceZh: item.sentenceZh,
 sentencePinyin: item.sentencePinyin,
 sentenceTh: item.sentenceTh,
 sentenceEn: item.sentenceEn || '',
 thaiPronunciation: item.thaiPronunciation,
 sentenceThaiPronunciation: item.sentenceThaiPronunciation,
 image: item.image || ' ',
 source: 'hsk4',
 }));

 const factoryCards: DisplayCard[] = factoryEnglish900th.map((item) => ({
 id: `factory-${item.id}`,
 zh: item.zhMeaning,
 pinyin: item.en,
 th: item.thMeaning,
 thToZh: item.zhMeaning,
 category: item.pos || 'Factory English',
 sentenceZh: item.sentenceZh,
 sentencePinyin: item.uk,
 sentenceTh: item.sentenceTh,
 sentenceEn: item.sentenceEn,
 thaiPronunciation: item.us,
 sentenceThaiPronunciation: item.code,
 image: ' ',
 source: 'factory',
 }));

 if (vocabularySource === 'hsk4') return hskCards;
 if (vocabularySource === 'factory') return factoryCards;
 return [...hskCards, ...factoryCards];
 }, [vocabularySource]);

 const filteredCards = useMemo(() => {
 const q = query.trim().toLowerCase();
 let result = [...mergedCards];

 if (q) {
 result = result.filter((card) =>
 [
 card.zh,
 card.pinyin,
 card.th,
 card.thToZh,
 card.category,
 card.sentenceZh,
 card.sentencePinyin,
 card.sentenceTh,
 card.sentenceEn,
 card.thaiPronunciation,
 card.sentenceThaiPronunciation,
 card.source,
 ]
 .filter(Boolean)
 .some((value) => String(value).toLowerCase().includes(q))
 );
 }

 if (studyBucketFilter === 'known') {
 result = result.filter((card) => knownCardIds.includes(card.id));
 }

 if (studyBucketFilter === 'review') {
 result = result.filter((card) => reviewCardIds.includes(card.id));
 }

 if (studyBucketFilter === 'hard') {
 result = result.filter((card) => hardCardIds.includes(card.id));
 }

 if (deckSeed > 0) result = shuffleArray(result);

 return result;
 }, [
 query,
 deckSeed,
 mergedCards,
 studyBucketFilter,
 knownCardIds,
 reviewCardIds,
 hardCardIds,
 ]);

 const currentCard = filteredCards[index] ?? null;

 useEffect(() => {
 const progressKey = getProgressStorageKey({
 learningMode,
 vocabularySource,
 mode,
 });

 const seenKey = getSeenStorageKey({
 learningMode,
 vocabularySource,
 });

 const savedProgressRaw = localStorage.getItem(progressKey);
 const savedSeenRaw = localStorage.getItem(seenKey);

 if (savedSeenRaw) {
 try {
 const parsedSeen = JSON.parse(savedSeenRaw);
 if (Array.isArray(parsedSeen)) {
 setSeenCardIds(parsedSeen);
 } else {
 setSeenCardIds([]);
 }
 } catch {
 setSeenCardIds([]);
 }
 } else {
 setSeenCardIds([]);
 }

 if (!savedProgressRaw) {
 setIndex(0);
 return;
 }

 try {
 const parsed = JSON.parse(savedProgressRaw);
 const savedIndex = Number(parsed?.index ?? 0);

 if (!Number.isNaN(savedIndex) && filteredCards.length > 0) {
 setIndex(Math.min(savedIndex, filteredCards.length - 1));
 } else {
 setIndex(0);
 }
 } catch {
 setIndex(0);
 }
 }, [learningMode, vocabularySource, mode, filteredCards.length]);

 useEffect(() => {
 const loadBucket = (bucket: 'known' | 'review' | 'hard') => {
 const key = getStudyBucketStorageKey({
 learningMode,
 vocabularySource,
 bucket,
 });

 const raw = localStorage.getItem(key);
 if (!raw) return [];

 try {
 const parsed = JSON.parse(raw);
 return Array.isArray(parsed) ? parsed : [];
 } catch {
 return [];
 }
 };

 setKnownCardIds(loadBucket('known'));
 setReviewCardIds(loadBucket('review'));
 setHardCardIds(loadBucket('hard'));
 }, [learningMode, vocabularySource]);

 useEffect(() => {
 if (!filteredCards.length) return;

 const progressKey = getProgressStorageKey({
 learningMode,
 vocabularySource,
 mode,
 });

 localStorage.setItem(
 progressKey,
 JSON.stringify({
 index,
 cardId: filteredCards[index]?.id ?? null,
 updatedAt: new Date().toISOString(),
 })
 );
 }, [index, learningMode, vocabularySource, mode, filteredCards]);

 useEffect(() => {
 if (!currentCard) return;

 const seenKey = getSeenStorageKey({
 learningMode,
 vocabularySource,
 });

 setSeenCardIds((prev) => {
 if (prev.includes(currentCard.id)) return prev;

 const next = [...prev, currentCard.id];
 localStorage.setItem(seenKey, JSON.stringify(next));
 return next;
 });
 }, [currentCard, learningMode, vocabularySource]);

 const progress = filteredCards.length
 ? Math.round((seenCardIds.length / filteredCards.length) * 100)
 : 0;

 const quizChoices = useMemo(() => {
 if (!currentCard) return [];

 if (learningMode === 'thai-learns-chinese') {
 const pool = shuffleArray(
 filteredCards
 .filter((card) => card.th !== currentCard.th)
 .map((card) => card.th)
 ).slice(0, 3);

 return shuffleArray([currentCard.th, ...pool]);
 }

 const pool = shuffleArray(
 filteredCards
 .filter((card) => card.zh !== currentCard.zh)
 .map((card) => card.zh)
 ).slice(0, 3);

 return shuffleArray([currentCard.zh, ...pool]);
 }, [currentCard, learningMode, filteredCards]);

 function saveBucketIds(
 bucket: 'known' | 'review' | 'hard',
 ids: string[]
 ) {
 const key = getStudyBucketStorageKey({
 learningMode,
 vocabularySource,
 bucket,
 });
 localStorage.setItem(key, JSON.stringify(ids));
 }

 function markCard(bucket: 'known' | 'review' | 'hard') {
 if (!currentCard) return;

 const cardId = currentCard.id;

 const removeFrom = (ids: string[]) => ids.filter((id) => id !== cardId);

 const nextKnown =
 bucket === 'known'
 ? Array.from(new Set([...knownCardIds, cardId]))
 : removeFrom(knownCardIds);

 const nextReview =
 bucket === 'review'
 ? Array.from(new Set([...reviewCardIds, cardId]))
 : removeFrom(reviewCardIds);

 const nextHard =
 bucket === 'hard'
 ? Array.from(new Set([...hardCardIds, cardId]))
 : removeFrom(hardCardIds);

 setKnownCardIds(nextKnown);
 setReviewCardIds(nextReview);
 setHardCardIds(nextHard);

 saveBucketIds('known', nextKnown);
 saveBucketIds('review', nextReview);
 saveBucketIds('hard', nextHard);
 }

 function resetCardView() {
 setFlipped(false);
 setQuizAnswer('');
 setQuizSubmitted(false);
 setAnswerResult(null);
 }

 function nextCard() {
 if (!filteredCards.length) return;
 setIndex((prev) => (prev + 1) % filteredCards.length);
 resetCardView();
 }

 function prevCard() {
 if (!filteredCards.length) return;
 setIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
 resetCardView();
 }

 function claimTodayStudy() {
 const today = new Date().toISOString().slice(0, 10);
 const lastStudyDate = localStorage.getItem('midea-last-study-date') || '';

 if (lastStudyDate === today) {
 setTodayDone(true);
 localStorage.setItem('midea-today-done', 'true');
 return;
 }

 let nextStreak = 1;

 if (lastStudyDate) {
 const prev = new Date(lastStudyDate);
 const curr = new Date(today);
 const diffDays = Math.floor(
 (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
 );

 if (diffDays === 1) nextStreak = streak + 1;
 else if (diffDays === 0) nextStreak = streak;
 else nextStreak = 1;
 }

 setStreak(nextStreak);
 setBestStreak((prev) => Math.max(prev, nextStreak));
 setTodayDone(true);
 setShowStreakBurst(true);

 localStorage.setItem('midea-last-study-date', today);
 localStorage.setItem('midea-today-done', 'true');

 setTimeout(() => setShowStreakBurst(false), 1800);
 }

 function resetAll() {
 setQuery('');
 setIndex(0);
 setDeckSeed(0);
 setMode('flashcards');
 setLearningMode('thai-learns-chinese');
 setShowSentence(true);
 setShowImage(true);
 setShowPinyin(true);
 setShowThaiReading(false);
 setShowPinyinGuide(false);
 setQuizScore({ correct: 0, total: 0 });
 setRankingPeriod('daily');
 setVocabularySource('all');
 setStudyBucketFilter('all');
 setCombo(0);
 setSeenCardIds([]);
 setKnownCardIds([]);
 setReviewCardIds([]);
 setHardCardIds([]);
 resetCardView();

 localStorage.setItem('midea-app-mode', 'flashcards');
 localStorage.setItem('midea-learning-mode', 'thai');

 localStorage.removeItem(
 getProgressStorageKey({
 learningMode,
 vocabularySource,
 mode,
 })
 );

 localStorage.removeItem(
 getSeenStorageKey({
 learningMode,
 vocabularySource,
 })
 );

 localStorage.removeItem(
 getStudyBucketStorageKey({
 learningMode,
 vocabularySource,
 bucket: 'known',
 })
 );

 localStorage.removeItem(
 getStudyBucketStorageKey({
 learningMode,
 vocabularySource,
 bucket: 'review',
 })
 );

 localStorage.removeItem(
 getStudyBucketStorageKey({
 learningMode,
 vocabularySource,
 bucket: 'hard',
 })
 );
 }

 function shuffleCards() {
 setDeckSeed((prev) => prev + 1);
 setIndex(0);
 resetCardView();
 }

 function submitQuiz(answer: string) {
 if (!currentCard || quizSubmitted) return;

 const correctAnswer =
 learningMode === 'thai-learns-chinese' ? currentCard.th : currentCard.zh;

 const isCorrect = answer === correctAnswer;

 setQuizAnswer(answer);
 setQuizSubmitted(true);
 setAnswerResult(isCorrect ? 'correct' : 'wrong');

 setQuizScore((prev) => ({
 correct: prev.correct + (isCorrect ? 1 : 0),
 total: prev.total + 1,
 }));

 if (isCorrect) {
 setCombo((prev) => prev + 1);
 claimTodayStudy();
 } else {
 setCombo(0);
 }

 setTimeout(() => setAnswerResult(null), 1200);
 }

 async function speakBrowser(text?: string, lang = 'zh-CN') {
 if (!text || typeof window === 'undefined') return;

 window.speechSynthesis.cancel();
 const utterance = new SpeechSynthesisUtterance(text);
 utterance.lang = lang;
 utterance.rate = lang === 'th-TH' ? 0.95 : 0.92;
 utterance.pitch = 1;
 window.speechSynthesis.speak(utterance);
 }

 async function playTts(
 text?: string,
 cacheKey?: string,
 fallbackLang = 'zh-CN'
 ) {
 if (!text) return;

 const safeKey = cacheKey ?? text;

 try {
 setTtsState({ key: safeKey, loading: true });

 const response = await fetch('/api/tts', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ text }),
 });

 if (!response.ok) throw new Error('TTS request failed');

 const blob = await response.blob();
 const url = URL.createObjectURL(blob);

 const audio = new Audio(url);
 audio.preload = 'auto';

 await audio.play();

 audio.onended = () => {
 URL.revokeObjectURL(url);
 setTtsState({ key: null, loading: false });
 };
 } catch {
 setTtsState({ key: null, loading: false });
 await speakBrowser(text, fallbackLang);
 }
 }

 async function saveTodayScore() {
 const trimmedName = playerName.trim();
 const trimmedCode = employeeCode.trim();

 if (!trimmedName) {
 setSaveMessage('Please enter learner name');
 setTimeout(() => setSaveMessage(''), 2000);
 return;
 }

 try {
 localStorage.setItem('midea-player-name', trimmedName);
 localStorage.setItem('midea-employee-code', trimmedCode);
 localStorage.setItem('midea-department', department);

 await saveScore({
 name: trimmedName,
 employeeCode: trimmedCode,
 department,
 score: quizScore.correct,
 mode: learningMode,
 });

 await loadLeaderboard();

 setSaveMessage('Score saved successfully');
 setTimeout(() => setSaveMessage(''), 2000);
 } catch (error) {
 console.error('Save score failed:', error);
 setSaveMessage('Save failed');
 setTimeout(() => setSaveMessage(''), 2000);
 }
 }

 if (!currentCard) {
 return (
 <div className="w-full bg-[#F4FAFD] p-3 sm:p-4 md:p-8">
 <CardShell className="mx-auto max-w-3xl p-8 sm:p-10 text-center">
 <h1 className="text-2xl font-bold text-[#163047]">No vocabulary found</h1>
 <p className="mt-3 text-slate-500">Please try another search keyword.</p>
 </CardShell>
 </div>
 );
 }

 const correctAnswer =
 learningMode === 'thai-learns-chinese' ? currentCard.th : currentCard.zh;

 return (
 <div className="w-full bg-[#F4FAFD] p-2 sm:p-4 md:p-8">
 <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
 <CardShell className="overflow-hidden border-[#CFE5F2] bg-white">
 <div className="flex flex-col gap-4 bg-gradient-to-r from-[#2EA7E0] to-[#1D8FC7] p-4 text-white sm:p-5 md:p-8">
 <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
 <div className="space-y-3">
 <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-2 text-xs sm:px-4 sm:text-sm">
 <Building2 className="h-4 w-4" />
 Midea Internal Learning System
 </div>

 <h1 className="text-2xl font-bold leading-tight sm:text-3xl md:text-5xl">
 Midea Thai-China Language Platform
 </h1>

 <p className="text-sm text-white/90 sm:text-base md:text-lg">
 Daily learning, pronunciation practice, quiz, ranking, and streak for internal staff
 </p>

 <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:flex-wrap">
 <button
 onClick={() => {
 setLearningMode('thai-learns-chinese');
 localStorage.setItem('midea-learning-mode', 'thai');
 resetCardView();
 }}
 className={cn(
 'h-11 rounded-2xl border px-4 text-sm sm:text-base',
 learningMode === 'thai-learns-chinese'
 ? 'border-white bg-white text-[#1D8FC7]'
 : 'border-white/40 bg-white/10 text-white'
 )}
 >
 Thai Staff Learning Chinese
 </button>

 <button
 onClick={() => {
 setLearningMode('chinese-learns-thai');
 localStorage.setItem('midea-learning-mode', 'chinese');
 resetCardView();
 }}
 className={cn(
 'h-11 rounded-2xl border px-4 text-sm sm:text-base',
 learningMode === 'chinese-learns-thai'
 ? 'border-white bg-white text-[#1D8FC7]'
 : 'border-white/40 bg-white/10 text-white'
 )}
 >
 Chinese Staff Learning Thai
 </button>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
 {[
 [
 'Vocabulary Set',
 vocabularySource === 'all'
 ? 'All'
 : vocabularySource === 'hsk4'
 ? 'HSK4'
 : 'Factory',
 ],
 ['Total Vocabulary', filteredCards.length],
 ['Current Card', `${index + 1}/${filteredCards.length}`],
 ['Learned', `${seenCardIds.length}/${filteredCards.length}`],
 ].map(([label, value]) => (
 <div
 key={label}
 className="rounded-2xl border border-white/25 bg-white/15 p-3 sm:p-4 backdrop-blur"
 >
 <p className="text-[11px] text-white/80 sm:text-sm">{label}</p>
 <p className="text-xl font-bold text-white sm:text-2xl">{value}</p>
 </div>
 ))}
 </div>
 </div>
 </div>
 </CardShell>

 {showStreakBurst && (
 <motion.div
 initial={{ opacity: 0, y: -10, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0 }}
 className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-amber-700"
 >
 <div className="flex items-center justify-center gap-2 font-semibold">
 <Sparkles className="h-4 w-4" />
 Streak updated! Keep going 
 </div>
 </motion.div>
 )}

 <div className="grid gap-4 sm:gap-5 lg:grid-cols-[320px_1fr] xl:grid-cols-[340px_1fr]">
 <CardShell className="border-[#D9E7F0] bg-white order-2 lg:order-1">
 <div className="space-y-4 p-4 sm:p-5">
 <div className="flex gap-2">
 <button
 className={cn(
 'h-11 flex-1 rounded-full border text-sm font-medium',
 mode === 'flashcards'
 ? 'border-[#2EA7E0] bg-[#2EA7E0] text-white'
 : 'border-[#D9E7F0] bg-white text-[#163047]'
 )}
 onClick={() => {
 setMode('flashcards');
 localStorage.setItem('midea-app-mode', 'flashcards');
 resetCardView();
 }}
 >
 Flashcards
 </button>

 <button
 className={cn(
 'h-11 flex-1 rounded-full border text-sm font-medium',
 mode === 'quiz'
 ? 'border-[#2EA7E0] bg-[#2EA7E0] text-white'
 : 'border-[#D9E7F0] bg-white text-[#163047]'
 )}
 onClick={() => {
 setMode('quiz');
 localStorage.setItem('midea-app-mode', 'quiz');
 resetCardView();
 }}
 >
 Quiz
 </button>
 </div>

 <div className="rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4">
 <p className="mb-3 text-sm font-semibold text-[#163047]">Vocabulary Set</p>
 <div className="grid grid-cols-3 gap-2">
 {(['all', 'hsk4', 'factory'] as VocabularySource[]).map((item) => (
 <button
 key={item}
 onClick={() => {
 setVocabularySource(item);
 setIndex(0);
 resetCardView();
 }}
 className={cn(
 'rounded-xl border px-3 py-2 text-sm font-medium',
 vocabularySource === item
 ? 'border-[#2EA7E0] bg-[#2EA7E0] text-white'
 : 'border-[#D9E7F0] bg-white text-[#163047]'
 )}
 >
 {item === 'all' ? 'All' : item === 'hsk4' ? 'HSK4' : 'Factory'}
 </button>
 ))}
 </div>
 </div>

 <div className="rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4">
 <p className="mb-3 text-sm font-semibold text-[#163047]">Study Filter</p>
 <div className="grid grid-cols-2 gap-2">
 {(['all', 'known', 'review', 'hard'] as StudyBucket[]).map((item) => (
 <button
 key={item}
 onClick={() => {
 setStudyBucketFilter(item);
 setIndex(0);
 resetCardView();
 }}
 className={cn(
 'rounded-xl border px-3 py-2 text-sm font-medium capitalize',
 studyBucketFilter === item
 ? 'border-[#2EA7E0] bg-[#2EA7E0] text-white'
 : 'border-[#D9E7F0] bg-white text-[#163047]'
 )}
 >
 {item}
 </button>
 ))}
 </div>
 </div>

 <div className="flex flex-col gap-2 sm:flex-row">
 <button
 onClick={() => {
 const progressKey = getProgressStorageKey({
 learningMode,
 vocabularySource,
 mode,
 });
 const raw = localStorage.getItem(progressKey);
 if (!raw) return;

 try {
 const parsed = JSON.parse(raw);
 const savedIndex = Number(parsed?.index ?? 0);
 if (!Number.isNaN(savedIndex)) {
 setIndex(Math.min(savedIndex, filteredCards.length - 1));
 resetCardView();
 }
 } catch {}
 }}
 className="w-full flex-1 rounded-2xl border border-[#D9E7F0] bg-white px-4 py-3 text-sm text-[#163047]"
 >
 Continue
 </button>

 <button
 onClick={() => {
 setIndex(0);
 setSeenCardIds([]);
 setKnownCardIds([]);
 setReviewCardIds([]);
 setHardCardIds([]);
 localStorage.removeItem(
 getProgressStorageKey({
 learningMode,
 vocabularySource,
 mode,
 })
 );
 localStorage.removeItem(
 getSeenStorageKey({
 learningMode,
 vocabularySource,
 })
 );
 localStorage.removeItem(
 getStudyBucketStorageKey({
 learningMode,
 vocabularySource,
 bucket: 'known',
 })
 );
 localStorage.removeItem(
 getStudyBucketStorageKey({
 learningMode,
 vocabularySource,
 bucket: 'review',
 })
 );
 localStorage.removeItem(
 getStudyBucketStorageKey({
 learningMode,
 vocabularySource,
 bucket: 'hard',
 })
 );
 resetCardView();
 }}
 className="w-full flex-1 rounded-2xl border border-[#D9E7F0] bg-white px-4 py-3 text-sm text-[#163047]"
 >
 Restart Deck
 </button>
 </div>

 <div className="grid grid-cols-3 gap-2 sm:gap-3">
 <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center">
 <div className="text-xs text-emerald-700">Known</div>
 <div className="text-base font-bold text-emerald-800 sm:text-lg">{knownCardIds.length}</div>
 </div>
 <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center">
 <div className="text-xs text-amber-700">Review</div>
 <div className="text-base font-bold text-amber-800 sm:text-lg">{reviewCardIds.length}</div>
 </div>
 <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-center">
 <div className="text-xs text-rose-700">Hard</div>
 <div className="text-base font-bold text-rose-800 sm:text-lg">{hardCardIds.length}</div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
 <div className="flex items-center gap-2 text-orange-700">
 <Flame className="h-4 w-4" />
 <span className="text-sm font-medium">Daily Streak</span>
 </div>
 <div className="mt-2 text-2xl font-bold text-orange-800">{streak}</div>
 <div className="mt-1 text-xs text-orange-700">
 {todayDone ? 'Today completed' : 'Study today to keep it'}
 </div>
 </div>

 <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
 <div className="flex items-center gap-2 text-amber-700">
 <Sparkles className="h-4 w-4" />
 <span className="text-sm font-medium">Best / Combo</span>
 </div>
 <div className="mt-2 text-2xl font-bold text-amber-800">
 {bestStreak} / {combo}
 </div>
 <div className="mt-1 text-xs text-amber-700">Best streak / live combo</div>
 </div>
 </div>

 <div className="grid gap-2">
 <button
 className={cn(
 'h-11 w-full rounded-2xl border text-sm font-medium',
 showSentence
 ? 'border-[#2EA7E0] bg-[#2EA7E0] text-white'
 : 'border-[#D9E7F0] bg-white text-[#163047]'
 )}
 onClick={() => setShowSentence((v) => !v)}
 >
 {showSentence ? 'Sentence Mode: ON' : 'Sentence Mode: OFF'}
 </button>

 <button
 className={cn(
 'h-11 w-full rounded-2xl border text-sm font-medium',
 showImage
 ? 'border-[#2EA7E0] bg-[#2EA7E0] text-white'
 : 'border-[#D9E7F0] bg-white text-[#163047]'
 )}
 onClick={() => setShowImage((v) => !v)}
 >
 {showImage ? 'Image Mode: ON' : 'Image Mode: OFF'}
 </button>
 </div>

 <div className="space-y-2 rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4">
 <p className="text-sm font-semibold text-[#163047]">Pronunciation Tools</p>
 <button
 onClick={() => setShowPinyin((v) => !v)}
 className="w-full rounded-2xl border border-[#D9E7F0] bg-white px-4 py-3 text-sm text-[#163047]"
 >
 {showPinyin ? 'Hide Pinyin' : 'Show Pinyin'}
 </button>
 <button
 onClick={() => setShowThaiReading((v) => !v)}
 className="w-full rounded-2xl border border-[#D9E7F0] bg-white px-4 py-3 text-sm text-[#163047]"
 >
 {showThaiReading ? 'Hide Thai Reading' : 'Show Thai Reading'}
 </button>
 <button
 onClick={() => setShowPinyinGuide((v) => !v)}
 className="w-full rounded-2xl border border-[#D9E7F0] bg-white px-4 py-3 text-sm text-[#163047]"
 >
 {showPinyinGuide ? 'Hide Tone Guide' : 'Show Tone Guide'}
 </button>
 </div>

 {showPinyinGuide && (
 <div className="rounded-2xl border border-[#D9E7F0] bg-white p-4">
 <p className="mb-3 text-sm font-semibold text-[#163047]">Pinyin Tone Guide</p>
 <div className="grid gap-2 text-sm text-slate-700">
 <div className="rounded-xl bg-[#F8FCFE] p-3"><span className="font-semibold">Tone 1:</span> ā ē ī ō ū ǖ</div>
 <div className="rounded-xl bg-[#F8FCFE] p-3"><span className="font-semibold">Tone 2:</span> á é í ó ú ǘ</div>
 <div className="rounded-xl bg-[#F8FCFE] p-3"><span className="font-semibold">Tone 3:</span> ǎ ě ǐ ǒ ǔ ǚ</div>
 <div className="rounded-xl bg-[#F8FCFE] p-3"><span className="font-semibold">Tone 4:</span> à è ì ò ù ǜ</div>
 </div>
 </div>
 )}

 <div>
 <p className="mb-2 text-sm font-medium text-[#163047]">Search Vocabulary</p>
 <div className="relative">
 <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7C8F]" />
 <input
 value={query}
 onChange={(e) => {
 setQuery(e.target.value);
 setIndex(0);
 resetCardView();
 }}
 placeholder="Search Chinese / Thai / Pinyin"
 className="h-11 w-full rounded-2xl border border-[#D9E7F0] pl-9 pr-3 text-base outline-none"
 />
 </div>
 </div>

 <div className="flex flex-col gap-2 sm:flex-row">
 <button
 className="flex h-11 flex-1 items-center justify-center rounded-2xl border border-[#D9E7F0] bg-white text-[#163047]"
 onClick={shuffleCards}
 >
 <Shuffle className="mr-2 h-4 w-4" />
 Shuffle
 </button>

 <button
 className="flex h-11 flex-1 items-center justify-center rounded-2xl border border-[#D9E7F0] bg-white text-[#163047]"
 onClick={resetAll}
 >
 <RotateCcw className="mr-2 h-4 w-4" />
 Reset
 </button>
 </div>

 <div className="space-y-3 rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4">
 <div className="flex justify-between text-sm text-[#6B7C8F]">
 <span>Completion Rate</span>
 <span>{progress}%</span>
 </div>
 <div className="h-3 overflow-hidden rounded-full bg-[#D9E7F0]">
 <motion.div
 className="h-full rounded-full bg-gradient-to-r from-[#2EA7E0] to-[#1D8FC7]"
 animate={{ width: `${progress}%` }}
 transition={{ duration: 0.35 }}
 />
 </div>
 </div>

 <div className="rounded-2xl border border-[#D9E7F0] bg-white p-4">
 <div className="mb-3 flex items-center gap-2">
 <Users className="h-4 w-4 text-[#6B7C8F]" />
 <p className="font-semibold text-[#163047]">Learner Profile</p>
 </div>
 <div className="space-y-2">
 <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Learner Name" className="h-11 w-full rounded-2xl border border-[#D9E7F0] px-3 outline-none" />
 <input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} placeholder="Employee ID" className="h-11 w-full rounded-2xl border border-[#D9E7F0] px-3 outline-none" />
 <select value={department} onChange={(e) => setDepartment(e.target.value)} className="h-11 w-full rounded-2xl border border-[#D9E7F0] px-3 outline-none">
 {DEPARTMENTS.map((item) => (
 <option key={item} value={item}>{item}</option>
 ))}
 </select>
 <button
 onClick={() => {
 if (!playerName.trim()) return;
 localStorage.setItem('midea-player-name', playerName.trim());
 localStorage.setItem('midea-employee-code', employeeCode.trim());
 localStorage.setItem('midea-department', department);
 setSaveMessage('Profile saved');
 setTimeout(() => setSaveMessage(''), 1500);
 }}
 className="h-11 w-full rounded-2xl bg-[#2EA7E0] px-4 text-white hover:bg-[#1D8FC7]"
 >
 Save Profile
 </button>
 </div>
 </div>

 <div className="rounded-2xl border border-[#D9E7F0] bg-white p-4">
 <div className="mb-3 flex items-center justify-between gap-2">
 <div className="flex items-center gap-2">
 <Trophy className="h-4 w-4 text-[#2EA7E0]" />
 <p className="font-semibold text-[#163047]">
 {rankingPeriod === 'daily' ? 'Daily Ranking' : rankingPeriod === 'weekly' ? 'Weekly Ranking' : 'Monthly Ranking'}
 </p>
 </div>
 <button onClick={() => void loadLeaderboard()} className="text-sm text-[#6B7C8F] hover:text-[#163047]">Refresh</button>
 </div>

 <div className="mb-3 flex flex-wrap gap-2">
 {(['daily', 'weekly', 'monthly'] as RankingPeriod[]).map((period) => (
 <button
 key={period}
 onClick={() => setRankingPeriod(period)}
 className={cn(
 'rounded-xl border px-3 py-2 text-sm font-medium',
 rankingPeriod === period
 ? 'border-[#2EA7E0] bg-[#2EA7E0] text-white'
 : 'border-[#D9E7F0] bg-white text-[#163047]'
 )}
 >
 {period === 'daily' ? 'Daily' : period === 'weekly' ? 'Weekly' : 'Monthly'}
 </button>
 ))}
 </div>

 <div className="mb-3 rounded-xl bg-[#F8FCFE] px-3 py-2 text-sm text-[#163047]">
 Active players: <span className="font-semibold">{playerCount}</span>
 </div>

 <button onClick={() => void saveTodayScore()} className="mb-3 h-11 w-full rounded-2xl bg-[#2EA7E0] px-4 font-medium text-white hover:bg-[#1D8FC7]">
 Save Today Score
 </button>

 {saveMessage && (
 <p className="mb-3 rounded-xl bg-[#F8FCFE] px-3 py-2 text-sm text-[#6B7C8F]">{saveMessage}</p>
 )}

 {loadingBoard ? (
 <p className="text-sm text-[#6B7C8F]">Loading leaderboard...</p>
 ) : leaderboard.length === 0 ? (
 <p className="text-sm text-[#6B7C8F]">No {rankingPeriod} score data yet</p>
 ) : (
 <div className="space-y-2">
 {leaderboard.map((p, i) => (
 <div key={`${p.id ?? p.name}-${i}`} className="rounded-xl bg-[#F8FCFE] px-3 py-3 text-sm">
 <div className="flex items-center justify-between gap-2">
 <div className="flex items-center gap-2">
 <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-[#2EA7E0]">
 {i + 1}
 </span>
 <span className="font-medium text-[#163047]">{p.name}</span>
 </div>
 <span className="font-semibold text-[#163047]">{p.score}</span>
 </div>
 <div className="mt-1 pl-8 text-xs text-[#6B7C8F]">
 {(p.department || 'No department') + (p.employee_code ? ` · ${p.employee_code}` : '')}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </CardShell>

 <div className="space-y-3 sm:space-y-4 order-1 lg:order-2">
 <AnimatePresence mode="wait">
 {answerResult && mode === 'quiz' && (
 <motion.div
 key={answerResult}
 initial={{ opacity: 0, y: -10, scale: 0.96 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0 }}
 className={cn(
 'mx-auto max-w-3xl rounded-2xl border px-4 py-3 text-center font-medium',
 answerResult === 'correct'
 ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
 : 'border-rose-200 bg-rose-50 text-rose-700'
 )}
 >
 {answerResult === 'correct' ? `Correct! Combo x${combo || 1}` : 'Incorrect — try the next one'}
 </motion.div>
 )}

 {mode === 'flashcards' ? (
 <motion.div
 key={`${currentCard.id}-${flipped}-${learningMode}`}
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -12 }}
 >
 <div className="mx-auto w-full max-w-4xl [perspective:1200px]">
 <motion.div
 className="relative h-[500px] w-full cursor-pointer touch-manipulation sm:h-[540px] md:h-[620px]"
 animate={{ rotateY: flipped ? 180 : 0 }}
 transition={{ duration: 0.5 }}
 style={{ transformStyle: 'preserve-3d' }}
 onClick={() => setFlipped((v) => !v)}
 >
 <CardShell className="absolute inset-0 overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-800 text-white" style={{ backfaceVisibility: 'hidden' }}>
 <div className="flex h-full flex-col justify-between p-4 sm:p-6 md:p-8">
 <div className="flex items-center justify-between">
 <span className="rounded-full bg-white/15 px-3 py-1 text-xs sm:text-sm">{currentCard.category}</span>
 {showImage && <span className="text-4xl sm:text-5xl">{currentCard.image || ' '}</span>}
 </div>

 <div className="space-y-4 sm:space-y-5 text-center">
 <p className="text-xs uppercase tracking-[0.25em] text-white/75 sm:text-sm">
 {learningMode === 'thai-learns-chinese' ? 'Chinese' : 'Thai'}
 </p>

 <div className="flex items-center justify-center gap-3">
 <h2 className="text-3xl font-bold leading-tight sm:text-5xl md:text-6xl">
 {learningMode === 'thai-learns-chinese' ? currentCard.zh : currentCard.th}
 </h2>

 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 unlockAudio();
 void playTts(
 learningMode === 'thai-learns-chinese' ? currentCard.zh : currentCard.th,
 `front-${learningMode}-${currentCard.id}`,
 learningMode === 'thai-learns-chinese' ? 'zh-CN' : 'th-TH'
 );
 }}
 className="rounded-full bg-white/15 p-3 text-white hover:bg-white/25"
 >
 <Volume2 className="h-5 w-5" />
 </button>
 </div>

 {learningMode === 'thai-learns-chinese' ? (
 <>
 {showPinyin && <div className="text-base sm:text-lg md:text-xl">{renderPinyinWithToneColor(currentCard.pinyin)}</div>}
 {showThaiReading && currentCard.thaiPronunciation && (
 <p className="text-sm sm:text-base text-white/85">{currentCard.thaiPronunciation}</p>
 )}
 </>
 ) : (
 <div className="text-sm sm:text-base md:text-lg font-medium tracking-wide text-white/85">
 {getThaiRomanText(currentCard.thaiPronunciation)}
 </div>
 )}
 </div>

 <div className="text-center text-xs sm:text-sm text-white/75">
 {ttsState.loading && ttsState.key === `front-${learningMode}-${currentCard.id}`
 ? 'Playing audio...'
 : 'Tap card to flip'}
 </div>
 </div>
 </CardShell>

 <CardShell className="absolute inset-0 overflow-hidden bg-white" style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
 <div className="flex h-full flex-col justify-between p-4 sm:p-6 md:p-8">
 <div className="flex items-center justify-between">
 <span className="rounded-full bg-[#F4FAFD] px-3 py-1 text-xs sm:text-sm text-[#163047]">{currentCard.category}</span>
 {showImage && (
 <span className="text-3xl sm:text-4xl">
 <ImageIcon className="mr-1 inline h-5 w-5" />
 {currentCard.image || ' '}
 </span>
 )}
 </div>

 <div className="space-y-4 sm:space-y-5 text-center overflow-y-auto pr-1">
 <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#6B7C8F]">
 {learningMode === 'thai-learns-chinese' ? 'Thai Meaning' : 'Chinese + Thai Romanization'}
 </p>

 {learningMode === 'thai-learns-chinese' ? (
 <>
 <div className="flex items-center justify-center gap-3">
 <h3 className="text-2xl font-bold text-[#163047] sm:text-3xl md:text-4xl">{currentCard.th || '-'}</h3>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 unlockAudio();
 void playTts(currentCard.th, `back-thai-main-${currentCard.id}`, 'th-TH');
 }}
 className="rounded-full bg-[#F4FAFD] p-3 hover:bg-[#EAF7FD]"
 >
 <Volume2 className="h-5 w-5 text-[#1D8FC7]" />
 </button>
 </div>

 <div className="space-y-2 rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4 text-left">
 <p className="text-sm text-[#6B7C8F]">Chinese Word</p>
 <div className="flex items-center gap-3">
 <p className="text-lg sm:text-xl font-semibold text-[#163047]">{currentCard.zh}</p>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 unlockAudio();
 void playTts(currentCard.zh, `back-zh-${currentCard.id}`, 'zh-CN');
 }}
 className="rounded-full bg-white p-2 shadow-sm hover:bg-[#EAF7FD]"
 >
 <Volume2 className="h-4 w-4 text-[#1D8FC7]" />
 </button>
 </div>
 {showPinyin && <div className="text-sm sm:text-base">{renderPinyinWithToneColorLight(currentCard.pinyin)}</div>}
 </div>

 {showSentence && (
 <div className="space-y-2 rounded-2xl border border-[#D9E7F0] bg-[#F4FAFD] p-4 text-left">
 <p className="text-sm font-medium text-[#6B7C8F]">Example Sentence</p>
 <div className="flex items-start justify-between gap-3">
 <p className="text-sm sm:text-lg text-[#163047]">{currentCard.sentenceTh}</p>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 unlockAudio();
 void playTts(currentCard.sentenceTh, `sentence-th-${currentCard.id}`, 'th-TH');
 }}
 className="rounded-full bg-white p-2 shadow-sm hover:bg-[#EAF7FD]"
 >
 <Volume2 className="h-4 w-4 text-[#1D8FC7]" />
 </button>
 </div>
 <div className="flex items-start justify-between gap-3">
 <p className="text-sm text-[#1D8FC7] sm:text-base">{currentCard.sentenceZh}</p>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 unlockAudio();
 void playTts(currentCard.sentenceZh, `sentence-zh-${currentCard.id}`, 'zh-CN');
 }}
 className="rounded-full bg-white p-2 shadow-sm hover:bg-[#EAF7FD]"
 >
 <Volume2 className="h-4 w-4 text-[#1D8FC7]" />
 </button>
 </div>
 </div>
 )}
 </>
 ) : (
 <>
 <div className="flex items-center justify-center gap-3">
 <h3 className="text-2xl font-bold text-[#163047] sm:text-3xl md:text-4xl">{currentCard.zh}</h3>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 unlockAudio();
 void playTts(currentCard.zh, `back-cn-${currentCard.id}`, 'zh-CN');
 }}
 className="rounded-full bg-[#F4FAFD] p-3 hover:bg-[#EAF7FD]"
 >
 <Volume2 className="h-5 w-5 text-[#1D8FC7]" />
 </button>
 </div>
 <div className="text-sm sm:text-base md:text-lg font-medium text-slate-700">{getThaiRomanText(currentCard.thaiPronunciation)}</div>
 <div className="space-y-2 rounded-2xl border border-[#D9E7F0] bg-[#F8FCFE] p-4 text-left">
 <p className="text-sm text-[#6B7C8F]">Thai</p>
 <div className="flex items-center gap-3">
 <p className="text-lg sm:text-xl font-semibold text-[#163047]">{currentCard.th}</p>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 unlockAudio();
 void playTts(currentCard.th, `back-th-${currentCard.id}`, 'th-TH');
 }}
 className="rounded-full bg-white p-2 shadow-sm hover:bg-[#EAF7FD]"
 >
 <Volume2 className="h-4 w-4 text-[#1D8FC7]" />
 </button>
 </div>
 </div>

 {showSentence && (
 <div className="space-y-2 rounded-2xl border border-[#D9E7F0] bg-[#F4FAFD] p-4 text-left">
 <p className="text-sm font-medium text-[#6B7C8F]">Example Sentence</p>
 <div className="flex items-start justify-between gap-3">
 <p className="text-sm sm:text-lg text-[#163047]">{currentCard.sentenceTh}</p>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 unlockAudio();
 void playTts(currentCard.sentenceTh, `sentence-th-front-${currentCard.id}`, 'th-TH');
 }}
 className="rounded-full bg-white p-2 shadow-sm hover:bg-[#EAF7FD]"
 >
 <Volume2 className="h-4 w-4 text-[#1D8FC7]" />
 </button>
 </div>
 <div className="flex items-start justify-between gap-3">
 <p className="text-sm text-[#1D8FC7] sm:text-base">{currentCard.sentenceZh}</p>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 unlockAudio();
 void playTts(currentCard.sentenceZh, `sentence-cn-back-${currentCard.id}`, 'zh-CN');
 }}
 className="rounded-full bg-white p-2 shadow-sm hover:bg-[#EAF7FD]"
 >
 <Volume2 className="h-4 w-4 text-[#1D8FC7]" />
 </button>
 </div>
 <div className="text-sm sm:text-base text-slate-700">{getThaiRomanText(currentCard.sentenceThaiPronunciation)}</div>
 </div>
 )}
 </>
 )}
 </div>

 <p className="text-center text-xs sm:text-sm text-[#6B7C8F]">Tap card to flip back</p>
 </div>
 </CardShell>
 </motion.div>
 </div>
 </motion.div>
 ) : (
 <motion.div
 key={`${currentCard.id}-${quizSubmitted}-${learningMode}`}
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -12 }}
 >
 <CardShell className="mx-auto max-w-4xl overflow-hidden border-[#D9E7F0] bg-white">
 <div className="space-y-4 sm:space-y-5 p-4 sm:p-5 md:p-10">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <span className="rounded-full bg-[#F4FAFD] px-3 py-1 text-sm text-[#163047]">{currentCard.category}</span>
 <div className="flex items-center gap-2 text-sm text-[#6B7C8F]">
 <BookOpen className="h-4 w-4" />
 {learningMode === 'thai-learns-chinese'
 ? 'Choose the correct Thai meaning'
 : 'Choose the correct Chinese word'}
 </div>
 </div>

 <div className="space-y-4 py-2 sm:py-4 text-center">
 {showImage && <div className="text-4xl sm:text-5xl">{currentCard.image || ' '}</div>}
 <div className="flex items-center justify-center gap-3">
 <h2 className="text-2xl font-bold leading-tight text-[#163047] sm:text-4xl md:text-5xl">
 {learningMode === 'thai-learns-chinese' ? currentCard.zh : currentCard.th}
 </h2>
 <button
 type="button"
 onClick={() => {
 unlockAudio();
 void playTts(
 learningMode === 'thai-learns-chinese' ? currentCard.zh : currentCard.th,
 `quiz-main-${learningMode}-${currentCard.id}`,
 learningMode === 'thai-learns-chinese' ? 'zh-CN' : 'th-TH'
 );
 }}
 className="rounded-full bg-[#F4FAFD] p-3 hover:bg-[#EAF7FD]"
 >
 <Volume2 className="h-5 w-5 text-[#1D8FC7]" />
 </button>
 </div>

 {learningMode === 'thai-learns-chinese' ? (
 <>
 {showPinyin && <div className="text-sm sm:text-lg md:text-xl">{renderPinyinWithToneColorLight(currentCard.pinyin)}</div>}
 {showThaiReading && currentCard.thaiPronunciation && (
 <p className="text-sm sm:text-lg text-[#6B7C8F]">{currentCard.thaiPronunciation}</p>
 )}
 </>
 ) : (
 <p className="text-sm sm:text-lg text-[#6B7C8F]">{getThaiRomanText(currentCard.thaiPronunciation)}</p>
 )}

 {showSentence && (
 <div className="mx-auto max-w-2xl rounded-2xl bg-[#F8FCFE] p-4 text-left text-sm text-[#163047] sm:text-base">
 <div className="mb-2 flex items-start justify-between gap-3">
 <p>{learningMode === 'thai-learns-chinese' ? currentCard.sentenceZh : currentCard.sentenceTh}</p>
 <button
 type="button"
 onClick={() => {
 unlockAudio();
 void playTts(
 learningMode === 'thai-learns-chinese' ? currentCard.sentenceZh : currentCard.sentenceTh,
 `quiz-sentence-${learningMode}-${currentCard.id}`,
 learningMode === 'thai-learns-chinese' ? 'zh-CN' : 'th-TH'
 );
 }}
 className="rounded-full bg-white p-2 shadow-sm hover:bg-[#EAF7FD]"
 >
 <Volume2 className="h-4 w-4 text-[#1D8FC7]" />
 </button>
 </div>

 {learningMode === 'thai-learns-chinese' ? (
 showPinyin && <div className="mt-2">{renderPinyinWithToneColorLight(currentCard.sentencePinyin)}</div>
 ) : (
 <p className="mt-2 text-[#6B7C8F]">{getThaiRomanText(currentCard.sentenceThaiPronunciation)}</p>
 )}
 </div>
 )}
 </div>

 <div className="grid gap-3">
 {quizChoices.map((choice) => {
 const isCorrectChoice = choice === correctAnswer;
 const isSelected = quizAnswer === choice;

 return (
 <motion.button
 key={choice}
 whileTap={{ scale: 0.98 }}
 className={cn(
 'min-h-[56px] rounded-2xl border px-4 py-4 text-left text-sm sm:px-5 sm:text-base',
 quizSubmitted && isCorrectChoice && 'border-emerald-500 bg-emerald-50',
 quizSubmitted && isSelected && !isCorrectChoice && 'border-rose-500 bg-rose-50',
 !quizSubmitted && 'border-[#D9E7F0] bg-white text-[#163047]'
 )}
 onClick={() => submitQuiz(choice)}
 disabled={quizSubmitted}
 >
 {choice}
 </motion.button>
 );
 })}
 </div>

 {quizSubmitted && (
 <div
 className={cn(
 'rounded-2xl border p-4',
 quizAnswer === correctAnswer
 ? 'border-emerald-300 bg-emerald-50'
 : 'border-rose-300 bg-rose-50'
 )}
 >
 <div className="flex items-center gap-2 font-semibold text-[#163047]">
 <BadgeCheck className="h-4 w-4" />
 {quizAnswer === correctAnswer ? 'Correct' : 'Incorrect'}
 </div>
 <p className="mt-1 text-[#6B7C8F]">Correct answer: {correctAnswer}</p>
 </div>
 )}
 </div>
 </CardShell>
 </motion.div>
 )}
 </AnimatePresence>

 <div className="mx-auto grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
 <button
 onClick={() => markCard('known')}
 className={cn(
 'w-full rounded-2xl border px-4 py-3 text-sm font-medium',
 currentCard && knownCardIds.includes(currentCard.id)
 ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
 : 'border-[#D9E7F0] bg-white text-[#163047]'
 )}
 >
 Known
 </button>
 <button
 onClick={() => markCard('review')}
 className={cn(
 'w-full rounded-2xl border px-4 py-3 text-sm font-medium',
 currentCard && reviewCardIds.includes(currentCard.id)
 ? 'border-amber-500 bg-amber-50 text-amber-700'
 : 'border-[#D9E7F0] bg-white text-[#163047]'
 )}
 >
 Review
 </button>
 <button
 onClick={() => markCard('hard')}
 className={cn(
 'w-full rounded-2xl border px-4 py-3 text-sm font-medium',
 currentCard && hardCardIds.includes(currentCard.id)
 ? 'border-rose-500 bg-rose-50 text-rose-700'
 : 'border-[#D9E7F0] bg-white text-[#163047]'
 )}
 >
 Hard
 </button>
 </div>

 <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
 <button
 onClick={prevCard}
 className="w-full sm:min-w-[160px] rounded-2xl border border-[#D9E7F0] bg-white px-6 py-4 text-base sm:text-lg font-semibold text-[#163047]"
 >
 Previous
 </button>
 <button
 onClick={nextCard}
 className="w-full sm:min-w-[160px] rounded-2xl bg-[#2EA7E0] px-6 py-4 text-base sm:text-lg font-semibold text-white hover:bg-[#1D8FC7]"
 >
 Next
 </button>
 </div>
 </div>
 </div>

 <div className="text-center text-sm text-[#6B7C8F]">
 Internal Use Only · Midea Thailand Language Training Platform
 </div>
 </div>
 </div>
 );
}