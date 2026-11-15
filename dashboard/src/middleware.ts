import { getIronSession } from 'iron-session';
import { NextResponse, type NextRequest } from 'next/server';
import { renovarSessao, revalidarNoHub } from '@/lib/auth/hub';

const PUBLIC_PATHS = ['/login', '/api/logout'];

const DAY = 60 * 60 * 24;
/** Renova quando faltar menos que isto pro JWT vencer (ele dura ~1 h). */
const RENOVAR_ANTES_MS = 5 * 60_000;
/** Revalidação no hub: no máximo 1× a cada 60 s por sessão (regra do contrato do hub). */
const CHECK_INTERVALO_MS = 60_000;

interface Sessao {
  username?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  lembrar?: boolean;
  checkAt?: number;
}

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function paraLogin(request: NextRequest, comFrom: boolean): URL {
  const { pathname } = request.nextUrl;
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  if (comFrom && pathname !== '/' && pathname !== '/visao-geral') {
    url.searchParams.set('from', pathname + request.nextUrl.search);
  }
  return url;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const pw = process.env.SESSION_PASSWORD;
  if (!pw || pw.length < 32) {
    // Sem sessão configurada corretamente, força login
    return NextResponse.redirect(paraLogin(request, false));
  }
  const opcoes = (maxAge?: number) => ({
    password: pw,
    cookieName: 'pecuaria_session',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      ...(maxAge ? { maxAge } : {}),
    },
  });

  const response = NextResponse.next();
  const lida = await getIronSession<Sessao>(request, response, opcoes());
  if (!lida.username) return NextResponse.redirect(paraLogin(request, true));

  const agora = Date.now();
  const vencido = !!lida.expiresAt && lida.expiresAt <= agora;
  const precisaRenovar = !!lida.refreshToken && !!lida.expiresAt && lida.expiresAt - agora < RENOVAR_ANTES_MS;
  const precisaCheck = !!lida.accessToken && !vencido && agora - (lida.checkAt ?? 0) > CHECK_INTERVALO_MS;
  if (!precisaRenovar && !precisaCheck) return response;

  // Daqui pra baixo o cookie é regravado. As páginas (Server Components) não podem gravar
  // cookie, então renovação e revalidação moram aqui. Prazo do cookie = o do login.
  const maxAge = lida.lembrar ? 30 * DAY : DAY;

  if (precisaRenovar) {
    const novo = await renovarSessao(lida.refreshToken!);
    if (novo) {
      // Token já vencido: a página deste request leria o cookie ANTIGO. Redireciona pra
      // mesma URL já com o cookie novo. Ainda válido: segue e o próximo request já vê o novo.
      const destino = vencido ? NextResponse.redirect(request.nextUrl.clone(), 307) : NextResponse.next();
      const s = await getIronSession<Sessao>(request, destino, opcoes(maxAge));
      s.accessToken = novo.accessToken;
      s.refreshToken = novo.refreshToken;
      s.expiresAt = novo.expiresAt;
      await s.save();
      return destino;
    }
    // Não renovou (rede, ou refresh recusado). Com o token ainda válido, segue; vencido, a
    // página manda pro login (getSessionOrRedirect).
    return response;
  }

  // Revalidação no hub (o admin tirou o acesso lá, ou a sessão não foi emitida pelo hub).
  // Hub fora/instável nunca derruba; em conta `legado` a função responde no-op.
  const veredito = await revalidarNoHub(lida.accessToken!);
  if (typeof veredito === 'object') {
    const saida = NextResponse.redirect(paraLogin(request, true));
    const s = await getIronSession<Sessao>(request, saida, opcoes());
    s.destroy();
    return saida;
  }
  const segue = NextResponse.next();
  const s = await getIronSession<Sessao>(request, segue, opcoes(maxAge));
  // 'ignorar' também carimba: sem isso, hub fora = uma chamada por request.
  s.checkAt = agora;
  await s.save();
  return segue;
}

export const config = {
  // Protege tudo, exceto build assets do Next e qualquer arquivo estático em /public/
  // (imagens, ícones, fontes, robots.txt). Assets precisam passar pra que a própria
  // página /login consiga mostrar o logo antes do usuário autenticar.
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|woff|woff2)$).*)',
  ],
};
