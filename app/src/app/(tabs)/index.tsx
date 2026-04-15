import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import { Card, CardTitle, Button, Badge } from '@/components/ui';
import { Colors } from '@/constants';

export default function DashboardScreen() {
  const db = useDatabase();
  const user = useAuthStore((s) => s.user);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const [totalPaddocks, setTotalPaddocks] = useState(0);
  const [rondaCount, setRondaCount] = useState(0);
  const [alerts, setAlerts] = useState<Array<{ paddock: string; message: string; type: string }>>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const paddocks = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM paddocks WHERE active = 1');
    setTotalPaddocks(paddocks?.count || 0);

    const today = new Date().toISOString().split('T')[0];
    const rondas = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(DISTINCT paddock_id) as count FROM rondas WHERE date = ?',
      [today]
    );
    setRondaCount(rondas?.count || 0);

    // Check alerts: empty bombonas, low stock, etc.
    const lowBombonas = await db.getAllAsync<{ name: string; quantity_sacks: number }>(
      `SELECT p.name, i.quantity_sacks FROM inventory i
       JOIN paddocks p ON p.id = i.paddock_id
       WHERE i.location = 'bombona' AND i.quantity_sacks <= 1`
    );

    const lowCentral = await db.getAllAsync<{ name: string; quantity_sacks: number; min_sacks: number }>(
      `SELECT f.name, i.quantity_sacks, i.min_sacks FROM inventory i
       JOIN formulas f ON f.id = i.formula_id
       WHERE i.location = 'central' AND i.quantity_sacks < i.min_sacks`
    );

    const newAlerts: typeof alerts = [];
    lowBombonas.forEach((b) => {
      newAlerts.push({
        paddock: b.name,
        message: b.quantity_sacks === 0 ? 'Cocho vazio!' : 'Cocho quase vazio',
        type: b.quantity_sacks === 0 ? 'danger' : 'warning',
      });
    });
    lowCentral.forEach((c) => {
      newAlerts.push({
        paddock: c.name,
        message: 'Estoque central abaixo do mínimo',
        type: 'danger',
      });
    });
    setAlerts(newAlerts);
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'BOM DIA';
    if (h < 18) return 'BOA TARDE';
    return 'BOA NOITE';
  };

  const progress = totalPaddocks > 0 ? (rondaCount / totalPaddocks) * 100 : 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Painel</Text>
        <TouchableOpacity onPress={() => router.push('/admin/formulas')}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Sync bar */}
      {pendingCount > 0 && (
        <View style={styles.syncBar}>
          <Text style={styles.syncText}>🔄 {pendingCount} registros aguardando sincronização</Text>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Greeting */}
        <Text style={styles.greeting}>
          {greeting()}, {user?.name?.split(' ')[0]?.toUpperCase() || 'PEÃO'}!
        </Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card style={{ marginTop: 16 }}>
            <CardTitle>⚠️ Alertas</CardTitle>
            {alerts.map((alert, i) => (
              <View key={i} style={styles.alertRow}>
                <Badge label={alert.paddock} variant={alert.type as any} />
                <Text style={styles.alertText}>{alert.message}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Ronda Progress */}
        <Card style={{ marginTop: 12 }}>
          <CardTitle>Rondas feitas hoje</CardTitle>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{rondaCount} de {totalPaddocks}</Text>
            <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </Card>

        {/* Quick Actions */}
        <Button
          title="INICIAR RONDA"
          onPress={() => router.push('/(tabs)/ronda')}
          size="large"
          icon="🔍"
          style={{ marginTop: 16 }}
        />

        <View style={styles.quickRow}>
          <Button
            title="Estoque"
            variant="secondary"
            onPress={() => router.push('/(tabs)/estoque')}
            icon="📦"
            style={styles.quickButton}
          />
          <Button
            title="Rebanho"
            variant="secondary"
            onPress={() => router.push('/(tabs)/rebanho')}
            icon="🐂"
            style={styles.quickButton}
          />
        </View>

        <Button
          title="VER LOTAÇÃO"
          variant="outline"
          onPress={() => router.push('/admin/lotacao')}
          style={{ marginTop: 12 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.white },
  settingsIcon: { fontSize: 24 },
  syncBar: {
    backgroundColor: '#fff3e0',
    padding: 10,
    alignItems: 'center',
  },
  syncText: { fontSize: 14, color: Colors.warning, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  greeting: { fontSize: 24, fontWeight: '800', color: Colors.text },
  date: { fontSize: 16, color: Colors.textMuted, marginTop: 4 },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  alertText: { fontSize: 14, color: Colors.text, flex: 1 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: { fontSize: 16, color: Colors.text, fontWeight: '600' },
  progressPercent: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  quickButton: { flex: 1 },
});
