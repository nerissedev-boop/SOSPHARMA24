import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import type { StatutPharmacie } from '../api/schema';
import { t } from '../lib/i18n';
import { useTheme } from '../theme/Theme';
import { usePulsation } from './animations';
import { HiPharmacy, HiPharmacyOutline } from './icones/healthicons';
import { Texte } from './Texte';

type Props = {
  statut: StatutPharmacie;
  taille?: number;
  /** Petit badge « 24 » (garde) en haut à droite, comme dans les blocs et sur la carte. */
  badge24?: boolean;
  /** Fond de la pastille « fermée » (blanc sur la carte). */
  fondFerme?: string;
  /** Taille de la coupe d'Hygie (par défaut ≈ 64 % de la pastille). */
  tailleIcone?: number;
  style?: StyleProp<ViewStyle>;
  /** « ocre » : ferme dans moins de 30 min (pastille ocre, coupe blanche). */
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
 * Pastille de statut (élément réellement rond, exception de la charte) :
 * verte + coupe d'Hygie blanche = ouverte ; rouge + coupe blanche (+ badge 24) = de garde ;
 * gris clair + coupe en contour gris = fermée.
 */
export function PastilleStatut({
  statut,
  taille = 40,
  badge24 = false,
  fondFerme,
  tailleIcone,
  style,
  annoncee = false,
  pulsation = false,
  ton,
  testID,
}: Props) {
  const { couleurs: c } = useTheme();
  const fond = ton === 'ocre' && statut !== 'fermee' ? c.ocrePoint : statut === 'garde' ? c.rouge : statut === 'ouverte' ? c.vert : (fondFerme ?? c.fermeFond);
  const { valeur, enMarche } = usePulsation(pulsation && statut === 'garde');
  const styleHalo = useAnimatedStyle(() => ({
    opacity: interpolate(valeur.get(), [0, 1], [0.45, 0]),
    transform: [{ scale: interpolate(valeur.get(), [0, 1], [1, 1.6]) }],
  }));
  const icone = tailleIcone ?? Math.round(taille * (statut === 'fermee' ? 0.6 : 0.65));
  const libelle =
    statut === 'garde' ? t('statut.pastilleGarde') : statut === 'ouverte' ? t('statut.pastilleOuverte') : t('statut.pastilleFermee');
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
      {statut === 'fermee' ? (
        <HiPharmacyOutline size={icone} color={c.fermeIcone} />
      ) : (
        <HiPharmacy size={icone} color={c.blanc} />
      )}
      {statut === 'garde' && badge24 ? (
        <View style={[styles.badge, { backgroundColor: c.blanc }]} testID="badge-24">
          <Texte variante="miniFort" couleur={c.rouge} style={styles.texteBadge}>
            24
          </Texte>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pastille: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  badge: {
    position: 'absolute',
    top: -7,
    right: -9,
    paddingHorizontal: 3,
    borderRadius: 0,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  texteBadge: { fontSize: 10, lineHeight: 13 },
});
