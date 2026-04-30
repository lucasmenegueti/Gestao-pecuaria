'use server';

import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildSessionOptions, type SessionData } from '@/lib/auth/session';
import { verifyCredentials } from '@/lib/auth/users-lookup';

export interface LoginState {
  error?: string;
  username?: string;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const remember = formData.get('remember') === 'on';
  const from = String(formData.get('from') ?? '');

  if (!username || !password) {
    return { error: 'Preencha usuário e senha.', username };
  }

  const user = await verifyCredentials(username, password);
  if (!user) {
    return { error: 'Usuário ou senha inválidos.', username };
  }

  const session = await getIronSession<SessionData>(
    await cookies(),
    buildSessionOptions(remember),
  );
  session.username = user.username;
  session.role = user.role;
  session.loggedAt = Date.now();
  await session.save();

  const target = sanitizeFrom(from) ?? '/visao-geral';
  redirect(target);
}

/** Aceita só paths internos. Evita open-redirect. */
function sanitizeFrom(from: string): string | null {
  if (!from) return null;
  if (!from.startsWith('/')) return null;
  if (from.startsWith('//')) return null;
  if (from.startsWith('/login')) return null;
  return from;
}
