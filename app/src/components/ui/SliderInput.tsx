import React, { useState } from 'react';
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';

interface SliderInputProps {
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  label?: string;
  color?: string;
}

export function SliderInput({ value, onValueChange, min, max, step = 1, unit = '', label, color = '#1a6b54' }: SliderInputProps) {
  const [width, setWidth] = useState(0);
  const fraction = (value - min) / (max - min);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (_, gestureState) => {
      updateValue(gestureState.x0);
    },
    onPanResponderMove: (_, gestureState) => {
      updateValue(gestureState.moveX);
    },
  });

  function updateValue(pageX: number) {
    // This is approximate — for production, measure the track's position
    if (width === 0) return;
    const raw = Math.max(0, Math.min(1, pageX / width));
    const rawValue = min + raw * (max - min);
    const stepped = Math.round(rawValue / step) * step;
    const clamped = Math.max(min, Math.min(max, stepped));
    onValueChange(Number(clamped.toFixed(1)));
  }

  const handleLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const displayValue = step < 1 ? value.toFixed(1) : Math.round(value).toLocaleString('pt-BR');

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Text style={[styles.value, { color }]}>{displayValue} {unit}</Text>
      <View style={styles.track} onLayout={handleLayout} {...panResponder.panHandlers}>
        <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: color }]} />
        <View style={[styles.thumb, { left: `${fraction * 100}%`, borderColor: color }]} />
      </View>
      <View style={styles.range}>
        <Text style={styles.rangeText}>{min} {unit}</Text>
        <Text style={styles.rangeText}>{max} {unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  label: {
    fontSize: 16,
    color: '#7a7a7a',
    marginBottom: 8,
  },
  value: {
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 24,
  },
  track: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0dcd5',
    borderRadius: 4,
    position: 'relative',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  thumb: {
    position: 'absolute',
    top: -10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    marginLeft: -14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  range: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  rangeText: {
    fontSize: 14,
    color: '#7a7a7a',
  },
});
