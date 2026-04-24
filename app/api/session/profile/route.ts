import { NextResponse } from 'next/server';

import { getErrorMessage, logError } from '@/lib/logger';
import { getServerSessionUser, setSessionCookie } from '@/lib/server-session';
import { updateUserProfile } from '@/lib/users';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    const sessionUser = await getServerSessionUser();

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      name?: string;
      department?: string;
    };

    const updatedUser = await updateUserProfile({
      id: sessionUser.id,
      employeeCode: sessionUser.employee_code,
      name: body.name ?? sessionUser.name,
      department: body.department ?? sessionUser.department,
    });

    setSessionCookie(updatedUser);

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    logError('api/session/profile:patch', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Unable to update profile.') },
      { status: 400 }
    );
  }
}
