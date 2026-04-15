import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui';
import { Colors } from '@/constants';

export default function LoginScreen() {
  const db = useDatabase();
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Erro', 'Preencha usuário e senha');
      return;
    }
    setLoading(true);
    try {
      const user = await db.getFirstAsync<{
        id: number;
        username: string;
        name: string;
        role: string;
        password_hash: string;
      }>(
        'SELECT * FROM users WHERE username = ?',
        [username.trim().toLowerCase()]
      );

      if (!user || user.password_hash !== password) {
        Alert.alert('Erro', 'Usuário ou senha inválidos');
        setLoading(false);
        return;
      }

      login({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role as 'admin' | 'peao',
      });

      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Erro', 'Falha ao fazer login');
    }
    setLoading(false);
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
            placeholder="Digite seu usuário"
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

          <Button
            title={loading ? 'ENTRANDO...' : 'ENTRAR'}
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
  safe: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
  },
  farmName: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    textAlign: 'center',
  },
  form: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    height: 56,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    backgroundColor: Colors.background,
  },
  note: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
});
