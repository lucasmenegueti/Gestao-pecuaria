import 'server-only';

import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readSessionOptions, type SessionData } from './session';

/** Lê a session iron + access_token do user. Redireciona pra /login se faltar
 *  username (middleware já protege, isso é segurança extra). O middleware renova o JWT
 *  com o refresh token antes de chegar aqui; se mesmo assim estiver vencido (refresh
 *  recusado), redireciona pra /login. */
export async function getSessionOrRedirect(): Promise<{
  username: string;
  role: 'owner' | 'gestor';
  accessToken: string;
  /** Só o Curral usa. Undefined se o login lá falhou ou o token expirou. */
  curralAccessToken?: string;
}> {
  const session = await getIronSession<SessionData>(await cookies(), readSessionOptions());
  if (!session.username || !session.accessToken) {
    redirect('/login');
  }
  if (session.expiresAt && session.expiresAt < Date.now()) {
    // JWT vencido e o middleware não conseguiu renovar — força re-login.
    redirect('/login');
  }
  return {
    username: session.username,
    role: session.role ?? 'gestor',
    accessToken: session.accessToken,
    curralAccessToken:
      session.curralAccessToken && (session.curralExpiresAt ?? 0) > Date.now()
        ? session.curralAccessToken
        : undefined,
  };
}
