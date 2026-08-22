import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/lib/db/provider';
import { BrandHeader, Card, StatusPill } from '@/components/ui';
import type { StatusKind } from '@/components/ui';
import { NSA, DOMAIN, Fonts, Radius } from '@/theme/nsa';
import { decimal, cabecas, sacos, plural } from '@/constants';
import {
  loadPaddockInfo, formatDate, formatShortDate,
  type PaddockInfo, type SituationRow,
} from '@/lib/paddock-info';

/**
 * Ficha do Piquete — retrato do piquete e do lote que está nele hoje.
 *
 * Só leitura. Cada bloco some ou vira estado vazio quando o dado não existe, de
 * propósito: nenhum piquete da fazenda tem todas as métricas ao mesmo tempo, e
 * inventar número onde falta registro seria pior do que mostrar a lacuna.
 */
export default function PaddockInfoScreen() {
  const { paddockId } = useLocalSearchParams<{ paddockId: string }>();
  const db = useDatabase();
  const [info, setInfo] = useState<PaddockInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      loadPaddockInfo(db, Number(paddockId))
        .then((r) => { if (alive) { setInfo(r); setLoading(false); } })
        .catch(() => { if (alive) setLoading(false); });
      return () => { alive = false; };
    }, [paddockId])
  );

  const context = info
    ? `${decimal(info.areaHectares)} ha · ${info.grassName}`
    : undefined;

  return (
    <View style={styles.root}>
      <BrandHeader
        title={info?.name ?? 'Piquete'}
        context={context}
        onBack={() => router.back()}
        fallback="/(tabs)/mapa"
      />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={NSA.green800} />
          </View>
        ) : !info ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>Piquete não encontrado</Text>
          </View>
        ) : (
          <>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              <LoteCard info={info} />
              {!info.isConfinement && <ConsumoCard info={info} />}
              <DesempenhoCard info={info} />
              <SituacaoCard info={info} />
              <MovimentacoesCard info={info} />
            </ScrollView>
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.footerBtn}
                onPress={() => router.push(`/ronda/${info.paddockId}/menu`)}
                activeOpacity={0.85}
              >
                <Text style={styles.footerBtnText}>Abrir ronda</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------

function SectionHead({ dot, children }: { dot: string; children: string }) {
  return (
    <View style={styles.sectionHead}>
      <View style={[styles.sectionDot, { backgroundColor: dot }]} />
      <Text style={styles.sectionLabel}>{children}</Text>
    </View>
  );
}

function Hero({ value, unit }: { value: string; unit: string }) {
  return (
    <View style={styles.hero}>
      <Text style={styles.heroNum}>{value}</Text>
      <Text style={styles.heroUnit}>{unit}</Text>
    </View>
  );
}

function Note({ tone = 'neutral', children }: { tone?: StatusKind; children: React.ReactNode }) {
  const bg = tone === 'ok' ? NSA.okBg
    : tone === 'warn' ? NSA.warnBg
    : tone === 'danger' ? NSA.dangerBg
    : tone === 'info' ? NSA.infoBg
    : NSA.bgMuted;
  const fg = tone === 'ok' ? NSA.okFg
    : tone === 'warn' ? NSA.warnFg
    : tone === 'danger' ? NSA.dangerFg
    : tone === 'info' ? NSA.infoFg
    : NSA.inkSecondary;
  return (
    <View style={[styles.note, { backgroundColor: bg }]}>
      <Text style={[styles.noteText, { color: fg }]}>{children}</Text>
    </View>
  );
}

