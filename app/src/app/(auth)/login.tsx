import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Check, Wifi } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/authStore';
import { useDatabase } from '@/lib/db/provider';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { syncAll } from '@/lib/sync/engine';
import { Button } from '@/components/ui';
import { NSA, Fonts } from '@/theme/nsa';

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const offlineCache = useAuthStore((s) => s.offlineCache);
  const db = useDatabase();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

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
      const inOfflineMode = useAuthStore.getState().offlineMode;
      if (!inOfflineMode) {
        // Fire-and-forget: NÃO aguarda syncAll. Com N rows pending_sync locais
        // cada push leva ~200ms no tablet — 100 rows = 20-30s de login travado.
        // Medido via scripts/test-push-batch.mjs: 99ms/row no Windows, 2-3x mais
        // no Android/Wi-Fi rural. Daemon sincroniza em background.
        syncAll(db).catch((e) => console.warn('[login] sync bg falhou:', e?.message));
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      const raw = String(err?.message ?? '');
      const isAbort = /abort|timeout|AbortError/i.test(raw);
      const msg = raw.includes('Invalid login')
        ? 'Usuário ou senha inválidos'
        : raw.includes('não encontrado')
          ? raw
          : (raw.includes('Network') || isAbort)
            ? 'Conexão instável. Verifique o Wi-Fi e tente de novo. Se o problema persistir, você pode entrar sem internet usando a senha do último login.'
            : raw || 'Falha ao fazer login';
      Alert.alert(isAbort ? 'Conexão instável' : 'Erro', msg);
    }
    setLoading(false);
    setSyncMsg(null);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <Image source={require('../../../assets/logo-nsa-green.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.captions}>
          <Text style={styles.caption}>Gestão de Pecuária</Text>
          <Text style={styles.subCaption}>Fazenda N.S.A</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Usuário</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="seu.nome"
              placeholderTextColor={NSA.inkDisabled}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••"
              placeholderTextColor={NSA.inkDisabled}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.rememberRow}
            onPress={() => setRemember((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
              {remember && <Check size={12} color={NSA.cream} strokeWidth={2.5} />}
            </View>
            <Text style={styles.rememberText}>Lembrar-me neste aparelho</Text>
          </TouchableOpacity>

          <Button
            title={loading ? (syncMsg ?? 'Entrando…') : 'Entrar'}
            onPress={handleLogin}
            disabled={loading}
            style={{ marginTop: 4 }}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Wifi size={12} color={NSA.inkMuted} strokeWidth={1.75} />
        <Text style={styles.footerText}>Primeiro acesso requer internet</Text>
      </View>
      <Text style={styles.version}>v{Constants.expoConfig?.version ?? '—'}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NSA.cream },
  hero: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  logo: { width: 180, height: 180 },
  captions: { alignItems: 'center', gap: 6 },
  caption: {
    fontFamily: Fonts.loraSemibold,
    fontSize: 13,
    letterSpacing: 2.8,
    color: NSA.inkSecondary,
    textTransform: 'uppercase',
  },
  subCaption: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    letterSpacing: 2.4,
    color: NSA.inkMuted,
    textTransform: 'uppercase',
  },
  form: {
    width: '100%',
    gap: 14,
    marginTop: 8,
  },
  field: {},
  label: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: NSA.inkSecondary,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: NSA.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: NSA.inkPrimary,
    backgroundColor: NSA.bgElevated,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: NSA.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NSA.bgElevated,
  },
  checkboxChecked: {
    backgroundColor: NSA.green800,
    borderColor: NSA.green800,
  },
  rememberText: {
    fontSize: 13,
    color: NSA.inkSecondary,
    fontFamily: Fonts.regular,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 11,
    color: NSA.inkMuted,
    fontFamily: Fonts.mono,
  },
  version: {
    textAlign: 'center',
    paddingBottom: 10,
    fontSize: 10,
    color: NSA.inkDisabled,
    fontFamily: Fonts.mono,
    letterSpacing: 0.5,
  },
});
