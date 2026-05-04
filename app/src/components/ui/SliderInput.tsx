import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder, TextInput, TouchableOpacity } from 'react-native';
import { NSA, Fonts, Radius } from '@/theme/nsa';

interface SliderInputProps {
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** Se passado, usa esse rótulo no singular quando value === 1. */
  unitSingular?: string;
  label?: string;
  color?: string;
}

export function SliderInput({ value, onValueChange, min, max, step = 1, unit = '', unitSingular, label, color = NSA.green800 }: SliderInputProps) {
  const trackRef = useRef<View>(null);
  const layoutRef = useRef<{ pageX: number; width: number }>({ pageX: 0, width: 0 });
  const [editing, setEditing] = useState(false);
  const [textValue, setTextValue] = useState('');

  // Clamp inicial: se o pai começou com value fora de [min, max] (ex.: store
  // zerado com min=1), empurra pro min logo de cara. Sem isso, o usuário
  // conseguia avançar um step com valor inválido — silent bug em supplement
  // step4 e outros wizards.
  useEffect(() => {
    if (!Number.isFinite(value) || value < min) onValueChange(min);
    else if (value > max) onValueChange(max);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max]);

  const fraction = max > min ? (value - min) / (max - min) : 0;

  // PanResponder é criado 1x e captura closures da 1ª render. Pra suportar
  // min/max/step que mudam (ex.: ajuste.tsx troca produto e o teto vira outro),
  // redirecionamos a lógica via ref sempre atualizada — o handler chama
  // updateRef.current, que aponta pra função com props atuais.
  const updateRef = useRef<(pageX: number) => void>(() => {});
  updateRef.current = (pageX: number) => {
    const { pageX: trackX, width } = layoutRef.current;
    if (width <= 0) return;
    const localX = pageX - trackX;
    const raw = Math.max(0, Math.min(1, localX / width));
    const rawValue = min + raw * (max - min);
    const stepped = Math.round(rawValue / step) * step;
    const clamped = Math.max(min, Math.min(max, stepped));
    onValueChange(Number(clamped.toFixed(step < 1 ? 1 : 0)));
  };

  const panResponder = useRef(
    PanResponder.create({
      // Captura gesto desde o toque inicial, ignorando drift vertical para não deixar ScrollView roubar.
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (evt) => {
        updateRef.current(evt.nativeEvent.pageX);
      },
      onPanResponderMove: (evt) => {
        updateRef.current(evt.nativeEvent.pageX);
      },
    })
  ).current;

  function measureTrack() {
    trackRef.current?.measureInWindow((x, _y, w) => {
      layoutRef.current = { pageX: x, width: w };
    });
  }

  function bump(delta: number) {
    const next = Math.max(min, Math.min(max, value + delta));
    onValueChange(Number(next.toFixed(step < 1 ? 1 : 0)));
  }

  function commitText() {
    const parsed = Number(textValue.replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      setEditing(false);
      return;
    }
    const clamped = Math.max(min, Math.min(max, parsed));
    onValueChange(Number(clamped.toFixed(step < 1 ? 1 : 0)));
    setEditing(false);
  }

  const displayValue = step < 1 ? value.toFixed(1) : Math.round(value).toLocaleString('pt-BR');
  // Singularização opcional: usa unitSingular quando value=1 e foi configurado.
  const valueUnit = unitSingular && Math.round(value) === 1 ? unitSingular : unit;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.valueRow}>
        <TouchableOpacity style={styles.stepBtn} onPress={() => bump(-step)} hitSlop={8}>
          <Text style={[styles.stepBtnText, { color }]}>−</Text>
        </TouchableOpacity>

        {editing ? (
          <TextInput
            style={[styles.valueInput, { color }]}
            value={textValue}
            onChangeText={setTextValue}
            keyboardType="numeric"
            autoFocus
            onBlur={commitText}
            onSubmitEditing={commitText}
            selectTextOnFocus
          />
        ) : (
          <TouchableOpacity
            onPress={() => {
              setTextValue(String(value));
              setEditing(true);
            }}
            style={styles.valueWrap}
          >
            <Text style={[styles.value, { color }]}>{displayValue}</Text>
            {valueUnit ? <Text style={[styles.unit, { color }]}>{valueUnit}</Text> : null}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.stepBtn} onPress={() => bump(step)} hitSlop={8}>
          <Text style={[styles.stepBtnText, { color }]}>+</Text>
        </TouchableOpacity>
      </View>

      <View
        ref={trackRef}
        style={styles.trackHitArea}
        onLayout={measureTrack}
        {...panResponder.panHandlers}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: color }]} />
          <View style={[styles.thumb, { left: `${fraction * 100}%`, borderColor: color }]} />
        </View>
      </View>

      <View style={styles.range}>
        <Text style={styles.rangeText}>{min} {unit}</Text>
        <Text style={styles.rangeText}>{max} {unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  label: {
    fontSize: 12,
    color: NSA.inkSecondary,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Fonts.medium,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 18,
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 120,
    justifyContent: 'center',
  },
  value: {
    fontSize: 44,
    fontFamily: Fonts.loraSemibold,
    letterSpacing: -0.8,
  },
  unit: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    marginLeft: 6,
  },
  valueInput: {
    fontSize: 44,
    fontFamily: Fonts.loraSemibold,
    minWidth: 120,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: NSA.borderStrong,
    paddingVertical: 4,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: NSA.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NSA.bgElevated,
  },
  stepBtnText: {
    fontSize: 24,
    fontFamily: Fonts.semibold,
    lineHeight: 26,
  },
  trackHitArea: {
    width: '100%',
    paddingVertical: 14,
    justifyContent: 'center',
  },
  track: {
    width: '100%',
    height: 6,
    backgroundColor: NSA.bgMuted,
    borderRadius: 999,
    position: 'relative',
  },
  fill: { height: '100%', borderRadius: 999 },
  thumb: {
    position: 'absolute',
    top: -11,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: NSA.bgElevated,
    borderWidth: 2,
    marginLeft: -14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  range: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 6,
  },
  rangeText: {
    fontSize: 12,
    color: NSA.inkMuted,
    fontFamily: Fonts.regular,
  },
});
