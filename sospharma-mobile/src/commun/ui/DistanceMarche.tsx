import { StyleSheet, View } from 'react-native';

import { distanceKm } from '../lib/format';
import { t } from '../lib/i18n';
import { useTheme } from '../theme/Theme';
import type { Variante } from '../theme/typographie';
import { HiWalking } from './icones/healthicons';
import { Texte } from './Texte';

type Props = {
  distanceM: number | null;
  marcheMin: number | null;
  /** Taille du chiffre de distance : grande (blocs, 17–18) ou normale (listes, 14). */
  grande?: boolean;
  varianteDistance?: Variante;
  /** Couleur du texte (en-têtes colorés). */
  couleur?: string;
  couleurSecondaire?: string;
  /** Affiche l'icône de marche (sinon « 9 min » seul, comme sur l'accueil nuit). */
  icone?: boolean;
};

/** Bloc aligné à droite : « 0,4 km » puis la marche « 6 min » avec l'icône piéton. */
export function DistanceMarche({
  distanceM,
  marcheMin,
  grande = false,
  varianteDistance,
  couleur,
  couleurSecondaire,
  icone = true,
}: Props) {
  const { couleurs: c } = useTheme();
  if (distanceM === null) return null;
  return (
    <View style={styles.bloc}>
      <Texte variante={varianteDistance ?? (grande ? 'distanceGrande' : 'nomPetit')} couleur={couleur}>
        {distanceKm(distanceM)}
      </Texte>
      {marcheMin !== null ? (
        <View style={styles.marche}>
          {icone ? <HiWalking size={grande ? 15 : 14} color={couleurSecondaire ?? c.texteSecondaire} /> : null}
          <Texte variante="libelle" couleur={couleurSecondaire ?? c.texteSecondaire}>
            {t('commun.min', { valeur: marcheMin })}
          </Texte>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { alignItems: 'flex-end', gap: 3 },
  marche: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
