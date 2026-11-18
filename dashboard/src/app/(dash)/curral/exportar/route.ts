import { NextResponse, type NextRequest } from 'next/server';
import writeExcelFile from 'write-excel-file/node';
import { getSessionOrRedirect } from '@/lib/auth/session-server';
import { loadCurralExport } from '@/lib/curral';
import { INICIO_OPERACAO_REAL } from '@/lib/curral-calc';
import { parsePeriodFromSearchParams } from '@/lib/period';

export const dynamic = 'force-dynamic';

const texto = (msg: string, status: number) =>
  new NextResponse(msg, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

/** Planilha das sessões e passagens do período (mesmos ?periodo/inicio/fim da tela). */
export async function GET(request: NextRequest) {
  const session = await getSessionOrRedirect();
  // Sem token do Curral, a própria tela explica o que fazer.
  if (!session.curralAccessToken) return NextResponse.redirect(new URL('/curral', request.url));

  const sp = request.nextUrl.searchParams;
  const periodo = sp.get('periodo');
  const period = periodo
    ? parsePeriodFromSearchParams({ periodo, inicio: sp.get('inicio') ?? undefined, fim: sp.get('fim') ?? undefined })
    : null;

  let abas;
  try {
    abas = await loadCurralExport(session.curralAccessToken, period ? { start: period.start, end: period.end } : undefined);
  } catch (e) {
    console.error('[curral/exportar]', e);
    return texto('Não foi possível ler o banco do Curral. Saia do dashboard, entre de novo e repita a exportação.', 502);
  }
  if (!abas) return texto('Curral não configurado: faltam CURRAL_SUPABASE_URL e CURRAL_SUPABASE_ANON_KEY.', 500);

  const cabecalho = { fontWeight: 'bold' as const, backgroundColor: '#EEEEEE' };
  const buffer = await writeExcelFile(
    abas.map((aba) => ({
      sheet: aba.nome,
      stickyRowsCount: 1,
      columns: aba.colunas.map((c) => ({ width: c.largura })),
      data: [
        aba.colunas.map((c) => ({ value: c.titulo, ...cabecalho })),
        ...aba.linhas.map((linha) =>
          linha.map((v, i) => {
            const formato = aba.colunas[i]!.formato;
            return v != null && typeof v !== 'string' && formato ? { value: v, format: formato } : v;
          }),
        ),
      ],
    })),
  ).toBuffer();

  const nome = period ? `curral_${period.start}_a_${period.end}` : `curral_desde_${INICIO_OPERACAO_REAL}`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nome}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
