import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { useTheme } from '../theme/Theme';

type Props = {
  /** « grande » : bandeau de la carte « La plus proche » ; « vignette » : carré 56 des lignes. */
  taille: 'grande' | 'vignette';
  /** Taille et arrondi du cadre (le fond sable et l'alignement en bas sont fournis). */
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Devanture dessinée (auvent vert et croix) affichée tant que la pharmacie n'a pas de photo
 * de façade validée. Tracés repris tels quels de la maquette B (Arrondi.dc.html).
 */
export function FacadeIllustree({ taille, style, testID }: Props) {
  const { couleurs: c, estNuit } = useTheme();
  const mur = estNuit ? '#2A3530' : '#F6F2EB';
  const ouverture = estNuit ? '#3A4741' : '#CFC7B8';
  const cadre = [styles.cadre, { backgroundColor: estNuit ? c.surface : '#E4DED3' }, style];
  if (taille === 'grande') {
    return (
      <View style={cadre} testID={testID}>
        <Svg width={150} height={86} viewBox="0 0 150 86">
          <Rect x={10} y={30} width={130} height={56} fill={mur} />
          <Path d="M4 30h142l-8-18H12z" fill={c.vert} />
          <Rect x={58} y={50} width={34} height={36} fill={ouverture} />
          <Rect x={20} y={46} width={28} height={22} fill={ouverture} />
          <Rect x={102} y={46} width={28} height={22} fill={ouverture} />
          <Rect x={66} y={0} width={18} height={18} fill={c.vert} />
          <Path d="M75 3v12M69 9h12" stroke='#FFFFFF' strokeWidth={3} />
        </Svg>
      </View>
    );
  }
  return (
    <View style={cadre} testID={testID}>
      <Svg width={48} height={36} viewBox="0 0 48 36">
        <Rect x={4} y={14} width={40} height={22} fill={mur} />
        <Path d="M1 14h46l-3-7H4z" fill={c.vert} />
        <Rect x={19} y={22} width={10} height={14} fill={ouverture} />
        <Rect x={20} y={0} width={8} height={8} fill={c.vert} />
        <Path d="M24 1.5v5M21.5 4h5" stroke='#FFFFFF' strokeWidth={1.6} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: { overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' },
});
