'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  ArrowRight,
  Building2,
  IdCard,
  LogIn,
  ShieldCheck,
  Sparkles,
  User2,
  Users,
} from 'lucide-react';

export default function Page() {
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!employeeId.trim() || !name.trim() || !department.trim()) {
      setError('Please complete Employee ID, Name, and Department.');
      return;
    }

    localStorage.setItem('midea-player-name', name.trim());
    localStorage.setItem('midea-employee-code', employeeId.trim());
    localStorage.setItem('midea-department', department.trim());

    window.location.href = '/learn';
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#EAF7FD]">
      <div className="absolute inset-0">
        <img
          src="/midea-building.png"
          alt="Midea Building"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(4,21,40,0.86)_0%,rgba(10,76,128,0.72)_38%,rgba(46,167,224,0.36)_65%,rgba(234,247,253,0.90)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_75%_30%,rgba(255,255,255,0.10),transparent_24%),radial-gradient(circle_at_30%_80%,rgba(255,255,255,0.08),transparent_22%)]" />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.12fr_0.88fr]">
        <section className="hidden lg:flex">
          <div className="flex w-full flex-col justify-between px-10 py-10 xl:px-14 xl:py-12">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.34em] text-white/70">
                  Internal Learning Platform
                </p >
                <h2 className="text-2xl font-bold text-white">Midea Thailand</h2>
              </div>
            </div>

            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur-md">
                <Sparkles className="h-4 w-4" />
                Thai - Chinese Communication Excellence
              </div>

              <h1 className="max-w-2xl text-5xl font-bold leading-[1.05] text-white xl:text-6xl">
                Midea Thai-China
                <br />
                Language Platform
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82">
                Improve communication, reduce misunderstanding, and support
                practical language learning for daily factory operations.
              </p >

              <div className="mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
                <div className="rounded-[28px] border border-white/20 bg-white/10 p-5 text-white backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
                  <p className="text-sm text-white/70">Focus</p >
                  <p className="mt-3 text-lg font-semibold">Thai ↔ Chinese</p >
                </div>

                <div className="rounded-[28px] border border-white/20 bg-white/10 p-5 text-white backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
                  <p className="text-sm text-white/70">Use Case</p >
                  <p className="mt-3 text-lg font-semibold">Factory Communication</p >
                </div>

                <div className="rounded-[28px] border border-white/20 bg-white/10 p-5 text-white backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
                  <p className="text-sm text-white/70">Modules</p >
                  <p className="mt-3 text-lg font-semibold">Flashcards & Quiz</p >
                </div>
              </div>
            </div>

            <div className="flex items-end justify-between gap-6">
              <div className="rounded-[28px] border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
                <p className="text-sm text-white/70">Brand Identity</p >
                <div className="mt-3">
                  <Image
                    src="/midea-logo.png"
                    alt="Midea logo"
                    width={180}
                    height={64}
                    className="h-auto w-[180px]"
                    priority
                  />
                </div>
              </div>

              <p className="text-sm text-white/68">
                Corporate premium login experience
              </p >
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-[560px]">
            <div className="mb-6 flex items-center justify-center lg:hidden">
              <div className="rounded-[28px] border border-white/30 bg-white/15 px-5 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.10)] backdrop-blur-xl">
                <Image
                  src="/midea-logo.png"
                  alt="Midea logo"
                  width={180}
                  height={64}
                  className="h-auto w-[170px]"
                  priority
                />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[34px] border border-white/35 bg-white/18 shadow-[0_30px_80px_rgba(15,58,95,0.18)] backdrop-blur-2xl">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0.18))]" />
              <div className="absolute inset-x-0 top-0 h-[1px] bg-white/60" />

              <div className="relative z-10 p-6 sm:p-8 md:p-9">
                <div className="mb-8 space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/45 px-4 py-2 text-sm text-[#1D8FC7] backdrop-blur">
                    <ShieldCheck className="h-4 w-4" />
                    Secure Internal Access
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-[#163047] sm:text-4xl">
                      Welcome Back
                    </h1>
                    <p className="max-w-md text-base leading-7 text-[#5F7388]">
                      Sign in to continue to language mode selection, flashcards,
                      and quiz practice.
                    </p >
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#163047]">
                      Employee ID
                    </label>
                    <div className="flex h-12 items-center rounded-2xl border border-white/55 bg-white/55 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md transition focus-within:border-[#6ABFE7]">
                      <IdCard className="mr-3 h-4 w-4 text-[#6B7C8F]" />
                      <input
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        placeholder="Enter employee ID"
                        className="w-full bg-transparent text-[#163047] outline-none placeholder:text-[#9BA9B8]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#163047]">
                      Name
                    </label>
                    <div className="flex h-12 items-center rounded-2xl border border-white/55 bg-white/55 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md transition focus-within:border-[#6ABFE7]">
                      <User2 className="mr-3 h-4 w-4 text-[#6B7C8F]" />
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter full name"
                        className="w-full bg-transparent text-[#163047] outline-none placeholder:text-[#9BA9B8]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#163047]">
                      Department
                    </label>
                    <div className="flex h-12 items-center rounded-2xl border border-white/55 bg-white/55 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md transition focus-within:border-[#6ABFE7]">
                      <Building2 className="mr-3 h-4 w-4 text-[#6B7C8F]" />
                      <input
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="Enter department"
                        className="w-full bg-transparent text-[#163047] outline-none placeholder:text-[#9BA9B8]"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-600 backdrop-blur">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2EA7E0] to-[#1D8FC7] px-4 py-3 text-base font-semibold text-white shadow-[0_14px_30px_rgba(46,167,224,0.32)] transition duration-200 hover:translate-y-[-1px] hover:shadow-[0_18px_36px_rgba(29,143,199,0.36)]"
                  >
                    <LogIn className="h-4 w-4" />
                    Enter Platform
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </button>
                </div>

                <div className="mt-8 rounded-[28px] border border-white/45 bg-white/42 p-5 backdrop-blur-md">
                  <div className="mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#1D8FC7]" />
                    <p className="text-sm font-medium text-[#163047]">
                      Learning Purpose
                    </p >
                  </div>
                  <p className="text-sm leading-6 text-[#5F7388]">
                    Support Thai-Chinese communication, reduce misunderstanding,
                    and encourage staff language development for real workplace use.
                  </p >
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}