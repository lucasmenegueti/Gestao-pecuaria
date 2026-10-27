import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { readSessionOptions, type SessionData } from '@/lib/auth/session';

async function handle(request: Request) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    readSessionOptions(),
  );
  session.destroy();
  const url = new URL(request.url);
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const GET = handle;
export const POST = handle;
