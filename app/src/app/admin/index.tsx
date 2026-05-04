import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Package,
  Sprout,
  Zap,
  Bell,
  FileText,
  ChevronRight,
  ClipboardCheck,
  Map,
} from 'lucide-react-native';
import { BrandHeader } from '@/components/ui';
import { NSA, Fonts, Radius } from '@/theme/nsa';

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface SettingItem {
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  route: string;
}

const ITEMS: SettingItem[] = [
  { title: 'Solicitações', subtitle: 'Delegar inspeções sob demanda em piquetes', Icon: ClipboardCheck, route: '/admin/solicitacoes' },
  { title: 'Piquetes', subtitle: 'Renomear identificadores dos piquetes', Icon: Map, route: '/admin/piquetes' },
  { title: 'Formulações', subtitle: 'Produtos de suplementação e estoque mínimo', Icon: Package, route: '/admin/formulas' },
  { title: 'Tipos de capim', subtitle: 'Alturas de entrada e saída por variedade', Icon: Sprout, route: '/admin/grass-types' },
  { title: 'Cerca', subtitle: 'Voltagens que definem cada classificação', Icon: Zap, route: '/admin/cerca' },
  { title: 'Alertas', subtitle: 'Limiares e ativação de cada alerta do painel', Icon: Bell, route: '/admin/alertas' },
  { title: 'Logs', subtitle: 'Registro de atividade e sincronização', Icon: FileText, route: '/admin/logs' },
];

export default function AdminIndexScreen() {
  return (
    <View style={styles.root}>
      <BrandHeader title="Configurações" context="Ajustes do app" onBack={() => router.back()} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              activeOpacity={0.85}
              onPress={() => router.push(item.route as any)}
              style={styles.row}
            >
              <View style={styles.iconWrap}>
                <item.Icon size={18} color={NSA.green800} strokeWidth={1.75} />
              </View>
              <View style={styles.body}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </View>
              <ChevronRight size={16} color={NSA.inkMuted} strokeWidth={1.75} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: NSA.bgElevated,
    borderWidth: 1,
    borderColor: NSA.border,
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    backgroundColor: NSA.green50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontFamily: Fonts.semibold, color: NSA.inkPrimary, letterSpacing: -0.15 },
  subtitle: { fontSize: 12, fontFamily: Fonts.regular, color: NSA.inkSecondary, marginTop: 2 },
});
