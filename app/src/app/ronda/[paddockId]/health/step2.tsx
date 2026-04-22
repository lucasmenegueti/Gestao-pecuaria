import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SliderInput } from '@/components/ui';
import { Colors, cabecas } from '@/constants';
import { NSA, Fonts, Radius, DOMAIN } from '@/theme/nsa';

export default function HealthStep2() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const store = useRondaStore();
  const { health, updateHealth } = store;

  // Fallback: se o store não tem currentPaddockHeads hidratado (entrada direta
  // via URL ou volta do background), busca do DB. Evita mostrar "0 de 0 cabeças"
  // quando o piquete tem gado.
  const [headCountFromDb, setHeadCountFromDb] = useState<number | null>(null);
  useEffect(() => {
    if (store.currentPaddockHeads > 0 || !paddockId) return;
    db.getFirstAsync<{ total: number | null }>(
      `SELECT COALESCE(SUM(head_count), 0) as total FROM herd
       WHERE paddock_id = ? AND head_count > 0`,
      [Number(paddockId)]
    ).then((row) => setHeadCountFromDb(row?.total ?? 0));
  }, [paddockId, store.currentPaddockHeads]);

  const headCount = store.currentPaddockHeads || headCountFromDb || 0;
  const estimatedHeads = Math.round((health.affectedPct / 100) * headCount);
  const hasHeadCount = headCount > 0;

  return (
    <WizardFlow
      title="Sanidade"
      subtitle="% afetados"
      step={2}
      totalSteps={4}
      accentColor={Colors.sanidade}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/health/step3`)}
    >
      <Text style={styles.question}>Qual % dos animais afetados?</Text>
      <SliderInput
        value={health.affectedPct}
        onValueChange={(v) => updateHealth({ affectedPct: v })}
        min={0}
        max={100}
        step={1}
        unit="%"
        color={Colors.sanidade}
      />
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          {hasHeadCount
            ? `~${estimatedHeads} de ${cabecas(headCount)}`
            : 'Piquete sem gado registrado'}
        </Text>
      </View>
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 20, textAlign: 'center' },
  infoCard: { backgroundColor: DOMAIN.sanidade.tint, borderRadius: Radius.xl, padding: 16, alignItems: 'center', marginTop: 16 },
  infoText: { fontSize: 16, fontFamily: Fonts.medium, color: DOMAIN.sanidade.dot },
});
