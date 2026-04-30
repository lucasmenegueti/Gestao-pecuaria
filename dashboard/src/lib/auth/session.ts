import 'server-only';

import type { SessionOptions } from 'iron-session';

export interface SessionData {
  username?: string;
  role?: 'owner' | 'gestor';
  /** Timestamp (ms) de quando foi criada — pra debug/telemetria futura */
  loggedAt?: number;
  /** JWT de acesso do Supabase Auth — usado nas queries do dashboard
   *  porque RLS bloqueia anon. Expira em ~1h (default). */
  accessToken?: string;
  /** Refresh token pra renovar accessToken sem novo login. */
  refreshToken?: string;
  /** Unix timestamp (ms) em que o accessToken expira. */
  expiresAt?: number;
}

const DAY = 60 * 60 * 24;
export const SESSION_MAX_AGE_DEFAULT = DAY; // 24h sem "lembrar"
export const SESSION_MAX_AGE_REMEMBER = 30 * DAY; // 30 dias com "lembrar"

function getPassword(): string {
  const pw = process.env.SESSION_PASSWORD;
  if (!pw || pw.length < 32) {
    throw new Error(
      'SESSION_PASSWORD não definida ou curta demais (precisa de 32+ chars) em .env.local',
    );
  }
  return pw;
}

export function buildSessionOptions(remember: boolean): SessionOptions {
  return {
    password: getPassword(),
    cookieName: 'pecuaria_session',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: remember ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_DEFAULT,
    },
  };
}

/** Versão "read-only" — sem maxAge, pra ler cookie existente sem sobrescrever. */
export function readSessionOptions(): SessionOptions {
  return {
    password: getPassword(),
    cookieName: 'pecuaria_session',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  };
}
