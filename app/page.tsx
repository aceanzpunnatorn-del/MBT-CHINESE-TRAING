'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, IdCard, Lock, Shield, User2 } from 'lucide-react';
import { signInOrCreateUser, saveUserSession, getUserSession } from '@/lib/user';

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

export default function HomePage() {
  const router = useRouter();

  const [employeeCode, setEmployeeCode] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('HR');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const session = getUserSession();
    if (session?.employeeCode) {
      setEmployeeCode(session.employeeCode);
    }
    if (session?.name) {
      setName(session.name);
    }
    if (session?.department) {
      setDepartment(session.department);
    }
  }, []);

  async function handleEnterPlatform() {
    setErrorMessage('');

    const trimmedEmployeeCode = employeeCode.trim();
    const trimmedName = name.trim();
    const trimmedDepartment = department.trim();

    if (!trimmedEmployeeCode || !trimmedName || !trimmedDepartment) {
      setErrorMessage('Please complete Employee ID, Name, and Department.');
      return;
    }

    try {
      setLoading(true);

      const user = await signInOrCreateUser({
        employeeCode: trimmedEmployeeCode,
        name: trimmedName,
        department: trimmedDepartment,
      });

      saveUserSession(user);
      router.push('/learn');
    } catch (error: any) {
      console.error('login error:', error);
      setErrorMessage(
        error?.message || 'Unable to sign in right now. Please check Supabase and try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#DFF3FF]">
      <div className="relative min-h-screen">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(rgba(18,44,73,0.60), rgba(18,44,73,0.38)), url('/midea-bg.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_35%)]" />

        <div className="relative z-10 mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 gap-8 px-4 py-6 md:px-8 lg:grid-cols-[1.1fr_560px] lg:gap-10 lg:px-12">
          <section className="flex flex-col justify-between text-white">
            <div>
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur">
                <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/70">
                    Internal Learning Platform
                  </p>
                  <h2 className="text-2xl font-bold">Midea Thailand</h2>
                </div>
              </div>

              <div className="mt-10 inline-flex rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm backdrop-blur">
                ✦ Thai - Chinese Communication Excellence
              </div>

              <h1 className="mt-8 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-7xl">
                Midea Thai-China
                <br />
                Language Platform
              </h1>

              <p className="mt-8 max-w-2xl text-lg leading-9 text-white/95">
                Improve communication, reduce misunderstanding, and support practical
                language learning for daily factory operations.
              </p>

              <div className="mt-12 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-[28px] border border-white/15 bg-white/10 p-6 backdrop-blur">
                  <p className="text-sm text-white/70">Focus</p>
                  <h3 className="mt-4 text-2xl font-semibold">Thai ↔ Chinese</h3>
                </div>
                <div className="rounded-[28px] border border-white/15 bg-white/10 p-6 backdrop-blur">
                  <p className="text-sm text-white/70">Use Case</p>
                  <h3 className="mt-4 text-2xl font-semibold">Factory Communication</h3>
                </div>
                <div className="rounded-[28px] border border-white/15 bg-white/10 p-6 backdrop-blur">
                  <p className="text-sm text-white/70">Modules</p>
                  <h3 className="mt-4 text-2xl font-semibold">Flashcards & Quiz</h3>
                </div>
              </div>
            </div>

            <div className="mt-10 w-[210px] rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="mb-3 text-sm text-white/70">Brand Identity</p>
              <div className="flex aspect-square items-center justify-center rounded-2xl bg-[#2EA7E0]">
                <span className="text-5xl font-semibold">Midea</span>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center">
            <div className="w-full max-w-[520px] rounded-[36px] border border-white/25 bg-white/35 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.12)] backdrop-blur-xl sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm text-[#2EA7E0]">
                <Shield className="h-4 w-4" />
                Secure Internal Access
              </div>

              <h2 className="mt-6 text-4xl font-bold text-[#163047] sm:text-5xl">
                Welcome Back
              </h2>

              <p className="mt-4 text-lg leading-8 text-[#163047]/60">
                Sign in to continue to language mode selection, flashcards, and quiz
                practice.
              </p>

              <div className="mt-8 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#163047]/80">
                    Employee ID
                  </span>
                  <div className="flex h-14 items-center gap-3 rounded-2xl border border-white/50 bg-white/70 px-4">
                    <IdCard className="h-5 w-5 text-[#6A7E90]" />
                    <input
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                      placeholder="Enter employee ID"
                      className="w-full bg-transparent text-lg text-[#163047] outline-none placeholder:text-[#6A7E90]"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#163047]/80">
                    Name
                  </span>
                  <div className="flex h-14 items-center gap-3 rounded-2xl border border-white/50 bg-white/70 px-4">
                    <User2 className="h-5 w-5 text-[#6A7E90]" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full bg-transparent text-lg text-[#163047] outline-none placeholder:text-[#6A7E90]"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#163047]/80">
                    Department
                  </span>
                  <div className="flex h-14 items-center gap-3 rounded-2xl border border-white/50 bg-white/70 px-4">
                    <Building2 className="h-5 w-5 text-[#6A7E90]" />
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-transparent text-lg text-[#163047] outline-none"
                    >
                      {DEPARTMENTS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                {errorMessage ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">
                    {errorMessage}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleEnterPlatform}
                  disabled={loading}
                  className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-[#2EA7E0] text-xl font-semibold text-white transition hover:bg-[#1D8FC7] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Lock className="h-5 w-5" />
                  {loading ? 'Signing in...' : 'Enter Platform'}
                </button>
              </div>

              <div className="mt-8 rounded-[28px] border border-white/35 bg-white/25 p-5">
                <div className="flex items-center gap-2 text-[#2EA7E0]">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Learning Purpose</span>
                </div>
                <p className="mt-3 text-base leading-8 text-[#163047]/55">
                  Support Thai-Chinese communication, reduce misunderstanding, and
                  encourage staff language development for real workplace use.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-sm text-[#163047]">
          Corporate premium login experience
        </div>
      </div>
    </main>
  );
}