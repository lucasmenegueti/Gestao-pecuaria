import { NextResponse, type NextRequest } from 'next/server';
import writeExcelFile from 'write-excel-file/node';
import { getSessionOrRedirect } from '@/lib/auth/session-server';
import { loadCurralExport } from '@/lib/curral';
import { INICIO_OPERACAO_REAL } from '@/lib/curral-calc';
import { parsePeriodFromSearchParams } from '@/lib/period';

export const dynamic = 'force-dynamic';

/** "2026-11-15_lote-x" a partir da aba Sessão — ASCII, para o cabeçalho do download. */
function nomeSessao(abas: Array<{ linhas: unknown[][] }>): string {
  const valor = (item: string) => String(abas[0]?.linhas.find((l) => l[1] === item)?.[2] ?? '');
  const data = valor('Data').split('/').reverse().join('-');
  const lote = valor('Lote')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return [data, lote].filter(Boolean).join('_');
}

const texto = (msg: string, status: number) =>
  new NextResponse(msg, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

/**
 * Planilha do que a tela mostra: com ?sessao=, só aquela sessão; sem, o
 * período (mesmos ?periodo/inicio/fim da tela).
 */
export async function GET(request: NextRequest) {
  const session = await getSessionOrRedirect();
  // Sem token do Curral, a própria tela explica o que fazer.
  if (!session.curralAccessToken) return NextResponse.redirect(new URL('/curral', request.url));

  const sp = request.nextUrl.searchParams;
  const periodo = sp.get('periodo');
  const period = periodo
    ? parsePeriodFromSearchParams({ periodo, inicio: sp.get('inicio') ?? undefined, fim: sp.get('fim') ?? undefined })
    : null;

  const sessaoId = sp.get('sessao') ?? undefined;
  const rotulo = period ? period.label : `Todas as sessões desde ${INICIO_OPERACAO_REAL.split('-').reverse().join('/')}`;

  let abas;
  try {
    abas = await loadCurralExport(
      session.curralAccessToken,
      period ? { start: period.start, end: period.end } : undefined,
      rotulo,
      sessaoId,
    );
  } catch (e) {
    console.error('[curral/exportar]', e);
    return texto('Não foi possível ler o banco do Curral. Saia do dashboard, entre de novo e repita a exportação.', 502);
  }
  if (!abas) return texto('Curral não configurado: faltam CURRAL_SUPABASE_URL e CURRAL_SUPABASE_ANON_KEY.', 500);
  if (abas === 'nao-encontrada') {
    return texto('Sessão não encontrada: pode ter sido excluída no app, ou ser uma sessão de teste.', 404);
  }

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

  const nome = sessaoId
    ? `curral_sessao_${nomeSessao(abas)}`
    : period
      ? `curral_${period.start}_a_${period.end}`
      : `curral_desde_${INICIO_OPERACAO_REAL}`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nome}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
