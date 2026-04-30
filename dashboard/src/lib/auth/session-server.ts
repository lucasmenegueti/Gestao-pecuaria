import 'server-only';

import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readSessionOptions, type SessionData } from './session';

/** Lê a session iron + access_token do user. Redireciona pra /login se faltar
 *  username (middleware já protege, isso é segurança extra). Se o JWT expirou,
 *  redireciona pra /login pra o user re-autenticar. */
export async function getSessionOrRedirect(): Promise<{
  username: string;
  role: 'owner' | 'gestor';
  accessToken: string;
}> {
  const session = await getIronSession<SessionData>(await cookies(), readSessionOptions());
  if (!session.username || !session.accessToken) {
    redirect('/login');
  }
  if (session.expiresAt && session.expiresAt < Date.now()) {
    // JWT expirou — força re-login. (refresh-token flow é uma melhoria futura.)
    redirect('/login');
  }
  return {
    username: session.username,
    role: session.role ?? 'gestor',
    accessToken: session.accessToken,
  };
}
