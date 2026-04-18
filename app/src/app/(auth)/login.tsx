import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useDatabase } from '@/lib/db/provider';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { syncAll } from '@/lib/sync/engine';
import { Button } from '@/components/ui';
import { Colors } from '@/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const offlineCache = useAuthStore((s) => s.offlineCache);
  const db = useDatabase();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // Zustand persist é assíncrono — usamos effect pra pegar cache após rehidratação
  useEffect(() => {
    if (offlineCache) {
      setUsername(offlineCache.username ?? '');
      setPassword(offlineCache.password ?? '');
      setRemember(true);
    }
  }, [offlineCache]);

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Erro', 'Preencha usuário e senha');
      return;
    }
    if (!isSupabaseConfigured()) {
      Alert.alert('Erro', 'App não configurado com Supabase. Falta EXPO_PUBLIC_SUPABASE_URL.');
      return;
    }
    setLoading(true);
    try {
      await login(username, password, remember);
      // Só tenta sync se login entrou em modo online (tem JWT válido)
      const inOfflineMode = useAuthStore.getState().offlineMode;
      if (!inOfflineMode) {
        setSyncMsg('Sincronizando com a fazenda…');
        try {
          await syncAll(db);
        } catch (syncErr: any) {
          console.warn('[login] sync falhou:', syncErr?.message);
        }
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err?.message?.includes('Invalid login')
        ? 'Usuário ou senha inválidos'
        : err?.message?.includes('não encontrado')
          ? err.message
          : err?.message?.includes('Network')
            ? 'Sem conexão. Tenta de novo conectado à internet.'
            : err?.message || 'Falha ao fazer login';
      Alert.alert('Erro', msg);
    }
    setLoading(false);
    setSyncMsg(null);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🐄</Text>
          <Text style={styles.title}>Gestão Pecuária</Text>
          <Text style={styles.farmName}>Fazenda Nossa Senhora Aparecida</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Usuário</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="ex: lucas"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Digite sua senha"
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.rememberRow}
            onPress={() => setRemember((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
              {remember && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.rememberText}>Lembrar usuário e senha</Text>
          </TouchableOpacity>

          <Button
            title={loading ? (syncMsg ?? 'ENTRANDO...') : 'ENTRAR'}
            onPress={handleLogin}
            disabled={loading}
            style={{ marginTop: 16 }}
          />

          <Text style={styles.note}>Primeiro acesso requer internet</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logoEmoji: { fontSize: 80, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.white },
  farmName: { fontSize: 16, color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'center' },
  form: { backgroundColor: Colors.card, borderRadius: 16, padding: 24 },
  label: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 8, marginTop: 12 },
  input: {
    height: 56,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    backgroundColor: Colors.background,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxMark: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  rememberText: { fontSize: 15, color: Colors.text, fontWeight: '600' },
  note: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 16 },
});
