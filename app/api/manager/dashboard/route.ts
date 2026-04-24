import { NextResponse } from 'next/server';

import { getManagerDashboardAnalytics } from '@/lib/analytics';
import { getErrorMessage, logError } from '@/lib/logger';
import { getServerSessionUser } from '@/lib/server-session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessionUser = await getServerSessionUser();

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (sessionUser.role !== 'manager' && sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const analytics = await getManagerDashboardAnalytics();
    return NextResponse.json(analytics);
  } catch (error) {
    logError('api/manager/dashboard:get', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Unable to load manager dashboard.') },
      { status: 500 }
    );
  }
}
