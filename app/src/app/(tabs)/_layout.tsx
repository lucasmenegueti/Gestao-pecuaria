import React from 'react';
import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={[styles.icon, focused && styles.iconFocused]}>{emoji}</Text>;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          // Android edge-to-edge: adiciona espaço pra nav bar / gesture bar do sistema.
          { height: 70 + insets.bottom, paddingBottom: 8 + insets.bottom },
        ],
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Painel',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="ronda"
        options={{
          title: 'Ronda',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="rebanho"
        options={{
          title: 'Rebanho',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🐂" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="estoque"
        options={{
          title: 'Estoque',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📦" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 70,
    paddingBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  icon: {
    fontSize: 22,
  },
  iconFocused: {
    fontSize: 26,
  },
});
