import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Footprints, Beef, Package, Map as MapIcon, ClipboardList, CalendarRange } from 'lucide-react-native';
import { NSA, Fonts } from '@/theme/nsa';
import { useAuthStore } from '@/stores/authStore';

const ICON_BY_NAME = {
  painel: LayoutDashboard,
  ronda: Footprints,
  rebanho: Beef,
  estoque: Package,
  mapa: MapIcon,
  relatorio: ClipboardList,
  cronograma: CalendarRange,
} as const;

function Icon({ name, focused }: { name: keyof typeof ICON_BY_NAME; focused: boolean }) {
  const Cmp = ICON_BY_NAME[name];
  return <Cmp size={22} color={focused ? NSA.green800 : NSA.inkMuted} strokeWidth={focused ? 2 : 1.75} />;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // Peão: vê Painel/Ronda/Estoque/Mapa. Rebanho, Relatório e Cronograma só pra admin.
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  // expo-router: apenas href:null esconde a tab. Combinar com tabBarButton dispara
  // runtime error "Cannot use href and tabBarButton together" no Android — derruba app.
  const hidden = { href: null as any };
  // Android edge-to-edge: alguns devices reportam insets.bottom=0 mesmo com 3-button nav
  // visível (gesture nav vs 3-button + edge-to-edge inconsistente). Floor de 16px garante
  // que os labels nunca colem na barra do sistema.
  const bottomPad = Math.max(insets.bottom, 16);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          { height: 60 + bottomPad, paddingBottom: 8 + bottomPad },
        ],
        tabBarActiveTintColor: NSA.green800,
        tabBarInactiveTintColor: NSA.inkMuted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Painel',
          tabBarIcon: ({ focused }) => <Icon name="painel" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="ronda"
        options={{
          title: 'Ronda',
          tabBarIcon: ({ focused }) => <Icon name="ronda" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="rebanho"
        options={isAdmin ? {
          title: 'Rebanho',
          tabBarIcon: ({ focused }) => <Icon name="rebanho" focused={focused} />,
        } : hidden}
      />
      <Tabs.Screen
        name="estoque"
        options={{
          title: 'Estoque',
          tabBarIcon: ({ focused }) => <Icon name="estoque" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ focused }) => <Icon name="mapa" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="relatorio"
        options={isAdmin ? {
          title: 'Relatório',
          tabBarIcon: ({ focused }) => <Icon name="relatorio" focused={focused} />,
        } : hidden}
      />
      <Tabs.Screen
        name="cronograma"
        options={isAdmin ? {
          title: 'Crono',
          tabBarIcon: ({ focused }) => <Icon name="cronograma" focused={focused} />,
        } : hidden}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: NSA.border,
    backgroundColor: NSA.bgElevated,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    letterSpacing: -0.1,
  },
});
