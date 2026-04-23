'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  ArrowRight,
  Building2,
  IdCard,
  Loader2,
  LogIn,
  ShieldCheck,
  Sparkles,
  User2,
} from 'lucide-react';
import { signInOrCreateUser } from '@/lib/users';
import { saveUserSession } from '@/lib/session';

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

export default function Page() {
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('HR');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!employeeId.trim() || !name.trim() || !department.trim()) {
      setError('Please complete Employee ID, Name, and Department.');
      return;
    }

    setLoading(true);
    try {
      const user = await signInOrCreateUser({
        employeeCode: employeeId.trim(),
        name: name.trim(),
        department: department.trim(),
      });

      saveUserSession(user);
      window.location.href = '/learn';
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to sign in. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!loading) {
      void handleSubmit();
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#DFF3FF]">
      <div className="absolute inset-0">
        <img
          src="/midea-building.png"
          alt="Midea Building"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,24,44,0.88)_0%,rgba(10,58,100,0.78)_38%,rgba(17,92,151,0.72)_70%,rgba(223,243,255,0.92)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.16),transparent_22%),radial-gradient(circle_at_85%_12%,rgba(255,255,255,0.10),transparent_18%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.08),transparent_24%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:max-w-lg sm:px-5">
        <div className="mb-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/[0.65]">
                Internal Learning Platform
              </p>
              <h2 className="text-lg font-bold sm:text-xl">Midea Thailand</h2>
            </div>
          </div>

          <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/[0.85] backdrop-blur">
            Mobile First
          </div>
        </div>

        <div className="mb-5 text-white">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure Internal Access
          </div>

          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
            Learn Thai ↔ Chinese for factory work
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/[0.75] sm:text-base">
            Fast daily practice for production, warehouse, quality, and office
            communication.
          </p>
        </div>

        <div className="mb-5 flex justify-center">
          <div className="rounded-[28px] border border-white/20 bg-white/10 px-5 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl">
            <Image
              src="/midea-logo.png"
              alt="Midea logo"
              width={180}
              height={64}
              className="h-auto w-[165px] sm:w-[180px]"
              priority
            />
          </div>
        </div>

        <form
          onSubmit={handleFormSubmit}
          className="relative overflow-hidden rounded-[32px] border border-white/25 bg-white/[0.14] shadow-[0_24px_80px_rgba(6,33,59,0.22)] backdrop-blur-2xl"
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.14))]" />
          <div className="absolute inset-x-0 top-0 h-[1px] bg-white/[0.55]" />

          <div className="relative z-10 p-4 sm:p-5">
            <div className="mb-5 grid grid-cols-3 gap-3">
              {[
                { label: 'Focus', value: 'TH ↔ ZH' },
                { label: 'Use', value: 'Factory' },
                { label: 'Mode', value: 'Daily' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white"
                >
                  <p className="text-[11px] text-white/[0.65]">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold sm:text-base">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Employee ID
                </label>
                <div className="flex h-14 items-center rounded-2xl border border-white/20 bg-white/[0.92] px-4 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition focus-within:border-sky-300">
                  <IdCard className="mr-3 h-4 w-4 shrink-0 text-slate-500" />
                  <input
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="Enter employee ID"
                    disabled={loading}
                    className="w-full bg-transparent text-base outline-none placeholder:text-slate-400 disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Name
                </label>
                <div className="flex h-14 items-center rounded-2xl border border-white/20 bg-white/[0.92] px-4 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition focus-within:border-sky-300">
                  <User2 className="mr-3 h-4 w-4 shrink-0 text-slate-500" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    disabled={loading}
                    className="w-full bg-transparent text-base outline-none placeholder:text-slate-400 disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Department
                </label>
                <div className="flex h-14 items-center rounded-2xl border border-white/20 bg-white/[0.92] px-4 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition focus-within:border-sky-300">
                  <Building2 className="mr-3 h-4 w-4 shrink-0 text-slate-500" />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={loading}
                    className="w-full bg-transparent text-base outline-none disabled:opacity-60"
                  >
                    {DEPARTMENTS.map((dep) => (
                      <option key={dep} value={dep}>
                        {dep}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/95 px-4 py-3 text-sm text-rose-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 text-base font-semibold text-white shadow-[0_12px_32px_rgba(14,165,233,0.35)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    Enter Platform
                    <ArrowRight className="h-5 w-5 transition group-active:translate-x-0.5" />
                  </>
                )}
              </button>
            </div>

            <div className="mt-5 rounded-[24px] border border-white/20 bg-white/10 p-4 text-white">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                <Sparkles className="h-3.5 w-3.5" />
                Learning Purpose
              </div>
              <p className="text-sm leading-6 text-white/[0.75]">
                Support Thai-Chinese communication, reduce misunderstanding, and
                encourage staff language development for real workplace use.
              </p>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
