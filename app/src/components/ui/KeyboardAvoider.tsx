import React from 'react';
import { KeyboardAvoidingView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Empurra o conteúdo pra cima quando o teclado sobe, pra ele não cobrir campo
 * nem botão de salvar.
 *
 * `behavior="padding"` nos DOIS sistemas, de propósito. No Android o SDK 54 é
 * edge-to-edge obrigatório e a janela não encolhe mais sozinha com o teclado,
 * então `padding` é necessário; e onde ela ainda encolhe, o próprio RN calcula
 * `frame.y + frame.height − keyboardY`, que dá ~0 quando o frame já subiu — ou
 * seja, não soma padding em cima do resize. Um `Platform.select` aqui seria
 * duas rotas pra manter sem ganho.
 *
 * Envolver SEMPRE o ScrollView **e** o rodapé fixo juntos. Deixar o rodapé de
 * fora mantém o botão de salvar enterrado sob o teclado, que é metade do bug.
 * Cabeçalho fica de fora — ele deve continuar visível.
 *
 * Não combinar com `automaticallyAdjustKeyboardInsets` no ScrollView de dentro:
 * os dois somam e abrem um vão morto do tamanho do teclado.
 */
export function KeyboardAvoider({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.fill, style]}>
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
