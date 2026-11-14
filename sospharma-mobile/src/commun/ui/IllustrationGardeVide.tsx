import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '../theme/Theme';

type Props = {
  /** Côté du dessin (140 par défaut, comme le cercle de l'état vide). */
  taille?: number;
  testID?: string;
};

/**
 * État vide « aucune pharmacie de garde » : devanture fermée (même trait que FacadeIllustree),
 * auvent vert, rideau baissé, sous un croissant de lune rouge, dans un cercle vert pâle.
 * Couleurs du thème uniquement : le dessin suit le mode nuit. Décoratif (masqué au lecteur d'écran).
 */
export function IllustrationGardeVide({ taille = 140, testID = 'illustration-garde-vide' }: Props) {
  const { couleurs: c } = useTheme();
  return (
    <View testID={testID} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={taille} height={taille} viewBox="0 0 140 140">
        <Circle cx={70} cy={70} r={70} fill={c.vertClair} />
        {/* Croissant de lune (couleur des gardes) et deux petites étoiles. */}
        <Circle cx={100} cy={36} r={13} fill={c.rouge} />
        <Circle cx={106} cy={31} r={11} fill={c.vertClair} />
        <Circle cx={36} cy={34} r={2.2} fill={c.texteTertiaire} />
        <Circle cx={52} cy={22} r={1.6} fill={c.texteTertiaire} />
        {/* Devanture : mur, auvent vert, enseigne à croix. */}
        <Rect x={30} y={66} width={80} height={46} fill={c.carte} />
        <Path d="M24 66h92l-6-14H30z" fill={c.vert} />
        <Rect x={61} y={36} width={18} height={18} rx={3} fill={c.vert} />
        <Path d="M70 39v12M64 45h12" stroke={c.blanc} strokeWidth={3} strokeLinecap="round" />
        {/* Rideau baissé : la pharmacie est fermée. */}
        <Rect x={52} y={78} width={36} height={34} fill={c.fermeFond} />
        <Path d="M52 85h36M52 92h36M52 99h36M52 106h36" stroke={c.fermeIcone} strokeWidth={1.4} strokeOpacity={0.45} />
        <Rect x={36} y={76} width={12} height={14} fill={c.fermeFond} />
        <Rect x={92} y={76} width={12} height={14} fill={c.fermeFond} />
        {/* Sol. */}
        <Path d="M22 112h96" stroke={c.fermeIcone} strokeWidth={2} strokeLinecap="round" strokeOpacity={0.35} />
      </Svg>
    </View>
  );
}
