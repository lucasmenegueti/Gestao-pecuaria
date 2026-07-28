import { AlertCard, Card, EmptyState, KPICard, StatusPill } from '@/components/ui-primitives';
import { getSessionOrRedirect } from '@/lib/auth/session-server';
import { loadPrecosData, type EntradaEstoque } from '@/lib/precos';
import { PrecoForm } from './preco-form';
import { PackagePlus } from 'lucide-react';

export const dynamic = 'force-dynamic';

const num = (v: number, casas = 0) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

const reais = (v: number | null, casas = 2) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: casas, maximumFractionDigits: casas });

const dataBR = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

const ROTULO_ENTRADA: Record<string, string> = {
  ENTRADA_CENTRAL: 'Entrada no central',
  AJUSTE_GANHO_CENTRAL: 'Ajuste de contagem',
  SALDO_INICIAL: 'Saldo de abertura',
};

export default async function ConfiguracoesPage() {
  const session = await getSessionOrRedirect();
  const data = await loadPrecosData(session.accessToken);

  const pendentes = data.entradas.filter((e) => !e.classificada);
  const classificadas = data.entradas.filter((e) => e.classificada);
  const semCusto = data.custos.filter((c) => c.saldoSemCusto > 0);
  const valorTotal = data.custos.every((c) => c.saldoSacos === 0 || c.valorEstoque != null)
    ? data.custos.reduce((s, c) => s + (c.valorEstoque ?? 0), 0)
    : null;

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">
          Pecuária · preço da ração
        </p>
        <h1 className="mt-1 text-h2 font-semibold tracking-tight text-fg md:text-h1">Configurações</h1>
        <p className="mt-1 text-small text-fg-muted">
          Cada entrada de ração no almoxarifado recebe o preço pago. O preço vale só dali pra frente — o custo do
          que já foi consumido não muda.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPICard
          label="Entradas sem preço"
          value={pendentes.length}
          accent={pendentes.length > 0 ? 'warn' : 'ok'}
          hint={pendentes.length > 0 ? 'aguardando você' : 'tudo classificado'}
        />
        <KPICard
          label="Sacos em estoque"
          value={num(data.custos.reduce((s, c) => s + c.saldoSacos, 0))}
          hint={`${data.custos.length} fórmulas`}
        />
        <KPICard
          label="Valor do estoque"
          value={reais(valorTotal, 0)}
          hint={valorTotal == null ? 'há saco sem custo conhecido' : 'a custo médio'}
        />
        <KPICard
          label="Fórmulas custeadas"
          value={`${data.custos.filter((c) => c.custoMedio != null).length}/${data.custos.length}`}
          hint="com custo médio apurado"
        />
      </div>

      {pendentes.length > 0 ? (
        <div className="mb-6">
          <AlertCard
            kind="warning"
            title={`${pendentes.length} ${pendentes.length === 1 ? 'entrada de ração aguarda' : 'entradas de ração aguardam'} o preço`}
            body="Enquanto não forem classificadas, esses sacos entram no estoque pelo custo médio que já vigora e não alteram o preço médio. Informe o valor pago ou marque como não-compra."
          />
        </div>
      ) : null}

      {semCusto.length > 0 ? (
        <div className="mb-6">
          <AlertCard
            kind="info"
            title="Estoque sem custo conhecido"
            body={`${semCusto.map((c) => `${c.formulaName} (${num(c.saldoSemCusto)} sc)`).join(', ')} — entrou antes de qualquer preço informado. Enquanto isso, o consumo dessas fórmulas aparece sem custo na aba Consumo.`}
          />
        </div>
      ) : null}

      <div className="mb-6">
        <Card
          title="Custo médio por ração"
          subtitle="Média móvel ponderada — recalculada a cada compra precificada"
          padding=""
        >
          {data.custos.length === 0 ? (
            <EmptyState icon={PackagePlus} title="Nenhuma ração com movimento de estoque" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-grey-25 text-[11px] uppercase tracking-wider text-fg-muted">
                    <th className="px-4 py-2 text-left font-medium">Ração</th>
                    <th className="px-3 py-2 text-right font-medium">Custo médio</th>
                    <th className="px-3 py-2 text-right font-medium">R$/kg</th>
                    <th className="px-3 py-2 text-right font-medium">Saldo</th>
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.custos.map((c, i) => (
                    <tr key={c.formulaId} className={i === data.custos.length - 1 ? '' : 'border-b border-border-subtle'}>
                      <td className="px-4 py-2.5 font-medium text-fg">
                        {c.formulaName}
                        <span className="ml-1.5 text-[11px] font-normal text-fg-muted">{num(c.kgPorSaco)} kg/sc</span>
                      </td>
                      <td className="tabular px-3 py-2.5 text-right font-semibold">{reais(c.custoMedio)}</td>
                      <td className="tabular px-3 py-2.5 text-right text-fg-muted">{reais(c.custoPorKg)}</td>
                      <td className="tabular px-3 py-2.5 text-right">{num(c.saldoSacos)} sc</td>
                      <td className="tabular px-3 py-2.5 text-right">{reais(c.valorEstoque, 0)}</td>
                      <td className="px-4 py-2.5">
                        {c.entradasPendentes > 0 ? (
                          <StatusPill kind="warn" label={`${c.entradasPendentes} sem preço`} />
                        ) : c.custoMedio == null ? (
                          <StatusPill kind="neutral" label="sem custo" />
                        ) : c.saldoSemCusto > 0 ? (
                          <StatusPill kind="info" label={`${num(c.saldoSemCusto)} sc sem custo`} />
                        ) : (
                          <StatusPill kind="ok" label="Custeada" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {pendentes.length > 0 ? (
        <div className="mb-6">
          <Card
            title="Entradas aguardando preço"
            subtitle="Ajuste de contagem e saldo de abertura vêm desmarcados como compra — confirme antes de salvar"
            padding=""
          >
            <TabelaEntradas entradas={pendentes} />
          </Card>
        </div>
      ) : null}

      <Card
        title="Entradas já classificadas"
        subtitle="Corrigir aqui recalcula o custo médio dali pra frente"
        padding=""
      >
        {classificadas.length === 0 ? (
          <EmptyState icon={PackagePlus} title="Nenhuma entrada classificada ainda" />
        ) : (
          <TabelaEntradas entradas={classificadas} />
        )}
      </Card>

      <div className="mt-6 rounded-lg border border-border bg-grey-25 px-4 py-3 text-[12px] leading-relaxed text-fg-muted">
        <p className="mb-1 font-medium text-fg">Como o custo médio se forma</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>
            A cada compra precificada: <strong>novo médio = (saldo × médio atual + sacos novos × preço novo) ÷ saldo
            total</strong>. O consumo de cada dia é custeado pelo médio vigente naquela data.
          </li>
          <li>
            <strong>Ajuste de contagem</strong> não é compra: a diferença de um acerto de estoque já embute consumo não
            registrado, então tratá-la como recebimento inflaria quantidade e valor. Por isso vem desmarcada — mas se
            você lançou uma compra como ajuste (caso da entrada de 15/07), basta marcar como compra e informar o preço.
          </li>
          <li>
            Entrada sem preço entra pelo custo médio vigente e <strong>não altera</strong> o médio. Saída de rota,
            retorno e cancelamento são movimentos internos — não pedem preço.
          </li>
        </ul>
      </div>
    </main>
  );
}

function TabelaEntradas({ entradas }: { entradas: EntradaEstoque[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-[13px]">
        <thead>
          <tr className="border-b border-border bg-grey-25 text-[11px] uppercase tracking-wider text-fg-muted">
            <th className="px-4 py-2 text-left font-medium">Data</th>
            <th className="px-3 py-2 text-left font-medium">Ração</th>
            <th className="px-3 py-2 text-left font-medium">Origem</th>
            <th className="px-3 py-2 text-right font-medium">Sacos</th>
            <th className="px-4 py-2 text-right font-medium">Preço pago</th>
          </tr>
        </thead>
        <tbody>
          {entradas.map((e, i) => (
            <tr key={e.eventId} className={i === entradas.length - 1 ? '' : 'border-b border-border-subtle'}>
              <td className="whitespace-nowrap px-4 py-2.5 text-fg-muted">{dataBR(e.data)}</td>
              <td className="px-3 py-2.5 font-medium text-fg">{e.formulaName}</td>
              <td className="px-3 py-2.5">
                <div className="text-[12px] text-fg">{ROTULO_ENTRADA[e.eventType] ?? e.eventType}</div>
                {e.reason ? (
                  <div className="max-w-[260px] truncate text-[11px] text-fg-muted" title={e.reason}>
                    {e.reason}
                  </div>
                ) : null}
              </td>
              <td className="tabular px-3 py-2.5 text-right font-medium">{num(e.sacos)}</td>
              <td className="px-4 py-2.5">
                <PrecoForm
                  eventId={e.eventId}
                  precoAtual={e.precoPorSaco}
                  isPurchase={e.isPurchase}
                  classificada={e.classificada}
                  compraPorPadrao={e.compraPorPadrao}
                  precoSugerido={e.precoSugerido}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
