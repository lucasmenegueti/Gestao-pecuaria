import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Colors } from '@/constants';

const TABS = [
  { label: 'Painel', emoji: '📊', route: '/(tabs)/' },
  { label: 'Ronda', emoji: '🔍', route: '/(tabs)/ronda' },
  { label: 'Rebanho', emoji: '🐂', route: '/(tabs)/rebanho' },
  { label: 'Estoque', emoji: '📦', route: '/(tabs)/estoque' },
  { label: 'Mapa', emoji: '🗺️', route: '/(tabs)/mapa' },
] as const;

export function BottomNav({ active }: { active?: string }) {
  const pathname = usePathname();
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = active === tab.label || pathname.includes(tab.route.replace('/(tabs)/', '/'));
        return (
          <TouchableOpacity
            key={tab.label}
            style={styles.item}
            onPress={() => router.replace(tab.route as never)}
            activeOpacity={0.7}
          >
            <Text style={[styles.emoji, isActive && styles.emojiActive]}>{tab.emoji}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 70,
    paddingBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 22, color: Colors.textMuted },
  emojiActive: { fontSize: 26 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginTop: 2 },
  labelActive: { color: Colors.primary },
});
