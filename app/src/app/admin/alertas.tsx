import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Switch, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, SliderInput, MultiChoice, BrandHeader, KeyboardAvoider} from '@/components/ui';
import { loadSettings, setSetting, AppSettings } from '@/lib/settings';
import { WATER_QUALITY_OPTIONS } from '@/constants';
import { NSA, Fonts, Radius } from '@/theme/nsa';

const FENCE_CLASSIFICATIONS = ['FORTE', 'ADEQUADO', 'FRACO', 'SEM CHOQUE'];

const WEEKDAY_OPTIONS = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Segunda' },
  { value: '2', label: 'Terça' },
  { value: '3', label: 'Quarta' },
  { value: '4', label: 'Quinta' },
  { value: '5', label: 'Sexta' },
  { value: '6', label: 'Sábado' },
];

export default function AlertasConfigScreen() {
  const db = useDatabase();
  const [s, setS] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings(db).then(setS);
  }, []);

  if (!s) return <View style={styles.root} />;

  function patch<K extends keyof AppSettings>(section: K, next: AppSettings[K]) {
    setS((prev) => prev ? { ...prev, [section]: next } : prev);
  }

  function toggleInArray(arr: string[], v: string): string[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  async function handleSave() {
    if (!s) return;
    if (s.bombona.enabled && s.bombona.dangerDays >= s.bombona.warnDays) {
      Alert.alert('Erro', 'Em cocho: danger deve ser menor que warn.');
      return;
    }
    if (s.central.enabled && s.central.dangerDays >= s.central.warnDays) {
      Alert.alert('Erro', 'Em estoque central: danger deve ser menor que warn.');
      return;
    }
    if (s.sanidade.enabled && s.sanidade.warnPct >= s.sanidade.dangerPct) {
      Alert.alert('Erro', 'Em sanidade: warn deve ser menor que danger.');
      return;
    }
    setSaving(true);
    try {
      await setSetting(db, 'alert.bombona.enabled', s.bombona.enabled);
      await setSetting(db, 'alert.bombona.warn_days', s.bombona.warnDays);
      await setSetting(db, 'alert.bombona.danger_days', s.bombona.dangerDays);
      await setSetting(db, 'alert.central.enabled', s.central.enabled);
      await setSetting(db, 'alert.central.warn_days', s.central.warnDays);
      await setSetting(db, 'alert.central.danger_days', s.central.dangerDays);
      await setSetting(db, 'alert.sanidade.enabled', s.sanidade.enabled);
      await setSetting(db, 'alert.sanidade.warn_pct', s.sanidade.warnPct);
      await setSetting(db, 'alert.sanidade.danger_pct', s.sanidade.dangerPct);
      await setSetting(db, 'alert.agua.enabled', s.agua.enabled);
      await setSetting(db, 'alert.agua.warn_qualities', s.agua.warnQualities);
      await setSetting(db, 'alert.agua.danger_qualities', s.agua.dangerQualities);
      await setSetting(db, 'alert.cerca.enabled', s.cerca.enabled);
      await setSetting(db, 'alert.cerca.warn_classifications', s.cerca.warnClassifications);
      await setSetting(db, 'alert.cerca.danger_classifications', s.cerca.dangerClassifications);
      await setSetting(db, 'alert.desalocados.enabled', s.desalocados.enabled);
      await setSetting(db, 'alert.biologico.enabled', s.biologico.enabled);
      await setSetting(db, 'alert.biologico.weekday', s.biologico.weekday);
      router.back();
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <BrandHeader title="Alertas" context="Configurações" onBack={() => router.back()} />
      <KeyboardAvoider>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Cada alerta pode ser desligado ou ter seus limiares ajustados. Quando desligado, não aparece no Painel.
        </Text>

        {/* COCHO */}
        <SectionHeader title="Cocho (bombona)" enabled={s.bombona.enabled} onToggle={(v) => patch('bombona', { ...s.bombona, enabled: v })} />
        {s.bombona.enabled && (
          <Card>
            <Label text="WARN · dias restantes ≤" />
            <SliderInput value={s.bombona.warnDays} onValueChange={(v) => patch('bombona', { ...s.bombona, warnDays: v })} min={1} max={30} step={1} unit="dias" />
            <Label text="DANGER · dias restantes ≤" style={{ marginTop: 10 }} />
            <SliderInput value={s.bombona.dangerDays} onValueChange={(v) => patch('bombona', { ...s.bombona, dangerDays: v })} min={0} max={Math.max(0, s.bombona.warnDays - 1)} step={1} unit="dias" />
          </Card>
        )}

        {/* CENTRAL */}
        <SectionHeader title="Estoque central" enabled={s.central.enabled} onToggle={(v) => patch('central', { ...s.central, enabled: v })} />
        {s.central.enabled && (
          <Card>
            <Label text="WARN · aparece quando < dias" />
            <SliderInput value={s.central.warnDays} onValueChange={(v) => patch('central', { ...s.central, warnDays: v })} min={7} max={90} step={1} unit="dias" />
            <Label text="DANGER · ≤ dias" style={{ marginTop: 10 }} />
            <SliderInput value={s.central.dangerDays} onValueChange={(v) => patch('central', { ...s.central, dangerDays: v })} min={1} max={Math.max(1, s.central.warnDays - 1)} step={1} unit="dias" />
          </Card>
        )}

        {/* SANIDADE */}
        <SectionHeader title="Sanidade" enabled={s.sanidade.enabled} onToggle={(v) => patch('sanidade', { ...s.sanidade, enabled: v })} />
        {s.sanidade.enabled && (
          <Card>
            <Label text="WARN · % afetado ≥" />
            <SliderInput value={s.sanidade.warnPct} onValueChange={(v) => patch('sanidade', { ...s.sanidade, warnPct: v })} min={0} max={Math.max(0, s.sanidade.dangerPct - 1)} step={1} unit="%" />
            <Label text="DANGER · % afetado ≥" style={{ marginTop: 10 }} />
            <SliderInput value={s.sanidade.dangerPct} onValueChange={(v) => patch('sanidade', { ...s.sanidade, dangerPct: v })} min={1} max={100} step={1} unit="%" />
          </Card>
        )}

        {/* ÁGUA */}
        <SectionHeader title="Água" enabled={s.agua.enabled} onToggle={(v) => patch('agua', { ...s.agua, enabled: v })} />
        {s.agua.enabled && (
          <Card>
            <Label text="QUALIDADES QUE GERAM WARN" />
            <ChipRow
              options={WATER_QUALITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              selected={s.agua.warnQualities}
              onToggle={(v) => patch('agua', { ...s.agua, warnQualities: toggleInArray(s.agua.warnQualities, v) })}
              activeColor={NSA.warn}
            />
            <Label text="QUALIDADES QUE GERAM DANGER" style={{ marginTop: 14 }} />
            <ChipRow
              options={WATER_QUALITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              selected={s.agua.dangerQualities}
              onToggle={(v) => patch('agua', { ...s.agua, dangerQualities: toggleInArray(s.agua.dangerQualities, v) })}
              activeColor={NSA.danger}
            />
            <Text style={styles.hint}>Sem água detectada sempre gera danger (não é configurável).</Text>
          </Card>
        )}

        {/* CERCA */}
        <SectionHeader title="Cerca" enabled={s.cerca.enabled} onToggle={(v) => patch('cerca', { ...s.cerca, enabled: v })} />
        {s.cerca.enabled && (
          <Card>
            <Label text="CLASSIFICAÇÕES QUE GERAM WARN" />
            <ChipRow
              options={FENCE_CLASSIFICATIONS.map((c) => ({ value: c, label: c }))}
              selected={s.cerca.warnClassifications}
              onToggle={(v) => patch('cerca', { ...s.cerca, warnClassifications: toggleInArray(s.cerca.warnClassifications, v) })}
              activeColor={NSA.warn}
            />
            <Label text="CLASSIFICAÇÕES QUE GERAM DANGER" style={{ marginTop: 14 }} />
            <ChipRow
              options={FENCE_CLASSIFICATIONS.map((c) => ({ value: c, label: c }))}
              selected={s.cerca.dangerClassifications}
              onToggle={(v) => patch('cerca', { ...s.cerca, dangerClassifications: toggleInArray(s.cerca.dangerClassifications, v) })}
              activeColor={NSA.danger}
            />
            <Text style={styles.hint}>Cerca "não evita mistura" sempre gera danger (não é configurável).</Text>
          </Card>
        )}

        {/* DESALOCADOS */}
        <SectionHeader title="Gado desalocado" enabled={s.desalocados.enabled} onToggle={(v) => patch('desalocados', { enabled: v })} />
        {s.desalocados.enabled && (
          <Card>
            <Text style={styles.hint}>Gera warn sempre que há gado no pool. Desligue pra suprimir.</Text>
          </Card>
        )}

        {/* BIOLÓGICO */}
        <SectionHeader title="Biológico na água" enabled={s.biologico.enabled} onToggle={(v) => patch('biologico', { ...s.biologico, enabled: v })} />
        {s.biologico.enabled && (
          <Card>
            <Label text="DIA DE APLICAÇÃO" />
            <MultiChoice
              options={WEEKDAY_OPTIONS}
              value={String(s.biologico.weekday)}
              onChange={(v) => patch('biologico', { ...s.biologico, weekday: Number(v) })}
            />
            <Text style={styles.hint}>
              A cada novo {WEEKDAY_OPTIONS[s.biologico.weekday]?.label.toLowerCase()}, piquetes com gado que ainda não receberam biológico entram em alerta na aba Ronda. O alerta só sai quando a aplicação for registrada.
            </Text>
          </Card>
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.stickyFooter}>
        <Button title={saving ? 'Salvando…' : 'Salvar'} onPress={handleSave} disabled={saving} />
      </SafeAreaView>
      </KeyboardAvoider>
    </View>
  );
}

function SectionHeader({ title, enabled, onToggle }: { title: string; enabled: boolean; onToggle: (v: boolean) => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: NSA.border, true: NSA.green800 }}
        thumbColor={NSA.cream}
      />
    </View>
  );
}

function Label({ text, style }: { text: string; style?: any }) {
  return <Text style={[styles.label, style]}>{text}</Text>;
}

function ChipRow({
  options, selected, onToggle, activeColor,
}: {
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (v: string) => void;
  activeColor: string;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <TouchableOpacity
            key={o.value}
            activeOpacity={0.85}
            onPress={() => onToggle(o.value)}
            style={[
              styles.chip,
              on && { borderColor: activeColor, backgroundColor: withAlpha(activeColor, 0.1) },
            ]}
          >
            <Text style={[styles.chipText, on && { color: activeColor, fontFamily: Fonts.semibold }]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function withAlpha(hex: string, alpha: number): string {
  // NSA palette é hex 7-char. Se receber outro formato, fallback pro hex original.
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  return hex + a;
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontFamily: Fonts.semibold, color: NSA.inkPrimary, letterSpacing: -0.15 },
  label: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginBottom: 6,
  },
  hint: { fontSize: 12, color: NSA.inkMuted, fontFamily: Fonts.regular, marginTop: 8, lineHeight: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: NSA.borderStrong,
    backgroundColor: NSA.bgElevated,
  },
  chipText: { fontSize: 12, color: NSA.inkSecondary, fontFamily: Fonts.medium },
});
