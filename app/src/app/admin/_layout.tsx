import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function AdminLayout() {
  const role = useAuthStore((s) => s.user?.role);

  useEffect(() => {
    if (role && role !== 'admin') {
      router.replace('/(tabs)');
    }
  }, [role]);

  if (role && role !== 'admin') return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
