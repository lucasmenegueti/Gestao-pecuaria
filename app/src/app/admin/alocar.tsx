import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, MultiChoice, SliderInput } from '@/components/ui';
import { Colors, PAIR_CATEGORIES } from '@/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PoolCat {
  category: string;
  total: number;
}

interface PaddockOption {
  id: number;
  name: string;
  area: number;
  current_heads: number;
  current_categories: string;
}

export default function AlocarScreen() {
  const db = useDatabase();
  const [pool, setPool] = useState<PoolCat[]>([]);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [paddocks, setPaddocks] = useState<PaddockOption[]>([]);
  const [destinoId, setDestinoId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const submittingRef = useRef(false);

  useEffect(() => {
    db.getAllAsync<PoolCat>(
      'SELECT category, SUM(head_count) AS total FROM herd WHERE paddock_id IS NULL GROUP BY category'
    ).then((rows) => {
      setPool(rows);
      setAmounts(Object.fromEntries(rows.map((r) => [r.category, 0])));
    });

    db.getAllAsync<PaddockOption>(`
      SELECT p.id, p.name, p.area_hectares AS area,
        COALESCE(SUM(h.head_count), 0) AS current_heads,
        COALESCE(GROUP_CONCAT(h.category, ', '), '') AS current_categories
      FROM paddocks p
      LEFT JOIN herd h ON h.paddock_id = p.id
      WHERE p.active = 1
      GROUP BY p.id
      ORDER BY p.name
    `).then(setPaddocks);
  }, []);

  function setAmount(cat: string, v: number) {
    setAmounts((prev) => ({ ...prev, [cat]: v }));
  }

  function fillAll() {
    setAmounts(Object.fromEntries(pool.map((p) => [p.category, p.total])));
  }

  function clearAll() {
    setAmounts(Object.fromEntries(pool.map((p) => [p.category, 0])));
  }

  const selected = Object.entries(amounts).filter(([, v]) => v > 0);
  const selectedTotal = selected.reduce((s, [, v]) => s + v, 0);
  const selectedCats = selected.map(([c]) => c);
  const nonPairMix = selectedCats.length > 1 && !selectedCats.every((c) => PAIR_CATEGORIES.has(c));

  async function handleConfirm() {
    if (!destinoId || selected.length === 0) {
      Alert.alert('Erro', 'Selecione quantidades e piquete destino.');
      return;
    }
    if (nonPairMix) {
      const ok = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Atenção',
          'Você está alocando categorias diferentes que não são vaca+bezerro mamando. Continuar?',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Continuar', onPress: () => resolve(true) },
          ]
        );
      });
      if (!ok) return;
    }
    if (submittingRef.current) {
      console.warn('[alocar] handleConfirm já em andamento — ignorando double-tap');
      return;
    }
    submittingRef.current = true;
    try {
      for (const [cat, qty] of selected) {
        // Decrementa pool
        const poolRow = await db.getFirstAsync<{ id: number; head_count: number }>(
          'SELECT id, head_count FROM herd WHERE paddock_id IS NULL AND category = ?',
          [cat]
        );
        if (!poolRow || poolRow.head_count < qty) {
          throw new Error(`Pool insuficiente para ${cat}`);
        }
        await db.runAsync('UPDATE herd SET head_count = MAX(0, head_count - ?) WHERE id = ?', [qty, poolRow.id]);
        // Upsert no destino
        const existing = await db.getFirstAsync<{ id: number }>(
          'SELECT id FROM herd WHERE paddock_id = ? AND category = ?',
          [Number(destinoId), cat]
        );
        if (existing) {
          await db.runAsync('UPDATE herd SET head_count = head_count + ? WHERE id = ?', [qty, existing.id]);
        } else {
          await db.runAsync(
            'INSERT INTO herd (paddock_id, category, head_count) VALUES (?, ?, ?)',
            [Number(destinoId), cat, qty]
          );
        }
        // Evento
        await db.runAsync(
          'INSERT INTO herd_events (paddock_id, event_type, category, head_count, target_paddock_id, date) VALUES (NULL, ?, ?, ?, ?, date(\'now\',\'localtime\'))',
          ['ALOCACAO', cat, qty, Number(destinoId)]
        );
      }
      // NÃO deletar rows com head_count=0 — preserva supabase_id pra sync UPDATE
      // em vez de INSERT (que daria UNIQUE violation e duplicar via heal).
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/rebanho');
      }
    } catch (err: any) {
      console.error('[alocar] falha', err);
      Alert.alert('Erro', err?.message || 'Falha ao alocar.');
    } finally {
      submittingRef.current = false;
    }
  }

  if (pool.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← VOLTAR</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Alocar em Piquete</Text>
        </View>
        <Text style={styles.empty}>Não há gado desalocado.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← VOLTAR</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alocar em Piquete</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>COMPOSIÇÃO DO LOTE (da pool)</Text>
        <Text style={styles.sublabel}>
          {pool.reduce((s, p) => s + p.total, 0)} cab desalocadas disponíveis
        </Text>

        <View style={styles.bulkRow}>
          <TouchableOpacity
            style={[styles.bulkBtn, styles.bulkBtnPrimary]}
            onPress={fillAll}
            activeOpacity={0.7}
          >
            <Text style={[styles.bulkBtnText, styles.bulkBtnTextPrimary]}>
              ✓ SELECIONAR TUDO
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bulkBtn, styles.bulkBtnMuted]}
            onPress={clearAll}
            activeOpacity={0.7}
          >
            <Text style={[styles.bulkBtnText, styles.bulkBtnTextMuted]}>ZERAR</Text>
          </TouchableOpacity>
        </View>

        {pool.map((c) => (
          <Card key={c.category}>
            <Text style={styles.catTitle}>
              {c.category} • disponível: {c.total}
            </Text>
            <SliderInput
              value={amounts[c.category] ?? 0}
              onValueChange={(v) => setAmount(c.category, v)}
              min={0}
              max={c.total}
              step={1}
              unit="cab"
              color={Colors.primary}
            />
          </Card>
        ))}

        <Card style={{ backgroundColor: Colors.primaryLight, marginTop: 8 }}>
          <Text style={styles.summaryText}>
            Total a alocar: <Text style={styles.summaryBold}>{selectedTotal} cab</Text>
          </Text>
          {nonPairMix && (
            <Text style={styles.warnText}>
              ⚠ Mistura de categorias não-par. Piquete geralmente tem 1 categoria.
            </Text>
          )}
        </Card>

        <Text style={[styles.label, { marginTop: 24 }]}>PIQUETE DESTINO</Text>

        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Buscar piquete..."
            placeholderTextColor="#9a9a9a"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClear} hitSlop={10}>
              <Text style={styles.searchClearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {(() => {
          const q = search.trim().toLowerCase();
          const filtered = q ? paddocks.filter((p) => p.name.toLowerCase().includes(q)) : paddocks;
          if (filtered.length === 0) {
            return <Text style={styles.noMatch}>Nenhum piquete encontrado para "{search}".</Text>;
          }
          return (
            <MultiChoice
              options={filtered.map((p) => ({
                value: String(p.id),
                label: p.name,
                description: `${p.area} ha • ${p.current_heads} cab${p.current_categories ? ` • ${p.current_categories}` : ''}`,
              }))}
              value={destinoId}
              onChange={setDestinoId}
            />
          );
        })()}

      </ScrollView>

      {/* Confirm fixo no rodapé — sempre visível, pra não precisar rolar até o fim */}
      <View style={styles.stickyFooter}>
        <Button
          title={
            selectedTotal === 0
              ? 'SELECIONE QUANTIDADE'
              : !destinoId
                ? 'ESCOLHA UM PIQUETE'
                : `CONFIRMAR · ${selectedTotal} cab`
          }
          onPress={handleConfirm}
          size="large"
          disabled={selectedTotal === 0 || !destinoId}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  back: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.white },
  scroll: { flex: 1 },
  // paddingBottom maior pra deixar espaço do sticky footer
  scrollContent: { padding: 16, paddingBottom: 100 },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
  },
  label: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 2 },
  sublabel: { fontSize: 13, color: Colors.textMuted, marginBottom: 12 },
  bulkRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  bulkBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    backgroundColor: '#fff',
  },
  bulkBtnPrimary: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  bulkBtnMuted: { borderColor: Colors.border },
  bulkBtnText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  bulkBtnTextPrimary: { color: Colors.primary },
  bulkBtnTextMuted: { color: Colors.textMuted },
  catTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  summaryText: { fontSize: 16, color: Colors.text, textAlign: 'center' },
  summaryBold: { fontWeight: '800' },
  warnText: { fontSize: 13, color: Colors.warning, marginTop: 8, textAlign: 'center', fontWeight: '600' },
  empty: { fontSize: 16, color: Colors.textMuted, textAlign: 'center', marginTop: 60 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0dcd5',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#2c2c2c' },
  searchClear: { padding: 4 },
  searchClearText: { fontSize: 18, color: '#7a7a7a', fontWeight: '700' },
  noMatch: { fontSize: 14, color: '#7a7a7a', textAlign: 'center', fontStyle: 'italic', marginTop: 8 },
});
