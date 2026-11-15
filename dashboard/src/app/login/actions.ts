'use server';

import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildSessionOptions, type SessionData } from '@/lib/auth/session';
import { signInCurral, verifyCredentials } from '@/lib/auth/users-lookup';

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

  const r = await verifyCredentials(username, password);
  if (!r.ok) {
    return { error: r.mensagem, username };
  }
  const user = r.user;

  const session = await getIronSession<SessionData>(
    await cookies(),
    buildSessionOptions(remember),
  );
  session.username = user.username;
  session.role = user.role;
  session.loggedAt = Date.now();
  session.accessToken = user.accessToken;
  session.refreshToken = user.refreshToken;
  session.expiresAt = user.expiresAt;
  session.lembrar = remember;
  session.checkAt = Date.now();
  const curral = await signInCurral(username, password);
  session.curralAccessToken = curral?.accessToken;
  session.curralExpiresAt = curral?.expiresAt;
  try {
    await session.save();
  } catch (e) {
    // Dois JWTs deixam o cookie perto do teto de 4 KB do iron-session.
    // Se estourar, entra sem o Curral em vez de derrubar o login.
    console.error('[auth] sessão com o token do Curral não coube no cookie:', e);
    session.curralAccessToken = undefined;
    session.curralExpiresAt = undefined;
    await session.save();
  }

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
