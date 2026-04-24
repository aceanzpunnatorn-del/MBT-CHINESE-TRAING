import type { AppUser } from '@/types/app';

const SESSION_KEY = 'midea-learning-user';
export type SessionRole = NonNullable<AppUser['role']>;

function isBrowser() {
  return typeof window !== 'undefined';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isAppUser(value: unknown): value is AppUser {
  if (!value || typeof value !== 'object') return false;

  const user = value as Partial<AppUser>;

  return (
    isNonEmptyString(user.id) &&
    isNonEmptyString(user.employee_code) &&
    isNonEmptyString(user.name) &&
    isNonEmptyString(user.department)
  );
}

export function saveUserSession(user: AppUser) {
  if (!isBrowser()) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function getUserSession(): AppUser | null {
  if (!isBrowser()) return null;

  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isAppUser(parsed)) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return parsed;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function updateUserSession(partial: Partial<AppUser>) {
  if (!isBrowser()) return;

  const current = getUserSession();
  if (!current) return;

  saveUserSession({
    ...current,
    ...partial,
    id: current.id,
    employee_code: current.employee_code,
    role: current.role,
  });
}

export function clearUserSession() {
  if (!isBrowser()) return;
  localStorage.removeItem(SESSION_KEY);
}

export function hasRequiredRole(user: AppUser | null | undefined, roles: SessionRole[]) {
  if (!user?.role) return false;
  return roles.includes(user.role);
}

export async function refreshUserSession() {
  if (!isBrowser()) return null;

  const response = await fetch('/api/session', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    clearUserSession();
    return null;
  }

  const body = (await response.json()) as { user?: AppUser | null };
  const verifiedUser = body.user ?? null;

  if (!verifiedUser) {
    clearUserSession();
    return null;
  }

  saveUserSession(verifiedUser);
  return verifiedUser;
}
