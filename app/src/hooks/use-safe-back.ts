import { useCallback, useRef } from 'react';
import { Keyboard, BackHandler } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

/**
 * Envelope único pra botão voltar (BrandHeader, WizardFlow, Android hardware back).
 *
 * Problemas que resolve:
 *  1. Teclado aberto engolindo o 1º toque — dismiss antes de navegar.
 *  2. Double-tap / press durante animação — debounce de 400ms via ref (state é
 *     assíncrono e não segura taps rápidos).
 *  3. Stack vazia (`canGoBack === false`, comum depois de `router.replace`) fazia
 *     `router.back()` virar no-op silencioso — agora cai no `fallback` se existir.
 *
 * API:
 *  - Passe `onBack` pra preservar comportamento custom (ex: sair de um modo de
 *    review) — o wrapper aplica dismiss + debounce.
 *  - Passe `fallback` pra ancorar a navegação quando não houver stack — ex: rota
 *    de reabastecimento (`router.replace` apaga o histórico de `carregar`).
 */
export function useSafeBack(onBack?: () => void, fallback?: string) {
  const navigating = useRef(false);

  const handler = useCallback(() => {
    if (navigating.current) return;
    navigating.current = true;
    // Libera antes da animação do Stack terminar pra não bloquear o próximo
    // back legítimo; 400ms empiricamente cobre a transição default do expo-router.
    setTimeout(() => {
      navigating.current = false;
    }, 400);

    Keyboard.dismiss();
    // requestAnimationFrame evita que o mesmo frame em que dispatchamos o
    // dismiss engula o router.back() — separa os dois em frames distintos.
    requestAnimationFrame(() => {
      if (onBack) {
        onBack();
      } else if (router.canGoBack()) {
        router.back();
      } else if (fallback) {
        router.replace(fallback as never);
      }
    });
  }, [onBack, fallback]);

  // Alinha Android hardware back com o botão visual. Retorna true = consumimos
  // o evento (não deixar o comportamento default rodar em paralelo).
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handler();
        return true;
      });
      return () => sub.remove();
    }, [handler])
  );

  return handler;
}
