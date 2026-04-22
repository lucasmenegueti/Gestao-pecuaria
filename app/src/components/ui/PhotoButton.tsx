import React from 'react';
import { TouchableOpacity, Text, Image, View, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { NSA, Fonts, Radius } from '@/theme/nsa';

interface PhotoButtonProps {
  uri: string | null;
  onPhoto: (uri: string) => void;
}

/**
 * Android requer `requestCameraPermissionsAsync` *antes* de `launchCameraAsync`
 * — sem isso a chamada cai silenciosamente com canceled=true e o usuário acha
 * que o botão está quebrado.
 */
async function ensureCamera(): Promise<boolean> {
  const cam = await ImagePicker.getCameraPermissionsAsync();
  if (cam.granted) return true;
  if (!cam.canAskAgain) {
    Alert.alert(
      'Permissão negada',
      'Habilite a câmera nas Configurações → Apps → Gestão Pecuária.',
    );
    return false;
  }
  const req = await ImagePicker.requestCameraPermissionsAsync();
  return req.granted;
}

async function ensureGallery(): Promise<boolean> {
  const lib = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (lib.granted) return true;
  if (!lib.canAskAgain) {
    Alert.alert(
      'Permissão negada',
      'Habilite o acesso às fotos nas Configurações → Apps → Gestão Pecuária.',
    );
    return false;
  }
  const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return req.granted;
}

export function PhotoButton({ uri, onPhoto }: PhotoButtonProps) {
  async function openCamera() {
    if (!(await ensureCamera())) return;
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        onPhoto(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Falha ao abrir câmera.');
    }
  }

  async function openGallery() {
    if (!(await ensureGallery())) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        onPhoto(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Falha ao abrir galeria.');
    }
  }

  function handlePress() {
    Alert.alert('Adicionar foto', 'Escolha a origem:', [
      { text: 'Câmera', onPress: openCamera },
      { text: 'Galeria', onPress: openGallery },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.85}>
      {uri ? (
        <Image source={{ uri }} style={styles.preview} />
      ) : (
        <View style={styles.placeholder}>
          <Camera size={28} color={NSA.inkMuted} strokeWidth={1.75} />
          <Text style={styles.text}>Adicionar foto (opcional)</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: NSA.borderStrong,
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginTop: 12,
    backgroundColor: NSA.bgElevated,
  },
  placeholder: {
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  text: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: NSA.inkMuted,
  },
  preview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
});
