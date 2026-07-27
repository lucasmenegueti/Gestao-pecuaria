import { DashHeader } from '@/components/dash-header';
import { AlertCard, Card, EmptyState, KPICard } from '@/components/ui-primitives';
import { loadConsumoData, type LoteConsumo, type PiqueteConsumo } from '@/lib/consumo';
import { KG_PESO_VIVO_POR_ARROBA, RENDIMENTO_CARCACA } from '@/lib/precos-racao';
import { parsePeriodFromSearchParams } from '@/lib/period';
import { getSessionOrRedirect } from '@/lib/auth/session-server';
import { Wheat } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ periodo?: string; inicio?: string; fim?: string }>;
}

export const dynamic = 'force-dynamic';

const num = (v: number, casas = 0) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

const opt = (v: number | null, casas = 0, sufixo = '') =>
  v == null ? '—' : `${num(v, casas)}${sufixo}`;

const reais = (v: number | null) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default async function ConsumoPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = parsePeriodFromSearchParams(params, '30d');
  const session = await getSessionOrRedirect();
  const data = await loadConsumoData(period, session.accessToken);

  const comConsumo = data.piquetes.filter((p) => p.kg > 0);
  const semConsumo = data.piquetes.filter((p) => p.kg === 0 && p.cabecasDia > 0);
  // Talhão que entra no R$/@ mas não ganhou peso: puxa o custo por arroba pra cima.
  const talhoesGmdZero = data.piquetes.filter((p) => p.kg > 0 && p.arrobas === 0).length;
  const { kpis } = data;

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <DashHeader
        eyebrow={`Pecuária · ${data.dias} dias · ${data.porFormula.length} fórmulas · ${comConsumo.length} talhões`}
        title="Consumo & Custo da Arroba"
        period={period}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KPICard label="Sacos no cocho" value={num(kpis.sacos)} hint={`${num(kpis.kg)} kg`} />
        <KPICard label="Cabeças médias" value={num(kpis.cabecasMedias)} hint={`${num(kpis.cabecasDia)} cabeças·dia`} />
        <KPICard
          label="Consumo por cabeça"
          value={opt(kpis.gPorCabDia)}
          unit="g/dia"
          hint="média dos talhões que receberam ração"
        />
        <KPICard label="Custo da ração" value={reais(kpis.custo)} hint={kpis.custo == null ? 'preço não cadastrado' : `${data.dias} dias`} />
        <KPICard
          label="Arrobas ganhas"
          value={opt(kpis.arrobas, 1)}
          unit="@"
          hint={`${kpis.piquetesComGmd} talhões com peso visual`}
        />
        <KPICard
          label="Custo por arroba"
          value={reais(kpis.custoPorArroba)}
          accent={kpis.custoPorArroba == null ? undefined : 'ok'}
          hint={
            kpis.piquetesComCustoPorArroba === 0
              ? 'nenhum talhão com ração e peso visual'
              : `só suplementação · ${kpis.piquetesComCustoPorArroba} talhões` +
                (talhoesGmdZero > 0 ? ` (${talhoesGmdZero} com GMD zero)` : '')
          }
        />
      </div>

      {data.formulasSemPreco.length > 0 ? (
        <div className="mb-6">
          <AlertCard
            kind="info"
            title="Preço da ração não cadastrado"
            body={`Sem R$/saco, as colunas de custo e R$/@ ficam em "—". Preencha em src/lib/precos-racao.ts: ${data.formulasSemPreco.join(', ')}.`}
          />
        </div>
      ) : null}

      {data.avisos.length > 0 ? (
        <div className="mb-6 flex flex-col gap-2">
          {data.avisos.map((a, i) => (
            <AlertCard key={i} kind="warning" title="Atenção no cálculo" body={a} />
          ))}
        </div>
      ) : null}

      <div className="mb-6">
        <Card title="Consumo por ração" subtitle="Sacos colocados no cocho no período" padding="">
          {data.porFormula.length === 0 ? (
            <EmptyState icon={Wheat} title="Nenhuma reposição no período" body="Ajuste o período no seletor acima." />
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-grey-25 text-[11px] uppercase tracking-wider text-fg-muted">
                  <th className="px-4 py-2 text-left font-medium">Ração</th>
                  <th className="px-4 py-2 text-right font-medium">Sacos</th>
                  <th className="px-4 py-2 text-right font-medium">Kg</th>
                  <th className="px-4 py-2 text-right font-medium">% do total</th>
                  <th className="px-4 py-2 text-right font-medium">Custo</th>
                </tr>
              </thead>
              <tbody>
                {data.porFormula.map((f, i) => (
                  <tr key={f.formulaId} className={i === data.porFormula.length - 1 ? '' : 'border-b border-border-subtle'}>
                    <td className="px-4 py-2.5 font-medium text-fg">{f.formulaName}</td>
                    <td className="tabular px-4 py-2.5 text-right font-medium">{num(f.sacos, 1)}</td>
                    <td className="tabular px-4 py-2.5 text-right">{num(f.kg)}</td>
                    <td className="tabular px-4 py-2.5 text-right text-fg-muted">
                      {kpis.kg > 0 ? `${num((f.kg / kpis.kg) * 100)}%` : '—'}
                    </td>
                    <td className="tabular px-4 py-2.5 text-right">{reais(f.custo)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-grey-25 font-semibold">
                  <td className="px-4 py-2.5">Total</td>
                  <td className="tabular px-4 py-2.5 text-right">{num(kpis.sacos, 1)}</td>
                  <td className="tabular px-4 py-2.5 text-right">{num(kpis.kg)}</td>
                  <td className="px-4 py-2.5" />
                  <td className="tabular px-4 py-2.5 text-right">{reais(kpis.custo)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </Card>
      </div>

      <div className="mb-6">
        <Card
          title="Conferência: saiu do estoque × registrado no cocho"
          subtitle="O consumo desta página vem do registro da ronda. O que saiu do almoxarifado e não foi registrado não entra na conta."
          padding=""
        >
          {data.cobertura.length === 0 ? (
            <EmptyState icon={Wheat} title="Sem movimentação de estoque no período" />
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-grey-25 text-[11px] uppercase tracking-wider text-fg-muted">
                  <th className="px-4 py-2 text-left font-medium">Ração</th>
                  <th className="px-4 py-2 text-right font-medium">Saiu do estoque</th>
                  <th className="px-4 py-2 text-right font-medium">Registrado no cocho</th>
                  <th className="px-4 py-2 text-right font-medium">Cobertura</th>
                </tr>
              </thead>
              <tbody>
                {data.cobertura.map((c, i) => (
                  <tr key={c.formulaName} className={i === data.cobertura.length - 1 ? '' : 'border-b border-border-subtle'}>
                    <td className="px-4 py-2.5 text-fg">{c.formulaName}</td>
                    <td className="tabular px-4 py-2.5 text-right">{num(c.saidaEstoque)} sc</td>
                    <td className="tabular px-4 py-2.5 text-right">{num(c.registradoNoCocho)} sc</td>
                    <td className={`tabular px-4 py-2.5 text-right font-medium ${
                      c.cobertura == null ? 'text-fg-muted'
                        : c.cobertura < 0.6 ? 'text-warning' : ''
                    }`}>
                      {c.cobertura == null ? '—' : `${num(c.cobertura * 100)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="border-t border-border-subtle px-4 py-2.5 text-[12px] leading-relaxed text-fg-muted">
            Cobertura baixa é esperada nas rações de confinamento (tratadas direto, sem ronda de cocho) e em baixas por
            contagem de inventário, que consolidam vários dias de uma vez. Nas rações de pasto, cobertura bem abaixo de
            100% indica reposição acontecendo sem registro na ronda — e aí o consumo por cabeça desta página é um piso,
            não a média real.
          </p>
        </Card>
      </div>

      <Card
        title="Por talhão e por lote"
        subtitle="Linha em negrito = talhão · linhas abaixo = lotes (consumo rateado pelo peso vivo do lote)"
        padding=""
      >
        {comConsumo.length === 0 ? (
          <EmptyState icon={Wheat} title="Nenhum talhão recebeu ração no período" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-[13px]">
              <thead>
                <tr className="border-b border-border bg-grey-25 text-[11px] uppercase tracking-wider text-fg-muted">
                  <th className="px-4 py-2 text-left font-medium">Talhão / lote</th>
                  <th className="px-3 py-2 text-right font-medium">Cab. médias</th>
                  <th className="px-3 py-2 text-right font-medium">Peso méd.</th>
                  <th className="px-3 py-2 text-right font-medium">Sacos</th>
                  <th className="px-3 py-2 text-right font-medium">Kg</th>
                  <th className="px-3 py-2 text-right font-medium">g/cab/dia</th>
                  <th className="px-3 py-2 text-right font-medium">g/kg PV</th>
                  <th className="px-3 py-2 text-right font-medium">GMD</th>
                  <th className="px-3 py-2 text-right font-medium">@ ganhas</th>
                  <th className="px-3 py-2 text-right font-medium">Custo</th>
                  <th className="px-4 py-2 text-right font-medium">R$/@</th>
                </tr>
              </thead>
              <tbody>
                {comConsumo.map((p) => (
                  <LinhasDoTalhao key={p.paddockId} piquete={p} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {semConsumo.length > 0 ? (
        <p className="mt-3 text-[12px] leading-relaxed text-fg-muted">
          <span className="font-medium text-fg">{semConsumo.length} talhões com gado não tiveram reposição de cocho</span>{' '}
          registrada no período ({num(semConsumo.reduce((s, p) => s + p.cabecasMedias, 0))} cabeças médias):{' '}
          {semConsumo.slice(0, 15).map((p) => p.paddockName).join(', ')}
          {semConsumo.length > 15 ? ` e outros ${semConsumo.length - 15}` : ''}.
        </p>
      ) : null}

      <div className="mt-6 rounded-lg border border-border bg-grey-25 px-4 py-3 text-[12px] leading-relaxed text-fg-muted">
        <p className="mb-1 font-medium text-fg">Como a conta é feita</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>
            <strong>Consumo</strong> = sacos que o peão registrou ter colocado no cocho na ronda
            (&ldquo;abasteceu o cocho&rdquo;), × kg/saco da fórmula. Não conta o que foi entregue na bombona e
            ainda não foi pro cocho.
          </li>
          <li>
            <strong>Cabeças·dia</strong> = soma das cabeças presentes em cada dia do período, reconstruída dia a dia a
            partir do rebanho de hoje desfazendo as movimentações (transferência, alocação, morte, nascimento). É o
            denominador de tudo — talhão que ficou só metade do período com gado não é penalizado.
          </li>
          <li>
            <strong>Rateio por lote</strong> é estimado: o cocho é do talhão, não do lote. A divisão é proporcional ao
            peso vivo acumulado de cada lote (cabeças·dia × peso médio), então bezerro mamando puxa menos que vaca.
          </li>
          <li>
            <strong>GMD</strong> vem da avaliação de peso visual da ronda, usando o intervalo real entre a pesagem
            anterior e a atual. Sem peso visual com referência anterior no período, GMD, @ e R$/@ ficam em &ldquo;—&rdquo;
            — nada é interpolado.
          </li>
          <li>
            <strong>Arroba</strong> = {num(KG_PESO_VIVO_POR_ARROBA)} kg de peso vivo ganho ({num(RENDIMENTO_CARCACA * 100)}% de
            rendimento de carcaça). <strong>R$/@</strong> considera só o custo da suplementação — não é custo total de
            produção — e o R$/@ da fazenda só entra talhão que tem as duas pontas: ração no cocho e peso visual medido.
          </li>
          <li>
            Talhão com <strong>GMD zero</strong> (peso visual igual ao anterior) entra com o custo mas sem arroba: se o
            ganho zero for erro de medição, o R$/@ sobe artificialmente. Confira a coluna GMD antes de decidir.
          </li>
        </ul>
      </div>
    </main>
  );
}

function LinhasDoTalhao({ piquete: p }: { piquete: PiqueteConsumo }) {
  const lotes = p.lotes.filter((l) => l.cabecasDia > 0);
  return (
    <>
      <tr className="border-b border-border-subtle bg-grey-25/60">
        <td className="px-4 py-2.5">
          <div className="font-semibold text-fg">{p.paddockName}</div>
          <div className="text-[11px] text-fg-muted">
            {p.formulas.map((f) => f.formulaName).join(' · ') || '—'}
          </div>
        </td>
        <td className="tabular px-3 py-2.5 text-right font-medium">{num(p.cabecasMedias)}</td>
        <td className="px-3 py-2.5" />
        <td className="tabular px-3 py-2.5 text-right font-medium">{num(p.sacos, 1)}</td>
        <td className="tabular px-3 py-2.5 text-right">{num(p.kg)}</td>
        <td className="tabular px-3 py-2.5 text-right font-semibold text-fg">{opt(p.gPorCabDia)}</td>
        <td className="tabular px-3 py-2.5 text-right">{opt(p.gPorKgPvDia, 2)}</td>
        <td className="tabular px-3 py-2.5 text-right">{opt(p.gmd, 2)}</td>
        <td className="tabular px-3 py-2.5 text-right">{opt(p.arrobas, 1)}</td>
        <td className="tabular px-3 py-2.5 text-right">{reais(p.custo)}</td>
        <td className="tabular px-4 py-2.5 text-right font-semibold">{reais(p.custoPorArroba)}</td>
      </tr>
      {lotes.map((l) => (
        <LinhaDoLote key={l.key} lote={l} />
      ))}
    </>
  );
}

function LinhaDoLote({ lote: l }: { lote: LoteConsumo }) {
  return (
    <tr className="border-b border-border-subtle text-fg-muted">
      <td className="py-2 pl-8 pr-4">
        <span className="text-[12px]">{l.category}</span>
        <span className="ml-1.5 text-[11px] opacity-70">{num(l.fracao * 100)}% do cocho</span>
      </td>
      <td className="tabular px-3 py-2 text-right">{num(l.cabecasMedias)}</td>
      <td className="tabular px-3 py-2 text-right">{num(l.pesoMedioKg)} kg</td>
      <td className="tabular px-3 py-2 text-right">{num(l.sacos, 1)}</td>
      <td className="tabular px-3 py-2 text-right">{num(l.kg)}</td>
      <td className="tabular px-3 py-2 text-right">{opt(l.gPorCabDia)}</td>
      {/* % do PV é igual pra todo lote do talhão — o rateio é proporcional ao peso vivo. */}
      <td className="px-3 py-2" />
      <td className="tabular px-3 py-2 text-right">{opt(l.gmd, 2)}</td>
      <td className="tabular px-3 py-2 text-right">{opt(l.arrobas, 1)}</td>
      <td className="tabular px-3 py-2 text-right">{reais(l.custo)}</td>
      <td className="tabular px-4 py-2 text-right">{reais(l.custoPorArroba)}</td>
    </tr>
  );
}
