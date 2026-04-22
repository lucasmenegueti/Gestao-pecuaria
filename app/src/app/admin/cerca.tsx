import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, SliderInput, BrandHeader, StatusPill } from '@/components/ui';
import { loadSettings, setSetting, classifyFenceWith, AppSettings } from '@/lib/settings';
import { NSA, Fonts } from '@/theme/nsa';

export default function CercaConfigScreen() {
  const db = useDatabase();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [forte, setForte] = useState(4000);
  const [adequado, setAdequado] = useState(2000);
  const [fraco, setFraco] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings(db).then((s) => {
      setSettings(s);
      setForte(s.fence.voltageForte);
      setAdequado(s.fence.voltageAdequado);
      setFraco(s.fence.voltageFraco);
    });
  }, []);

  // Força ordem coerente: fraco < adequado < forte.
  function onForte(v: number) {
    setForte(v);
    if (adequado >= v) setAdequado(Math.max(fraco + 1, v - 100));
  }
  function onAdequado(v: number) {
    setAdequado(v);
    if (fraco >= v) setFraco(Math.max(1, v - 100));
    if (forte <= v) setForte(Math.min(10000, v + 100));
  }
  function onFraco(v: number) {
    setFraco(v);
    if (adequado <= v) setAdequado(Math.min(forte - 100, v + 100));
  }

  async function handleSave() {
    if (fraco >= adequado || adequado >= forte) {
      Alert.alert('Erro', 'Os thresholds precisam estar em ordem: fraco < adequado < forte.');
      return;
    }
    setSaving(true);
    try {
      await setSetting(db, 'fence.voltage_forte', forte);
      await setSetting(db, 'fence.voltage_adequado', adequado);
      await setSetting(db, 'fence.voltage_fraco', fraco);
      router.back();
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <View style={styles.root} />;

  const fenceSnap = { voltageForte: forte, voltageAdequado: adequado, voltageFraco: fraco };

  return (
    <View style={styles.root}>
      <BrandHeader title="Cerca · voltagens" context="Configurações" onBack={() => router.back()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.intro}>
          Define os thresholds de classificação do choque da cerca. Uma ronda classifica a
          voltagem medida comparando com estes valores.
        </Text>

        <Text style={styles.label}>FORTE · mínimo V</Text>
        <Card>
          <SliderInput value={forte} onValueChange={onForte} min={500} max={10000} step={100} unit="V" />
        </Card>

        <Text style={[styles.label, { marginTop: 22 }]}>ADEQUADO · mínimo V</Text>
        <Card>
          <SliderInput value={adequado} onValueChange={onAdequado} min={100} max={Math.max(forte - 100, 200)} step={100} unit="V" />
        </Card>

        <Text style={[styles.label, { marginTop: 22 }]}>FRACO · mínimo V</Text>
        <Card>
          <SliderInput value={fraco} onValueChange={onFraco} min={1} max={Math.max(adequado - 100, 2)} step={1} unit="V" />
        </Card>

        <Text style={[styles.label, { marginTop: 22 }]}>PRÉVIA</Text>
        <Card>
          <PreviewRow volts={fenceSnap.voltageForte + 500} fence={fenceSnap} />
          <PreviewRow volts={Math.round((fenceSnap.voltageForte + fenceSnap.voltageAdequado) / 2)} fence={fenceSnap} />
          <PreviewRow volts={Math.round((fenceSnap.voltageAdequado + fenceSnap.voltageFraco) / 2)} fence={fenceSnap} />
          <PreviewRow volts={0} fence={fenceSnap} />
        </Card>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.stickyFooter}>
        <Button
          title={saving ? 'Salvando…' : 'Salvar'}
          onPress={handleSave}
          disabled={saving}
        />
      </SafeAreaView>
    </View>
  );
}

function PreviewRow({ volts, fence }: { volts: number; fence: AppSettings['fence'] }) {
  const cls = classifyFenceWith(volts, fence);
  const kind = cls === 'FORTE' ? 'ok' : cls === 'ADEQUADO' ? 'warn' : cls === 'FRACO' ? 'danger' : 'neutral';
  return (
    <View style={styles.previewRow}>
      <Text style={styles.previewVolts}>{volts.toLocaleString('pt-BR')} V</Text>
      <StatusPill kind={kind as any}>{cls.charAt(0) + cls.slice(1).toLowerCase()}</StatusPill>
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
  intro: { fontSize: 13, color: NSA.inkSecondary, lineHeight: 18, marginBottom: 18, fontFamily: Fonts.regular },
  label: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  previewVolts: { fontSize: 13, color: NSA.inkPrimary, fontFamily: Fonts.medium },
});
