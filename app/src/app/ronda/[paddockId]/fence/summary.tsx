import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, PhotoButton, Button, Card, StatusPill } from '@/components/ui';
import { Colors, FENCE_CLASSIFICATION } from '@/constants';
import { loadSettings, classifyFenceWith, AppSettings, DEFAULT_SETTINGS } from '@/lib/settings';
import { NSA, Fonts } from '@/theme/nsa';

const DEFAULT_FENCE: AppSettings['fence'] = {
  voltageForte: DEFAULT_SETTINGS['fence.voltage_forte'],
  voltageAdequado: DEFAULT_SETTINGS['fence.voltage_adequado'],
  voltageFraco: DEFAULT_SETTINGS['fence.voltage_fraco'],
};

export default function FenceSummary() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const store = useRondaStore();
  const { fence } = store;
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fenceCfg, setFenceCfg] = useState<AppSettings['fence']>(DEFAULT_FENCE);

  useEffect(() => {
    loadSettings(db).then((s) => setFenceCfg(s.fence));
  }, []);

  const classification = classifyFenceWith(fence.voltage, fenceCfg);
  const classInfo = FENCE_CLASSIFICATION[classification];
  const classMinV =
    classification === 'FORTE' ? fenceCfg.voltageForte
    : classification === 'ADEQUADO' ? fenceCfg.voltageAdequado
    : classification === 'FRACO' ? fenceCfg.voltageFraco
    : 0;

  async function handleSave() {
    if (!store.currentRondaId) {
      Alert.alert('Erro', 'Ronda não iniciada. Volte pro menu e reinicie a ronda.');
      return;
    }
    setSaving(true);

    const voltageSafe = Number.isFinite(fence.voltage) ? fence.voltage : 0;
    const isElectricInt = fence.isElectric ? 1 : 0;
    const preventsMixingInt = fence.preventsMixing ? 1 : 0;
    const classificationSafe = classification || 'SEM CHOQUE';

    console.log('[summary-save]', {
      wizard: 'fence',
      rondaId: store.currentRondaId,
      voltage: fence.voltage,
      isElectric: fence.isElectric,
      preventsMixing: fence.preventsMixing,
      classification,
      photo,
      insertValues: [store.currentRondaId, voltageSafe, isElectricInt, preventsMixingInt, classificationSafe, photo],
    });

    try {
      await db.runAsync(
        'INSERT INTO fence_evals (ronda_id, voltage, is_electric, prevents_mixing, classification, photo_uri) VALUES (?, ?, ?, ?, ?, ?)',
        [store.currentRondaId, voltageSafe, isElectricInt, preventsMixingInt, classificationSafe, photo]
      );
      router.replace('/(tabs)/ronda');
    } catch (err) {
      console.error('[summary-save-error]', { wizard: 'fence', err });
      Alert.alert('Erro', 'Falha ao salvar avaliação de cerca. Tente novamente.');
    }
    setSaving(false);
  }

  return (
    <WizardFlow
      title="Cerca"
      subtitle={store.currentPaddockName || ''}
      step={3}
      totalSteps={3}
      accentColor={Colors.cerca}
      onBack={() => router.back()}
    >
      <ResultCard
        value={fence.isElectric ? `${fence.voltage.toLocaleString('pt-BR')}V` : 'N/A'}
        label={`Choque ${classification.toLowerCase()}`}
        sublabel={fence.isElectric ? `≥${classMinV.toLocaleString('pt-BR')}V` : 'Cerca não elétrica'}
        color={classInfo.color}
      />

      <Card>
        <SummaryRow label="Voltagem" value={fence.isElectric ? `${fence.voltage.toLocaleString('pt-BR')}V` : 'N/A'} />
        <View style={styles.classRow}>
          <Text style={styles.classLabel}>Classificação</Text>
          <StatusPill
            kind={classification === 'FORTE' ? 'ok' : classification === 'ADEQUADO' ? 'warn' : classification === 'FRACO' ? 'danger' : 'neutral'}
          >
            {classification.charAt(0) + classification.slice(1).toLowerCase()}
          </StatusPill>
        </View>
        <SummaryRow label="Evita mistura" value={fence.preventsMixing ? 'Sim' : 'Não'} />
      </Card>

      <Card>
        <Text style={styles.refTitle}>REFERÊNCIA</Text>
        <View style={styles.refRow}>
          <StatusPill kind="ok">Forte</StatusPill>
          <Text style={styles.refRange}>≥ {fenceCfg.voltageForte.toLocaleString('pt-BR')} V</Text>
        </View>
        <View style={styles.refRow}>
          <StatusPill kind="warn">Adequado</StatusPill>
          <Text style={styles.refRange}>
            {fenceCfg.voltageAdequado.toLocaleString('pt-BR')} – {(fenceCfg.voltageForte - 1).toLocaleString('pt-BR')} V
          </Text>
        </View>
        <View style={styles.refRow}>
          <StatusPill kind="danger">Fraco</StatusPill>
          <Text style={styles.refRange}>
            {fenceCfg.voltageFraco} – {(fenceCfg.voltageAdequado - 1).toLocaleString('pt-BR')} V
          </Text>
        </View>
        <View style={styles.refRow}>
          <StatusPill kind="neutral">Sem choque</StatusPill>
          <Text style={styles.refRange}>0 V</Text>
        </View>
      </Card>

      <PhotoButton uri={photo} onPhoto={setPhoto} />
      <Button title={saving ? 'Salvando…' : 'Finalizar'} onPress={handleSave} disabled={saving} />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  classRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: NSA.borderSubtle,
  },
  classLabel: { fontSize: 13, color: NSA.inkSecondary, fontFamily: Fonts.regular },
  refTitle: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginBottom: 10,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  refRange: { fontSize: 13, color: NSA.inkSecondary, fontFamily: Fonts.regular },
});
