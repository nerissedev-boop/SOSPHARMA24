import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import type { StatutPharmacie } from '../api/schema';
import { estInactive } from '../regles/statut';
import { t } from '../lib/i18n';
import { useTheme } from '../theme/Theme';
import { usePulsation } from './animations';
import { IconeCroix } from './icones/trait';
import { Texte } from './Texte';

type Props = {
  statut: StatutPharmacie;
  taille?: number;
  /** Fond de la pastille « fermée » (blanc sur la carte). */
  fondFerme?: string;
  /** Taille de la croix (par défaut 60 % de la pastille). */
  tailleIcone?: number;
  style?: StyleProp<ViewStyle>;
  /** « ocre » : ferme dans moins de 30 min (pastille ocre, croix foncée). */
  ton?: 'ocre';
  /** Décorative si elle accompagne un texte de statut (par défaut). */
  annoncee?: boolean;
  /**
   * Halo rouge qui s'étend et s'efface autour d'une pastille de garde (listes).
   * Désactivé par défaut : la carte affiche trop de pastilles pour les animer toutes.
   */
  pulsation?: boolean;
  testID?: string;
};

/**
 * Pastille de statut (élément réellement rond, exception de la charte). La forme dit l'état et la
 * couleur le confirme : on les distingue sans voir le rouge ni le vert (WCAG 1.4.1).
 * - de garde : « 24 » blanc sur rouge, de jour comme de nuit ;
 * - ouverte : croix pleine blanche sur vert, la croix allumée de l'officine ;
 * - ferme bientôt : croix pleine foncée sur ocre ;
 * - fermée ou horaires à confirmer : croix en contour, éteinte, sur gris clair.
 */
export function PastilleStatut({ statut, taille = 40, fondFerme, tailleIcone, style, annoncee = false, pulsation = false, ton, testID }: Props) {
  const { couleurs: c } = useTheme();
  const inactive = estInactive(statut);
  const ocre = ton === 'ocre' && !inactive && statut !== 'garde';
  const fond = ocre ? c.ocrePoint : statut === 'garde' ? c.rouge : statut === 'ouverte' ? c.vert : (fondFerme ?? c.fermeFond);
  const { valeur, enMarche } = usePulsation(pulsation && statut === 'garde');
  const styleHalo = useAnimatedStyle(() => ({
    opacity: interpolate(valeur.get(), [0, 1], [0.45, 0]),
    transform: [{ scale: interpolate(valeur.get(), [0, 1], [1, 1.6]) }],
  }));
  const icone = tailleIcone ?? Math.round(taille * 0.6);
  // « 24 » à peu près aussi large que la croix : il remplit le disque sans toucher le bord.
  const corps24 = Math.round(taille * 0.42);
  const libelle =
    statut === 'garde'
      ? t('statut.pastilleGarde')
      : statut === 'ouverte'
        ? t('statut.pastilleOuverte')
        : statut === 'inconnue'
          ? t('statut.pastilleInconnue')
          : t('statut.pastilleFermee');
  return (
    <View
      testID={testID ?? `pastille-${statut}`}
      accessible={annoncee}
      accessibilityLabel={annoncee ? libelle : undefined}
      importantForAccessibility={annoncee ? 'yes' : 'no-hide-descendants'}
      style={[styles.pastille, { width: taille, height: taille, borderRadius: taille / 2, backgroundColor: fond }, style]}
    >
      {enMarche ? (
        <Animated.View
          testID="halo-garde"
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { borderRadius: taille / 2, backgroundColor: fond }, styleHalo]}
        />
      ) : null}
      {statut === 'garde' ? (
        // Taille fixe : le « 24 » est dessiné dans un disque de taille fixe, il ne suit pas la police système.
        <Texte
          variante="distanceGrande"
          couleur={c.blanc}
          allowFontScaling={false}
          style={[styles.chiffres, { fontSize: corps24, lineHeight: Math.round(corps24 * 1.15) }]}
          testID="pastille-24"
        >
          24
        </Texte>
      ) : (
        <IconeCroix size={icone} color={inactive ? c.fermeIcone : ocre ? c.ocreIcone : c.blanc} plein={!inactive} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pastille: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  chiffres: { fontVariant: ['tabular-nums'], includeFontPadding: false, textAlign: 'center' },
});
