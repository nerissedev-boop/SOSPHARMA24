import { StyleSheet, View } from 'react-native';

import type { PropsCarteBase, PropsRepere, PropsTrace } from './types';

/**
 * Repli web : MapLibre React Native ne vise qu'iOS et Android. Sur le web (aperçu,
 * export), les écrans affichent la liste à la place de la carte.
 */
export const carteDisponible = false;

export function CarteBase({ style, testID }: PropsCarteBase) {
  return <View testID={testID} style={[StyleSheet.absoluteFill, styles.fond, style]} />;
}

export function Repere(_props: PropsRepere) {
  return null;
}

export function Trace(_props: PropsTrace) {
  return null;
}

const styles = StyleSheet.create({ fond: { backgroundColor: '#EEF1EF' } });
