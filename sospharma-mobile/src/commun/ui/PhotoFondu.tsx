import { useState, type ReactNode } from 'react';
import type { ImageStyle, StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '../theme/Theme';
import { useApparitionImage } from './animations';

type Props = {
  uri: string;
  /** Taille, arrondi et fond du cadre (le fond sert de place réservée pendant le chargement). */
  style?: StyleProp<ViewStyle & ImageStyle>;
  /** Affiché à la place de la photo si elle ne charge pas (réseau coupé, lien cassé). */
  repli?: ReactNode;
  onError?: () => void;
  testID?: string;
};

/**
 * Photo de façade venue du réseau : invisible jusqu'au chargement, puis fondu court.
 * En cas d'échec, le repli (la devanture dessinée) prend sa place plutôt qu'un cadre vide.
 */
export function PhotoFondu({ uri, style, repli, onError, testID }: Props) {
  const { couleurs: c, estNuit } = useTheme();
  const { style: apparition, onLoad } = useApparitionImage();
  // On retient l'adresse qui a échoué : une nouvelle adresse (ligne recyclée) retente d'elle-même.
  const [adresseEchouee, setAdresseEchouee] = useState<string | null>(null);

  if (adresseEchouee === uri && repli !== undefined) return <>{repli}</>;
  return (
    <View style={[style as StyleProp<ViewStyle>, styles.cadre]}>
      <Animated.Image
        source={{ uri }}
        onLoad={onLoad}
        onError={() => {
          setAdresseEchouee(uri);
          onError?.();
        }}
        style={[StyleSheet.absoluteFill, apparition]}
        resizeMode="cover"
        accessible={false}
        testID={testID}
      />
      {estNuit ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.voilePhoto }]} testID={testID ? `${testID}-voile` : undefined} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: { overflow: 'hidden' },
});
