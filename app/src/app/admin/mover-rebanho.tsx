import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X } from 'lucide-react-native';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, SliderInput, MultiChoice, BrandHeader, SummaryRow, KeyboardAvoider } from '@/components/ui';
import { NSA, Fonts, Radius } from '@/theme/nsa';

interface PaddockOption {
  id: number;
  name: string;
}

interface Lot {
  category: string;
  head_count: number;
}

/**
 * Mover rebanho: categoria é deduzida do piquete de origem.
 *
 * - 1 categoria no piquete  → slider de quantidade + destino. Sem MultiChoice.
 * - múltiplas categorias    → default move o lote inteiro (tudo). Botão
 *   "Desagregar" abre sliders por categoria pra escolher quanto move de cada.
 *
 * Origem aceita `?paddockId=` e trava quando presente.
 */
export default function MoverRebanhoScreen() {
  const db = useDatabase();
  const params = useLocalSearchParams<{ paddockId?: string }>();
  const lockedOrigin = !!params.paddockId;

  const [fromPaddocks, setFromPaddocks] = useState<PaddockOption[]>([]);
  const [toPaddocks, setToPaddocks] = useState<PaddockOption[]>([]);
  const [fromPaddock, setFromPaddock] = useState<string | null>(params.paddockId ?? null);
  const [toPaddock, setToPaddock] = useState<string | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [disaggregate, setDisaggregate] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [destSearch, setDestSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    db.getAllAsync<PaddockOption>(`
      SELECT DISTINCT p.id, p.name FROM paddocks p
      JOIN herd h ON h.paddock_id = p.id
      WHERE p.active = 1 AND h.head_count > 0 AND h.deleted_at IS NULL
      ORDER BY p.name
    `).then(setFromPaddocks);
    db.getAllAsync<PaddockOption>(
      'SELECT id, name FROM paddocks WHERE active=1 ORDER BY name'
    ).then(setToPaddocks);
  }, []);

  useEffect(() => {
    if (!fromPaddock) {
      setLots([]);
      setAmounts({});
      return;
    }
    db.getAllAsync<Lot>(
      'SELECT category, head_count FROM herd WHERE paddock_id = ? AND head_count > 0 AND deleted_at IS NULL ORDER BY category',
      [Number(fromPaddock)]
    ).then((rows) => {
      setLots(rows);
      // Default: move tudo de cada lote
      const init: Record<string, number> = {};
      for (const l of rows) init[l.category] = l.head_count;
      setAmounts(init);
      setDisaggregate(false);
    });
  }, [fromPaddock]);

  const fromName = fromPaddocks.find((p) => String(p.id) === fromPaddock)?.name ?? '';
  const singleCat = lots.length === 1 ? lots[0] : null;

  const selectedEntries = Object.entries(amounts).filter(([, v]) => v > 0);
  const selectedTotal = selectedEntries.reduce((s, [, v]) => s + v, 0);

  function setAmount(cat: string, v: number) {
    setAmounts((prev) => ({ ...prev, [cat]: v }));
  }

  async function handleMove() {
    if (submittingRef.current) return;
    if (!fromPaddock || !toPaddock || selectedTotal <= 0) return;
    if (fromPaddock === toPaddock) {
      Alert.alert('Erro', 'Origem e destino devem ser diferentes');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      for (const [cat, qty] of selectedEntries) {
        await db.runAsync(
          'UPDATE herd SET head_count = MAX(0, head_count - ?) WHERE paddock_id = ? AND category = ?',
          [qty, Number(fromPaddock), cat]
        );
        const existing = await db.getFirstAsync<{ id: number }>(
          'SELECT id FROM herd WHERE paddock_id = ? AND category = ?',
          [Number(toPaddock), cat]
        );
        if (existing) {
          await db.runAsync('UPDATE herd SET head_count = head_count + ? WHERE id = ?', [qty, existing.id]);
        } else {
          await db.runAsync(
            'INSERT INTO herd (paddock_id, category, head_count) VALUES (?, ?, ?)',
            [Number(toPaddock), cat, qty]
          );
        }
        await db.runAsync(
          `INSERT INTO herd_events (paddock_id, event_type, category, head_count, target_paddock_id, date)
           VALUES (?, 'TRANSFERENCIA', ?, ?, ?, date('now','localtime'))`,
          [Number(fromPaddock), cat, qty, Number(toPaddock)]
        );
      }
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/rebanho');
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Falha ao mover rebanho');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const q = destSearch.trim().toLowerCase();
  const filteredDest = toPaddocks.filter((p) =>
    String(p.id) !== fromPaddock && (!q || p.name.toLowerCase().includes(q))
  );

  return (
    <View style={styles.root}>
      <BrandHeader title="Mover rebanho" context="Rebanho" onBack={() => router.back()} />
      <KeyboardAvoider>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>DE (origem)</Text>
        {lockedOrigin && fromName ? (
          <View style={styles.lockedOrigin}>
            <Text style={styles.lockedOriginValue}>{fromName}</Text>
          </View>
        ) : (
          <MultiChoice
            options={fromPaddocks.map((p) => ({ value: String(p.id), label: p.name }))}
            value={fromPaddock}
            onChange={setFromPaddock}
          />
        )}

        {fromPaddock && lots.length === 0 && (
          <Text style={[styles.sublabel, { marginTop: 14 }]}>Piquete sem gado.</Text>
        )}

        {singleCat && (
          <>
            <Text style={[styles.label, { marginTop: 22 }]}>QUANTIDADE</Text>
            <Text style={styles.sublabel}>
              {singleCat.category} · {singleCat.head_count} cab disponível
            </Text>
            <Card>
              <SliderInput
                value={amounts[singleCat.category] ?? 0}
                onValueChange={(v) => setAmount(singleCat.category, v)}
                min={1}
                max={singleCat.head_count}
                step={1}
                unit="cab"
              />
            </Card>
          </>
        )}

        {!singleCat && lots.length > 1 && (
          <>
            <Text style={[styles.label, { marginTop: 22 }]}>LOTE</Text>
            {!disaggregate ? (
              <>
                <Text style={styles.sublabel}>Movendo o lote inteiro</Text>
                <Card>
                  {lots.map((l) => (
                    <SummaryRow key={l.category} label={l.category} value={`${l.head_count} cab`} />
                  ))}
                  <Button
                    title="Desagregar por categoria"
                    variant="outline"
                    onPress={() => setDisaggregate(true)}
                    style={{ marginTop: 10 }}
                  />
                </Card>
              </>
            ) : (
              <>
                <Text style={styles.sublabel}>Ajuste quanto de cada categoria move</Text>
                {lots.map((l) => (
                  <Card key={l.category}>
                    <Text style={styles.lotTitle}>
                      {l.category} · disponível {l.head_count}
                    </Text>
                    <SliderInput
                      value={amounts[l.category] ?? 0}
                      onValueChange={(v) => setAmount(l.category, v)}
                      min={0}
                      max={l.head_count}
                      step={1}
                      unit="cab"
                    />
                  </Card>
                ))}
                <Button
                  title="Mover o lote inteiro"
                  variant="outline"
                  onPress={() => {
                    const init: Record<string, number> = {};
                    for (const l of lots) init[l.category] = l.head_count;
                    setAmounts(init);
                    setDisaggregate(false);
                  }}
                />
              </>
            )}
          </>
        )}

        {lots.length > 0 && (
          <>
            <Text style={[styles.label, { marginTop: 22 }]}>PARA (destino)</Text>
            <View style={styles.searchWrap}>
              <Search size={16} color={NSA.inkMuted} strokeWidth={1.75} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar piquete"
                placeholderTextColor={NSA.inkDisabled}
                value={destSearch}
                onChangeText={setDestSearch}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {destSearch.length > 0 && (
                <TouchableOpacity onPress={() => setDestSearch('')} hitSlop={10} style={styles.searchClear}>
                  <X size={14} color={NSA.inkMuted} strokeWidth={1.75} />
                </TouchableOpacity>
              )}
            </View>
            {filteredDest.length === 0 ? (
              <Text style={styles.noMatch}>Nenhum piquete encontrado{q ? ` para "${destSearch}"` : ''}.</Text>
            ) : (
              <MultiChoice
                options={filteredDest.map((p) => ({ value: String(p.id), label: p.name }))}
                value={toPaddock}
                onChange={setToPaddock}
              />
            )}
          </>
        )}
      </ScrollView>

      {lots.length > 0 && (
        <SafeAreaView edges={['bottom']} style={styles.stickyFooter}>
          <Button
            title={
              selectedTotal === 0
                ? 'Ajuste a quantidade'
                : !toPaddock
                  ? 'Escolha o destino'
                  : submitting ? 'Movendo…' : `Mover · ${selectedTotal} cab`
            }
            onPress={handleMove}
            disabled={submitting || selectedTotal === 0 || !toPaddock}
          />
        </SafeAreaView>
      )}
      </KeyboardAvoider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 110 },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: NSA.bgElevated,
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: NSA.border,
  },
  label: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginBottom: 2,
  },
  sublabel: { fontSize: 12, color: NSA.inkMuted, marginBottom: 12, fontFamily: Fonts.regular },
  lockedOrigin: {
    backgroundColor: NSA.green50,
    padding: 12,
    borderRadius: Radius.lg,
  },
  lockedOriginValue: { fontSize: 16, fontFamily: Fonts.semibold, color: NSA.inkPrimary, letterSpacing: -0.15 },
  lotTitle: { fontSize: 13, fontFamily: Fonts.medium, color: NSA.inkPrimary, marginBottom: 6 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: NSA.bgElevated,
    borderWidth: 1,
    borderColor: NSA.borderStrong,
    borderRadius: Radius.lg,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: NSA.inkPrimary, fontFamily: Fonts.regular },
  searchClear: { padding: 4 },
  noMatch: { fontSize: 13, color: NSA.inkMuted, textAlign: 'center', marginTop: 8, fontFamily: Fonts.regular },
});
