import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { StatutPharmacie } from '../api/schema';
import type { TonStatut } from '../regles/libelles';
import { distanceKm } from '../lib/format';
import { t } from '../lib/i18n';
import { CIBLE_TACTILE } from '../theme/espacements';
import { useTheme } from '../theme/Theme';
import { apparitionLigne } from './animations';
import { DistanceMarche } from './DistanceMarche';
import { HiPhone } from './icones/healthicons';
import { PastilleStatut } from './PastilleStatut';
import { Texte } from './Texte';

export type PropsLignePharmacie = {
  nom: string;
  statut: StatutPharmacie;
  libelleStatut: string;
  distanceM: number | null;
  marcheMin: number | null;
  onPress?: () => void;
  /** Bouton rond « Appeler » à droite (listes) ; absent dans les favoris. */
  onAppeler?: () => void;
  /** Ton calculé (tonAffiche) : « ocre » quand la pharmacie ferme dans moins de 30 min. */
  ton?: TonStatut;
  /** Variante « favori » du profil : pastille 38, distance seule. */
  variante?: 'liste' | 'favori';
  iconeMarche?: boolean;
  /** Position dans la liste : la ligne apparaît en cascade (fondu et glissement). Absent : pas d'animation. */
  rang?: number;
  testID?: string;
};

/** Ligne de liste des maquettes Accueil, Garde et Profil (sans bordure ni séparateur). */
export function LignePharmacie({
  nom,
  statut,
  libelleStatut,
  distanceM,
  marcheMin,
  onPress,
  onAppeler,
  variante = 'liste',
  iconeMarche = true,
  ton,
  rang,
  testID,
}: PropsLignePharmacie) {
  const { couleurs: c } = useTheme();
  const couleurStatut = ton === 'ocre' ? c.ocreTexte : statut === 'garde' ? c.rougeTexteFort : statut === 'ouverte' ? c.vertTexte : c.texteTertiaire;
  const favori = variante === 'favori';
  const description = [nom, libelleStatut, distanceKm(distanceM)].filter(Boolean).join(', ');
  return (
    <Animated.View entering={apparitionLigne(rang)} style={[styles.ligne, favori && styles.ligneFavori]} testID={testID}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={description}
        style={({ pressed }) => [styles.zone, { opacity: pressed ? 0.7 : 1 }]}
      >
        <PastilleStatut statut={statut} pulsation={!favori} ton={ton === 'ocre' ? 'ocre' : undefined} taille={favori ? 38 : 40} tailleIcone={favori ? (statut === 'fermee' ? 22 : 24) : statut === 'fermee' ? 24 : 26} />
        <View style={styles.textes}>
          <Texte variante={favori ? 'nom' : 'nomPetit'} numberOfLines={1}>
            {nom}
          </Texte>
          <Texte variante="libelleMoyen" couleur={couleurStatut} numberOfLines={1}>
            {libelleStatut}
          </Texte>
        </View>
        {favori ? (
          <Texte variante="boutonPetit" style={styles.distanceFavori}>
            {distanceKm(distanceM)}
          </Texte>
        ) : (
          <DistanceMarche distanceM={distanceM} marcheMin={marcheMin} icone={iconeMarche} />
        )}
      </Pressable>
      {onAppeler ? (
        <Pressable
          onPress={onAppeler}
          accessibilityRole="button"
          accessibilityLabel={`${t('commun.appeler')} ${nom}`}
          testID={testID ? `${testID}-appeler` : undefined}
          style={({ pressed }) => [styles.appel, { backgroundColor: c.pastilleAction, opacity: pressed ? 0.8 : 1 }]}
        >
          <HiPhone size={20} color={c.pastilleActionIcone} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  ligneFavori: { minHeight: 58, paddingVertical: 0 },
  zone: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0, minHeight: CIBLE_TACTILE },
  textes: { flex: 1, gap: 3, minWidth: 0 },
  distanceFavori: { fontSize: 13 },
  appel: {
    width: CIBLE_TACTILE,
    height: CIBLE_TACTILE,
    borderRadius: CIBLE_TACTILE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
