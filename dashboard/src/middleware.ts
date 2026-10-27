import { getIronSession } from 'iron-session';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/logout'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const response = NextResponse.next();
  const pw = process.env.SESSION_PASSWORD;
  if (!pw || pw.length < 32) {
    // Sem sessão configurada corretamente, força login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const session = await getIronSession<{ username?: string }>(request, response, {
    password: pw,
    cookieName: 'pecuaria_session',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  });

  if (!session.username) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    if (pathname !== '/' && pathname !== '/visao-geral') {
      url.searchParams.set('from', pathname + request.nextUrl.search);
    }
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Protege tudo, exceto build assets do Next e qualquer arquivo estático em /public/
  // (imagens, ícones, fontes, robots.txt). Assets precisam passar pra que a própria
  // página /login consiga mostrar o logo antes do usuário autenticar.
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|woff|woff2)$).*)',
  ],
};
