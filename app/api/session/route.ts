import { NextResponse } from 'next/server';

import { getErrorMessage, logError } from '@/lib/logger';
import { clearSessionCookie, getServerSessionUser, setSessionCookie } from '@/lib/server-session';
import { signInOrCreateUser } from '@/lib/users';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getServerSessionUser();

    if (!user) {
      clearSessionCookie();
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    logError('api/session:get', error);
    clearSessionCookie();
    return NextResponse.json(
      { error: getErrorMessage(error, 'Unable to load session.') },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      employeeCode?: string;
      name?: string;
      department?: string;
    };

    const user = await signInOrCreateUser({
      employeeCode: body.employeeCode ?? '',
      name: body.name ?? '',
      department: body.department ?? '',
    });

    setSessionCookie(user);

    return NextResponse.json({ user });
  } catch (error) {
    logError('api/session:post', error);
    clearSessionCookie();
    return NextResponse.json(
      { error: getErrorMessage(error, 'Unable to sign in.') },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
