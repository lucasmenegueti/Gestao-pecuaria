import React from 'react';
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, SliderInput } from '@/components/ui';
import { Colors } from '@/constants';

export default function FenceStep2() {
  const { paddockId } = useLocalSearchParams();
  const { fence, updateFence } = useRondaStore();

  return (
    <WizardFlow
      title="CERCA"
      subtitle="Voltagem"
      step={2}
      totalSteps={3}
      accentColor={Colors.cerca}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/fence/summary`)}
    >
      <Text style={styles.question}>QUANTOS VOLTS NA CERCA?</Text>
      {fence.isElectric ? (
        <SliderInput
          value={fence.voltage}
          onValueChange={(v) => updateFence({ voltage: v })}
          min={0}
          max={10000}
          step={100}
          unit="volts"
          color={Colors.cerca}
        />
      ) : (
        <View style={styles.nonElectric}>
          <Text style={styles.nonElectricText}>Cerca não elétrica</Text>
        </View>
      )}
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => updateFence({ isElectric: !fence.isElectric, voltage: fence.isElectric ? 0 : 4500 })}
      >
        <Text style={styles.checkboxText}>
          {fence.isElectric ? '☐' : '☑'} CERCA NÃO ELÉTRICA
        </Text>
      </TouchableOpacity>
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontWeight: '800', color: '#2c2c2c', marginBottom: 20, textAlign: 'center' },
  checkbox: { marginTop: 20, padding: 12, alignItems: 'center' },
  checkboxText: { fontSize: 16, fontWeight: '600', color: '#7a7a7a' },
  nonElectric: { padding: 40, alignItems: 'center' },
  nonElectricText: { fontSize: 20, fontWeight: '700', color: '#7a7a7a' },
});
