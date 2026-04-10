'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  RotateCcw,
  Shuffle,
  Languages,
  CheckCircle2,
  Flame,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { sentenceBuilderData } from '@/lib/sentence-builder-data';
import {
  SentenceLanguage,
  compareTokenArrays,
  shuffleArray,
} from '@/lib/sentence-builder-utils';
import { supabase } from '@/lib/supabase';

type SourceFilter = 'all' | 'hsk4' | 'factory';

type BuilderLeaderboardEntry = {
  id?: number;
  name: string;
  employee_code?: string | null;
  department?: string | null;
  score: number;
  score_date?: string;
  created_at?: string;
  mode?: string;
};

export default function SentenceBuilderPage() {
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [targetLang, setTargetLang] = useState<SentenceLanguage>('zh');
  const [index, setIndex] = useState(0);

  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [poolTokens, setPoolTokens] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [showRoman, setShowRoman] = useState(true);

  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [todayDone, setTodayDone] = useState(false);
  const [showStreakBurst, setShowStreakBurst] = useState(false);

  const [playerName, setPlayerName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [department, setDepartment] = useState('HR');

  const [leaderboard, setLeaderboard] = useState<BuilderLeaderboardEntry[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const filtered = useMemo(() => {
    if (sourceFilter === 'hsk4') {
      return sentenceBuilderData.filter((item) => item.source === 'hsk4');
    }
    if (sourceFilter === 'factory') {
      return sentenceBuilderData.filter((item) => item.source === 'factory');
    }
    return sentenceBuilderData;
  }, [sourceFilter]);

  const current = filtered[index] ?? null;

  const correctTokens = useMemo(() => {
    if (!current) return [];
    if (targetLang === 'th') return current.tokensTh;
    if (targetLang === 'en') return current.tokensEn;
    return current.tokensZh;
  }, [current, targetLang]);

  function resetRound() {
    if (!current) return;
    setSelectedTokens([]);
    setPoolTokens(shuffleArray(correctTokens));
    setChecked(false);
    setCorrect(null);
    setFeedback(null);
  }

  useEffect(() => {
    if (current) resetRound();
  }, [index, targetLang, sourceFilter]);

  useEffect(() => {
    const savedName = localStorage.getItem('midea-player-name') || '';
    const savedCode = localStorage.getItem('midea-employee-code') || '';
    const savedDept = localStorage.getItem('midea-department') || 'HR';

    setPlayerName(savedName);
    setEmployeeCode(savedCode);
    setDepartment(savedDept);

    const today = new Date().toISOString().slice(0, 10);
    const savedStreak = Number(localStorage.getItem('midea-builder-streak') || '0');
    const savedBestStreak = Number(localStorage.getItem('midea-builder-best-streak') || '0');
    const savedLastStudyDate =
      localStorage.getItem('midea-builder-last-study-date') || '';
    const savedTodayDone =
      localStorage.getItem('midea-builder-today-done') === 'true';

    setStreak(savedStreak);
    setBestStreak(savedBestStreak);

    if (savedLastStudyDate === today && savedTodayDone) {
      setTodayDone(true);
    } else {
      setTodayDone(false);
      localStorage.setItem('midea-builder-today-done', 'false');
    }

    void loadLeaderboard();
  }, []);

  function claimTodayStudy() {
    const today = new Date().toISOString().slice(0, 10);
    const lastStudyDate =
      localStorage.getItem('midea-builder-last-study-date') || '';

    if (lastStudyDate === today) {
      setTodayDone(true);
      localStorage.setItem('midea-builder-today-done', 'true');
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

    localStorage.setItem('midea-builder-last-study-date', today);
    localStorage.setItem('midea-builder-today-done', 'true');
    localStorage.setItem('midea-builder-streak', String(nextStreak));
    localStorage.setItem(
      'midea-builder-best-streak',
      String(Math.max(bestStreak, nextStreak))
    );

    setTimeout(() => setShowStreakBurst(false), 1800);
  }

  async function loadLeaderboard() {
    setLoadingBoard(true);

    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('daily_scores')
      .select('*')
      .eq('mode', 'sentence_builder')
      .eq('score_date', today)
      .order('score', { ascending: false })
      .limit(10);

    if (!error && data) {
      setLeaderboard(data as BuilderLeaderboardEntry[]);
    } else {
      setLeaderboard([]);
    }

    setLoadingBoard(false);
  }

  function pickToken(token: string, tokenIndex: number) {
    if (checked) return;
    setSelectedTokens((prev) => [...prev, token]);
    setPoolTokens((prev) => prev.filter((_, i) => i !== tokenIndex));
  }

  function removeToken(token: string, tokenIndex: number) {
    if (checked) return;
    setPoolTokens((prev) => [...prev, token]);
    setSelectedTokens((prev) => prev.filter((_, i) => i !== tokenIndex));
  }

  function checkAnswer() {
    const isCorrect = compareTokenArrays(selectedTokens, correctTokens);

    setChecked(true);
    setCorrect(isCorrect);
    setAttempts((prev) => prev + 1);
    setFeedback(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      setScore((prev) => prev + 10);
      setCombo((prev) => prev + 1);
      claimTodayStudy();
    } else {
      setCombo(0);
    }

    setTimeout(() => setFeedback(null), 1200);
  }

  function nextQuestion() {
    if (!filtered.length) return;
    setIndex((prev) => (prev + 1) % filtered.length);
  }

  function resetAll() {
    setIndex(0);
    setSelectedTokens([]);
    setPoolTokens([]);
    setChecked(false);
    setCorrect(null);
    setShowRoman(true);
    setScore(0);
    setAttempts(0);
    setCombo(0);
    setFeedback(null);
  }

  async function saveTodayScore() {
    const trimmedName = playerName.trim();
    const trimmedCode = employeeCode.trim();

    if (!trimmedName) {
      setSaveMessage('Please enter learner name');
      setTimeout(() => setSaveMessage(''), 2000);
      return;
    }

    localStorage.setItem('midea-player-name', trimmedName);
    localStorage.setItem('midea-employee-code', trimmedCode);
    localStorage.setItem('midea-department', department);

    const today = new Date().toISOString().slice(0, 10);

    const { data: existing, error: existingError } = await supabase
      .from('daily_scores')
      .select('*')
      .eq('name', trimmedName)
      .eq('score_date', today)
      .eq('mode', 'sentence_builder')
      .limit(1);

    if (existingError) {
      setSaveMessage('Save failed');
      setTimeout(() => setSaveMessage(''), 2000);
      return;
    }

    if (existing && existing.length > 0) {
      const currentBest = existing[0] as BuilderLeaderboardEntry;
      if (score > Number(currentBest.score || 0)) {
        await supabase
          .from('daily_scores')
          .update({
            score,
            employee_code: trimmedCode || null,
            department,
          })
          .eq('id', currentBest.id);
      }
    } else {
      await supabase.from('daily_scores').insert({
        name: trimmedName,
        employee_code: trimmedCode || null,
        department,
        score,
        mode: 'sentence_builder',
        score_date: today,
      });
    }

    await loadLeaderboard();
    setSaveMessage('Builder score saved');
    setTimeout(() => setSaveMessage(''), 2000);
  }

  if (!current) {
    return (
      <div className="p-8">
        <div className="rounded-3xl border bg-white p-8 text-center">
          No sentence data
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4FAFD] p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-[#2EA7E0] to-[#1D8FC7] p-6 text-white">
          <div className="flex items-center gap-3">
            <Languages className="h-6 w-6" />
            <h1 className="text-2xl font-bold md:text-4xl">Sentence Builder</h1>
          </div>
          <p className="mt-2 text-white/90">
            ฝึกเรียงประโยค ไทย / จีน / อังกฤษ พร้อม score, streak และ ranking
          </p>
        </div>

        {showStreakBurst && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-amber-700">
            <div className="flex items-center justify-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4" />
              Streak updated! Keep going 🔥
            </div>
          </div>
        )}

        {feedback && (
          <div
            className={`rounded-2xl border px-4 py-3 text-center font-medium ${
              feedback === 'correct'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {feedback === 'correct' ? `Correct! Combo x${combo || 1}` : 'Incorrect'}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4 rounded-3xl border bg-white p-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                <div className="flex items-center gap-2 text-orange-700">
                  <Flame className="h-4 w-4" />
                  <span className="text-sm font-medium">Streak</span>
                </div>
                <div className="mt-2 text-2xl font-bold text-orange-800">{streak}</div>
                <div className="mt-1 text-xs text-orange-700">
                  {todayDone ? 'Today completed' : 'Study today'}
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
                <div className="mt-1 text-xs text-amber-700">Best streak / combo</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Score</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{score}</div>
              </div>
              <div className="rounded-2xl border bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Attempts</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{attempts}</div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Vocabulary Source</p>
              <div className="grid grid-cols-3 gap-2">
                {(['all', 'hsk4', 'factory'] as SourceFilter[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setSourceFilter(item);
                      setIndex(0);
                    }}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      sourceFilter === item
                        ? 'border-[#2EA7E0] bg-[#2EA7E0] text-white'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Target Language</p>
              <div className="grid grid-cols-3 gap-2">
               {(['th', 'zh'] as SentenceLanguage[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => setTargetLang(item)}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      targetLang === item
                        ? 'border-[#2EA7E0] bg-[#2EA7E0] text-white'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    {item.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowRoman((v) => !v)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            >
              {showRoman ? 'Hide Thai Roman' : 'Show Thai Roman'}
            </button>

            <button
              onClick={resetRound}
              className="flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Round
            </button>

            <button
              onClick={() => setPoolTokens(shuffleArray(poolTokens))}
              className="flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm"
            >
              <Shuffle className="h-4 w-4" />
              Shuffle Tokens
            </button>

            <button
              onClick={resetAll}
              className="flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm"
            >
              <RotateCcw className="h-4 w-4" />
              Reset All
            </button>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <div>Question: {index + 1}</div>
              <div>Source: {current.source}</div>
              <div>Difficulty: {current.difficulty}</div>
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[#2EA7E0]" />
                <p className="font-semibold text-slate-800">Builder Leaderboard</p>
              </div>

              <div className="space-y-2">
                <input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Learner Name"
                  className="h-11 w-full rounded-xl border px-3 outline-none"
                />
                <input
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  placeholder="Employee ID"
                  className="h-11 w-full rounded-xl border px-3 outline-none"
                />
                <input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Department"
                  className="h-11 w-full rounded-xl border px-3 outline-none"
                />
              </div>

              <button
                onClick={() => void saveTodayScore()}
                className="mt-3 w-full rounded-xl bg-[#2EA7E0] px-4 py-3 text-white"
              >
                Save Builder Score
              </button>

              {saveMessage && (
                <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {saveMessage}
                </p>
              )}

              <div className="mt-4">
                {loadingBoard ? (
                  <p className="text-sm text-slate-500">Loading leaderboard...</p>
                ) : leaderboard.length === 0 ? (
                  <p className="text-sm text-slate-500">No score data yet</p>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((item, i) => (
                      <div
                        key={`${item.id ?? item.name}-${i}`}
                        className="rounded-xl bg-slate-50 px-3 py-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-[#2EA7E0]">
                              {i + 1}
                            </span>
                            <span className="font-medium text-slate-800">{item.name}</span>
                          </div>
                          <span className="font-semibold text-slate-800">{item.score}</span>
                        </div>
                        <div className="mt-1 pl-8 text-xs text-slate-500">
                          {(item.department || 'No department') +
                            (item.employee_code ? ` · ${item.employee_code}` : '')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5 rounded-3xl border bg-white p-5 md:p-8">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-500">Reference</p>
              <div className="mt-2 space-y-2">
                <p className="text-lg font-medium text-slate-900">ไทย: {current.th}</p>
                {showRoman && current.thRoman && (
                  <p className="text-sm text-slate-500">Roman: {current.thRoman}</p>
                )}
                <p className="text-lg font-medium text-slate-900">中文: {current.zh}</p>
                <p className="text-lg font-medium text-slate-900">English: {current.en}</p>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-500">
                Your Answer ({targetLang.toUpperCase()})
              </p>
              <div className="min-h-[90px] rounded-2xl border border-dashed bg-slate-50 p-3">
                <div className="flex flex-wrap gap-2">
                  {selectedTokens.map((token, i) => (
                    <button
                      key={`${token}-${i}`}
                      onClick={() => removeToken(token, i)}
                      className="rounded-xl bg-[#2EA7E0] px-3 py-2 text-white"
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-500">Token Pool</p>
              <div className="rounded-2xl border bg-white p-3">
                <div className="flex flex-wrap gap-2">
                  {poolTokens.map((token, i) => (
                    <button
                      key={`${token}-${i}`}
                      onClick={() => pickToken(token, i)}
                      className="rounded-xl border bg-slate-50 px-3 py-2 hover:bg-slate-100"
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={checkAnswer}
                className="rounded-xl bg-[#2EA7E0] px-5 py-3 text-white"
              >
                Check Answer
              </button>

              <button
                onClick={nextQuestion}
                className="rounded-xl border px-5 py-3"
              >
                Next
              </button>
            </div>

            {checked && (
              <div
                className={`rounded-2xl border p-4 ${
                  correct
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-5 w-5" />
                  {correct ? 'Correct' : 'Not correct yet'}
                </div>

                {!correct && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold">Correct Order:</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {correctTokens.map((token, i) => (
                        <span
                          key={`${token}-${i}`}
                          className="rounded-xl bg-white px-3 py-2 text-slate-700"
                        >
                          {token}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}