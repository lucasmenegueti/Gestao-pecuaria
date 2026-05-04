import { Alert, Platform } from 'react-native';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string; // padrão: 'Confirmar'
  cancelLabel?: string;  // padrão: 'Cancelar'
  destructive?: boolean; // só afeta nativo (style='destructive')
}

/**
 * Confirmação binária cross-platform.
 *
 * No nativo (iOS/Android), usa `Alert.alert` com 2 botões. No web,
 * `Alert.alert` do react-native-web NÃO renderiza modal — silenciosamente
 * falha. Isso já gerou bugs sérios (cancelamento de rota não funcionava).
 * No web caímos em `window.confirm` que tem comportamento garantido.
 *
 * Retorna `true` se o user confirmou, `false` se cancelou.
 */
export function confirm(opts: ConfirmOptions): Promise<boolean> {
  const {
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    destructive = false,
  } = opts;

  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(text));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
