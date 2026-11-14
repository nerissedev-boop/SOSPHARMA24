import { StyleSheet, View } from 'react-native';

import type { StatutPharmacie } from '../api/schema';
import { t } from '../lib/i18n';
import type { TonStatut } from '../regles/libelles';
import { estInactive } from '../regles/statut';
import type { Jetons } from '../theme/jetons';
import { rayons } from '../theme/rayons';
import { useTheme } from '../theme/Theme';
import type { Variante } from '../theme/typographie';
import { IconeCroix } from './icones/trait';
import { Texte } from './Texte';

/**
 * Statut en un coup d'œil : couleur du repère et du texte, libellé court, libellé lu.
 * vert = ouverte, « 24 » rouge = de garde, ocre = ferme bientôt (moins de 30 min),
 * croix éteinte = fermée ou horaires à confirmer.
 */
export function infosStatut(statut: StatutPharmacie, ton: TonStatut | undefined, c: Jetons) {
  if (ton === 'ocre' && !estInactive(statut)) {
    return { repere: c.ocrePoint, texte: c.ocreTexte, court: t('statut.courtBientot'), lu: t('statut.pastilleBientot') };
  }
  if (statut === 'garde') return { repere: c.rouge, texte: c.rougeTexteFort, court: t('statut.courtGarde'), lu: t('statut.pastilleGarde') };
  if (statut === 'ouverte') return { repere: c.vert, texte: c.vertTexte, court: t('statut.ouverte'), lu: t('statut.pastilleOuverte') };
  if (statut === 'inconnue') {
    return { repere: c.texteTertiaire, texte: c.texteSecondaire, court: t('statut.courtInconnue'), lu: t('statut.pastilleInconnue') };
  }
  return { repere: c.texteTertiaire, texte: c.texteSecondaire, court: t('statut.fermee'), lu: t('statut.pastilleFermee') };
}

/** Petit « 24 » rouge de la garde : la garde se reconnaît à lui, jamais à une croix rouge. */
export function Badge24({ testID = 'badge-24' }: { testID?: string }) {
  const { couleurs: c } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: c.rouge }]} testID={testID} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Texte variante="miniFort" couleur={c.texteSurCouleur} style={styles.texteBadge} maxFontSizeMultiplier={1.3}>
        24
      </Texte>
    </View>
  );
}

type Props = {
  statut: StatutPharmacie;
  ton?: TonStatut;
  /** Texte affiché après le repère ; par défaut le libellé court (« Ouverte », « De garde »). */
  libelle?: string;
  variante?: Variante;
  numberOfLines?: number;
  testID?: string;
};

/**
 * Repère d'état : la croix de l'officine, allumée quand la pharmacie est ouverte, éteinte quand
 * elle est fermée ; le « 24 » pour la garde. Le texte accompagne toujours le repère.
 */
export function RepereStatut({ statut, ton, libelle, variante = 'petitFort', numberOfLines = 2, testID }: Props) {
  const { couleurs: c } = useTheme();
  const infos = infosStatut(statut, ton, c);
  const texte = libelle ?? infos.court;
  return (
    <View style={styles.repere} accessible accessibilityLabel={texte === infos.court ? infos.lu : texte} testID={testID}>
      {statut === 'garde' ? (
        <Badge24 testID={testID ? `${testID}-24` : undefined} />
      ) : (
        <IconeCroix size={12} color={infos.repere} plein={!estInactive(statut)} />
      )}
      <Texte variante={variante} couleur={infos.texte} numberOfLines={numberOfLines} style={styles.texte}>
        {texte}
      </Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  repere: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  texte: { flexShrink: 1 },
  badge: { minWidth: 22, height: 16, paddingHorizontal: 4, borderRadius: rayons.repere, alignItems: 'center', justifyContent: 'center' },
  texteBadge: { fontSize: 10, lineHeight: 13 },
});
