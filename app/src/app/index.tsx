import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants';

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const initializing = useAuthStore((s) => s.initializing);
  const restore = useAuthStore((s) => s.restore);

  // Restaura sessão do supabase-js (persistida no AsyncStorage) no primeiro boot.
  useEffect(() => {
    restore();
  }, [restore]);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: Colors.primary }}>
        <ActivityIndicator color={Colors.white} size="large" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
