import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DatabaseProvider } from '@/lib/db/provider';

export default function RootLayout() {
  return (
    <DatabaseProvider>
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
  );
}
