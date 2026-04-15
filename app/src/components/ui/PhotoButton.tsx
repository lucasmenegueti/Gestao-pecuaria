import React from 'react';
import { TouchableOpacity, Text, Image, View, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface PhotoButtonProps {
  uri: string | null;
  onPhoto: (uri: string) => void;
}

export function PhotoButton({ uri, onPhoto }: PhotoButtonProps) {
  async function handlePress() {
    Alert.alert('Adicionar Foto', 'Escolha a origem:', [
      {
        text: 'Câmera',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.7,
          });
          if (!result.canceled && result.assets[0]) {
            onPhoto(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Galeria',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.7,
          });
          if (!result.canceled && result.assets[0]) {
            onPhoto(result.assets[0].uri);
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.7}>
      {uri ? (
        <Image source={{ uri }} style={styles.preview} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.icon}>📷</Text>
          <Text style={styles.text}>ADICIONAR FOTO (opcional)</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0dcd5',
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginTop: 16,
  },
  placeholder: {
    padding: 24,
    alignItems: 'center',
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7a7a7a',
  },
  preview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
});
