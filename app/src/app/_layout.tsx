import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider, useDatabase } from '@/lib/db/provider';
import { startSyncDaemon, stopSyncDaemon } from '@/lib/sync/daemon';

function SyncDaemonBootstrap() {
  const db = useDatabase();
  useEffect(() => {
    startSyncDaemon(db);
    return () => stopSyncDaemon();
  }, [db]);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DatabaseProvider>
        <SyncDaemonBootstrap />
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="ronda" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="estoque" />
          <Stack.Screen name="reabastecimento" />
        </Stack>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}
