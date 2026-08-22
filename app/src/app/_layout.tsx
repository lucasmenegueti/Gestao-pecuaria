import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import {
  useFonts as useInter,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Lora_600SemiBold,
  Lora_700Bold,
} from '@expo-google-fonts/lora';
import { DatabaseProvider, useDatabase } from '@/lib/db/provider';
import { startSyncDaemon, stopSyncDaemon } from '@/lib/sync/daemon';
import { NSA } from '@/theme/nsa';

function SyncDaemonBootstrap() {
  const db = useDatabase();
  useEffect(() => {
    startSyncDaemon(db);
    return () => stopSyncDaemon();
  }, [db]);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useInter({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Lora_600SemiBold,
    Lora_700Bold,
  });

  if (!fontsLoaded) {
    // Splash enquanto fontes carregam — evita flash de fonte do sistema.
    return (
      <View style={{ flex: 1, backgroundColor: NSA.bgBrand, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={NSA.cream} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <DatabaseProvider>
        <SyncDaemonBootstrap />
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: NSA.bg } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="ronda" />
          <Stack.Screen name="piquete" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="estoque" />
          <Stack.Screen name="reabastecimento" />
        </Stack>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}