function Duo({ items }: { items: Array<{ k: string; v: string; sub?: string }> }) {
  return (
    <View style={styles.duo}>
      {items.map((it) => (
        <View key={it.k} style={styles.duoCell}>
          <Text style={styles.duoKey}>{it.k}</Text>
          <Text style={styles.duoVal}>
            {it.v}
            {it.sub ? <Text style={styles.duoSub}> {it.sub}</Text> : null}
          </Text>
        </View>
      ))}
    </View>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------

function LoteCard({ info }: { info: PaddockInfo }) {
  if (info.heads === 0) {
    return (
      <Card>
        <SectionHead dot={DOMAIN.rebanho.dot}>LOTE ATUAL</SectionHead>
        <EmptyState
          title="Sem gado neste piquete"
          text="Nenhuma categoria alocada. Use Rebanho para mover ou alocar gado aqui."
        />
      </Card>
    );
  }

  return (
    <Card>
      <SectionHead dot={DOMAIN.rebanho.dot}>LOTE ATUAL</SectionHead>
      <Hero value={String(info.heads)} unit={plural(info.heads, 'cabeça', 'cabeças')} />
      <Text style={styles.heroSub}>
        {info.entryDate
          ? `Entrada em ${formatDate(info.entryDate)} · ${info.daysInPaddock} ${plural(info.daysInPaddock, 'dia', 'dias')} no piquete`
          : 'Sem registro de entrada no histórico'}
      </Text>

      <View style={styles.chips}>
        {info.categories.map((c) => (
          <View key={c.category} style={styles.chip}>
            <Text style={styles.chipText}>
              {c.category}  <Text style={styles.chipNum}>{c.heads}</Text>
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.hr} />
      <Duo
        items={[
          { k: 'PESO MÉDIO POR CABEÇA', v: decimal(round1(info.avgArroba)), sub: '@' },
          { k: 'EQUIVALENTE', v: `${decimal(Math.round(info.avgWeightKg))} kg` },
        ]}
      />

      <Note tone={info.usesReferenceWeight ? 'warn' : 'ok'}>
        {info.usesReferenceWeight
          ? 'Peso vindo da tabela de referência por categoria — este lote não tem pesagem registrada.'
          : 'Peso medido na ronda de Peso visual.'}
      </Note>

      {info.staggeredEntry && (
        <Note>
          Lote formado em etapas: {info.categories
            .filter((c) => c.entryDate)
            .map((c) => `${c.category} em ${formatShortDate(c.entryDate)}`)
            .join(' · ')}
        </Note>
      )}

    </Card>
  );
}

// ---------------------------------------------------------------------------

/** Cada motivo de não haver média tem seu texto — nenhum deles é "não deu". */
const SUPPLEMENT_GAP: Record<string, { title: string; text: string }> = {
  poucos_abastecimentos: {
    title: 'Precisa de dois abastecimentos',
    text: 'A média sai do intervalo entre o primeiro e o último abastecimento. Com um só não há intervalo a medir — o próximo já libera o número.',
  },
  sem_entrada: {
    title: 'Sem data de entrada do lote',
    text: 'O histórico de movimentação não mostra quando este gado chegou, então não dá pra separar o consumo deste lote do consumo de quem esteve aqui antes.',
  },
  sem_registro: {
    title: 'Sem suplemento registrado no cocho',
    text: 'Nenhuma ronda registrou saco no cocho desde a entrada deste lote.',
  },
  confinamento: {
    title: 'Trato não passa pelo app',
    text: 'No confinamento a ração não é lançada na ronda, então não há consumo a apurar aqui.',
  },
};

/**
 * A barra de consumo é relativa ao alvo da fórmula: a escala vai de 0 a 2× o
 * alvo e a faixa verde é ±20% em volta dele. Acima de 2× o marcador satura e
 * quem dá o número real é a linha do múltiplo, logo abaixo.
 */
const RATIO_SCALE = 2;
const RATIO_MIN = 0.8;
const RATIO_MAX = 1.2;

function ConsumoCard({ info }: { info: PaddockInfo }) {
  const s = info.supplement;

  return (
    <Card>
      <SectionHead dot={DOMAIN.suplementacao.dot}>CONSUMO DE SUPLEMENTO</SectionHead>

      {!s ? (
        <EmptyState
          title={SUPPLEMENT_GAP[info.supplementGap ?? 'sem_registro'].title}
          text={SUPPLEMENT_GAP[info.supplementGap ?? 'sem_registro'].text}
        />
      ) : (
        <>
          <Hero value={decimal(Math.round(s.gramsPerHeadDay))} unit="g por cabeça / dia" />
          <Text style={styles.heroSub}>
            {s.targetGramsPerHeadDay != null
              ? `Alvo da fórmula ${decimal(s.targetGramsPerHeadDay)} g/cab · `
              : ''}
            {decimal(round1(s.kgPerDay))} kg/dia no lote
          </Text>

          {s.provisional && (
            <View style={styles.pillRow}>
              <StatusPill kind="warn">
                {`${s.restockCount} abastecimentos · estimativa inicial`}
              </StatusPill>
            </View>
          )}

          {s.ratioToTarget != null ? (
            <>
              <Band ratio={s.ratioToTarget} />
              <Note
                tone={
                  s.ratioToTarget < RATIO_MIN ? 'danger'
                    : s.ratioToTarget > RATIO_MAX ? 'warn' : 'ok'
                }
              >
                {s.ratioToTarget < RATIO_MIN
                  ? `${decimal(round2(s.ratioToTarget))}× o alvo cadastrado — o cocho está recebendo menos do que a fórmula pede.`
                  : s.ratioToTarget > RATIO_MAX
                    ? `${decimal(round1(s.ratioToTarget))}× o alvo cadastrado da fórmula.`
                    : 'Dentro do alvo cadastrado da fórmula (margem de 20%).'}
              </Note>
            </>
          ) : (
            <Note tone="warn">
              A fórmula não tem alvo de consumo utilizável no cadastro — sem régua para comparar.
            </Note>
          )}

          <Note>
            Base: {sacos(s.sacksCounted)} entre {formatShortDate(s.firstDate)} e {formatShortDate(s.lastDate)}
            {s.formulaNames.length ? ` · ${s.formulaNames.join(', ')}` : ''}
          </Note>

          {s.headsCounted !== info.heads && (
            <Note>
              Dividido por {cabecas(s.headsCounted)} — bezerro mamando não entra na conta porque
              não come do cocho.
            </Note>
          )}
        </>
      )}

      {info.bombonas.length > 0 && (
        <>
          <View style={styles.hr} />
          <SectionHead dot={DOMAIN.bombona.dot}>BOMBONA</SectionHead>
          {info.bombonas.map((b) => {
            const days = s && s.kgPerDay > 0
              ? Math.floor((b.expectedSacks * b.kgPerSack) / s.kgPerDay)
              : null;
            return (
              <View key={b.inventoryId} style={styles.row}>
                <Text style={styles.rowName}>{b.formulaName}</Text>
                <Text style={styles.rowDetail}>
                  {sacos(b.expectedSacks)}
                  {days != null ? ` · ~${days} ${plural(days, 'dia', 'dias')}` : ''}
                </Text>
              </View>
            );
          })}
          {info.bombonas.some((b) => b.ledgerNegative) && (
            <Note tone="warn">
              Saiu mais ração do que a bombona recebeu — o sistema perdeu a conta. A ronda de
              Bombona corrige na próxima contagem.
            </Note>
          )}
        </>
      )}

      {s && s.events.length > 0 && (
        <>
          <View style={styles.hr} />
          <SectionHead dot={DOMAIN.suplementacao.dot}>ABASTECIMENTOS DESDE A ENTRADA</SectionHead>
          {s.events.slice(0, 8).map((e, i) => (
            <View key={`${e.date}-${i}`} style={styles.row}>
              <Text style={styles.rowDate}>{formatShortDate(e.date)}</Text>
              <Text style={styles.rowName}>{sacos(e.sacks)} no cocho</Text>
            </View>
          ))}
        </>
      )}
    </Card>
  );
}

/** Barra do alvo cadastrado, com marcador no consumo medido. */
function Band({ ratio }: { ratio: number }) {
  const clamped = Math.max(0, Math.min(RATIO_SCALE, ratio));
  return (
    <View style={styles.band}>
      <View style={styles.bandTrack}>
        <View
          style={[
            styles.bandGood,
            {
              left: `${(RATIO_MIN / RATIO_SCALE) * 100}%`,
              width: `${((RATIO_MAX - RATIO_MIN) / RATIO_SCALE) * 100}%`,
            },
          ]}
        />
        <View style={[styles.bandMark, { left: `${(clamped / RATIO_SCALE) * 100}%` }]} />
      </View>
      <View style={styles.bandLabels}>
        <Text style={styles.bandLabelText}>0</Text>
        <Text style={styles.bandLabelText}>alvo cadastrado ±20%</Text>
        <Text style={styles.bandLabelText}>2× o alvo</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------

function DesempenhoCard({ info }: { info: PaddockInfo }) {
  const g = info.gmd;
  return (
    <Card>
      <SectionHead dot={DOMAIN.peso.dot}>DESEMPENHO DO LOTE</SectionHead>

      {!g ? (
        <EmptyState
          title="Sem pesagem suficiente"
          text="O GMD precisa de duas pesagens da ronda de Peso visual feitas neste piquete desde a entrada do lote. A pesagem fica no piquete — lote que muda de lugar recomeça sem histórico."
        />
      ) : (
        <>
          <Hero value={decimal(round2(g.kgPerDay))} unit="kg por dia · GMD" />
          <Text style={styles.heroSub}>
            {g.category} · entre a primeira e a última pesagem, {g.spanDays} {plural(g.spanDays, 'dia', 'dias')}
          </Text>

          <Note tone={g.kgPerDay >= 0.4 ? 'ok' : 'warn'}>
            {g.kgPerDay >= 0.4
              ? 'Acima da meta de 0,4 kg/cab/dia para engorda a pasto.'
              : 'Abaixo da meta de 0,4 kg/cab/dia para engorda a pasto.'}
          </Note>

          <View style={styles.hr} />
          <SectionHead dot={DOMAIN.peso.dot}>PESAGENS QUE SUSTENTAM O NÚMERO</SectionHead>
          {g.anchors.map((a, i) => {
            const prev = i > 0 ? g.anchors[i - 1] : null;
            return (
              <View key={a.date} style={styles.row}>
                <Text style={styles.rowDate}>{formatShortDate(a.date)}</Text>
                <Text style={styles.rowName}>{decimal(Math.round(a.weightKg))} kg</Text>
                <Text style={styles.rowDetail}>
                  {prev
                    ? `${a.weightKg >= prev.weightKg ? '+' : ''}${decimal(Math.round(a.weightKg - prev.weightKg))} kg`
                    : a.readings > 1 ? `média de ${a.readings} leituras` : 'primeira'}
                </Text>
              </View>
            );
          })}
        </>
      )}

      {g && info.arrobaGainPerHead != null && (
        <>
          <View style={styles.hr} />
          <Duo
            items={[
              {
                k: 'GANHO POR CABEÇA',
                v: `${info.arrobaGainPerHead >= 0 ? '+' : ''}${decimal(round1(info.arrobaGainPerHead))}`,
                sub: '@',
              },
              // 30 kg por @ e ~30 dias no mês: o GMD em kg/dia é o mesmo número
              // que o ganho em @/mês. Não é coincidência que precise de conta.
              { k: 'RITMO', v: decimal(round2(g.kgPerDay)), sub: '@/mês' },
            ]}
          />
          <Note tone="ok">
            {`${g.category} · desde a primeira pesagem do lote, ${decimal(Math.round(g.totalGainKg))} kg em ${g.spanDays} ${plural(g.spanDays, 'dia', 'dias')}`}
          </Note>
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------

function SituacaoCard({ info }: { info: PaddockInfo }) {
  return (
    <Card>
      <SectionHead dot={DOMAIN.aguada.dot}>SITUAÇÃO DO PIQUETE</SectionHead>
      {info.situation.map((s) => (
        <SituationLine key={s.key} row={s} />
      ))}
      <Note>
        {info.rondaCount} {plural(info.rondaCount, 'ronda', 'rondas')}
        {info.lastRondaDate ? ` · última em ${formatShortDate(info.lastRondaDate)}` : ''}
      </Note>
    </Card>
  );
}

function SituationLine({ row }: { row: SituationRow }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowName}>{row.label}</Text>
      <Text style={styles.rowDate}>{formatShortDate(row.date)}</Text>
      <StatusPill kind={row.tone} size="sm">{row.detail}</StatusPill>
    </View>
  );
}

// ---------------------------------------------------------------------------

function MovimentacoesCard({ info }: { info: PaddockInfo }) {
  if (info.moves.length === 0) return null;
  return (
    <Card>
      <SectionHead dot={DOMAIN.rebanho.dot}>MOVIMENTAÇÕES RECENTES</SectionHead>
      {info.moves.map((m, i) => (
        <View key={`${m.date}-${i}`} style={styles.row}>
          <Text style={styles.rowDate}>{formatShortDate(m.date)}</Text>
          <Text
            style={[styles.moveArrow, { color: m.direction === 'in' ? NSA.ok : NSA.danger }]}
          >
            {m.direction === 'in' ? '↓' : '↑'}
          </Text>
          <Text style={styles.rowName}>{m.text}</Text>
        </View>
      ))}
    </Card>
  );
}

// ---------------------------------------------------------------------------

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  sectionDot: { width: 7, height: 7, borderRadius: 3.5 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    letterSpacing: 1.1,
    color: NSA.inkMuted,
  },

  hero: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  heroNum: {
    fontSize: 38,
    fontFamily: Fonts.loraBold,
    color: NSA.inkPrimary,
    letterSpacing: -0.5,
  },
  heroUnit: { fontSize: 15, fontFamily: Fonts.medium, color: NSA.inkSecondary },
  heroSub: { fontSize: 13, color: NSA.inkMuted, marginTop: 5, fontFamily: Fonts.regular },

  pillRow: { marginTop: 10, flexDirection: 'row' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  chip: {
    backgroundColor: NSA.bgMuted,
    borderWidth: 1,
    borderColor: NSA.borderSubtle,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { fontSize: 12, color: NSA.inkSecondary, fontFamily: Fonts.medium },
  chipNum: { fontFamily: Fonts.bold, color: NSA.inkPrimary },

  hr: { height: 1, backgroundColor: NSA.borderSubtle, marginVertical: 13 },

  duo: { flexDirection: 'row', gap: 12 },
  duoSpacer: { marginTop: 12 },
  duoCell: { flex: 1 },
  duoKey: {
    fontSize: 10,
    fontFamily: Fonts.semibold,
    letterSpacing: 0.7,
    color: NSA.inkMuted,
  },
  duoVal: {
    fontSize: 19,
    fontFamily: Fonts.semibold,
    color: NSA.inkPrimary,
    marginTop: 3,
  },
  duoSub: { fontSize: 12, fontFamily: Fonts.medium, color: NSA.inkSecondary },

  note: { borderRadius: Radius.lg, paddingHorizontal: 11, paddingVertical: 9, marginTop: 11 },
  noteText: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.regular },

  band: { marginTop: 13 },
  bandTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: NSA.bgMuted,
    borderWidth: 1,
    borderColor: NSA.borderSubtle,
    justifyContent: 'center',
  },
  bandGood: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: NSA.okBg,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: NSA.ok,
  },
  bandMark: {
    position: 'absolute',
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: NSA.inkPrimary,
    marginLeft: -1.5,
  },
  bandLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  bandLabelText: { fontSize: 10, color: NSA.inkMuted, fontFamily: Fonts.regular },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: NSA.borderSubtle,
  },
  rowName: { flex: 1, fontSize: 13.5, fontFamily: Fonts.medium, color: NSA.inkPrimary },
  rowDate: { fontSize: 12, color: NSA.inkMuted, fontFamily: Fonts.regular, minWidth: 42 },
  rowDetail: { fontSize: 12, color: NSA.inkMuted, fontFamily: Fonts.regular },
  moveArrow: { fontSize: 14, fontFamily: Fonts.bold, width: 12 },

  emptyTitle: { fontSize: 14.5, fontFamily: Fonts.semibold, color: NSA.inkSecondary },
  emptyText: { fontSize: 12.5, lineHeight: 18, color: NSA.inkMuted, marginTop: 5, fontFamily: Fonts.regular },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: NSA.bgElevated,
    borderTopWidth: 1,
    borderTopColor: NSA.border,
  },
  footerBtn: {
    backgroundColor: NSA.green800,
    borderRadius: Radius.xl,
    paddingVertical: 17,
    alignItems: 'center',
  },
  footerBtnText: { color: NSA.cream, fontSize: 17, fontFamily: Fonts.semibold },
});
