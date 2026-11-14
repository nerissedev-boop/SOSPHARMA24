import { StyleSheet, View } from 'react-native';

import { momentPasse } from '../lib/format';
import { t } from '../lib/i18n';
import { useEnLigne } from '../lib/reseau';
import { rayons } from '../theme/rayons';
import { useTheme } from '../theme/Theme';
import { IconeSansReseau } from './icones/trait';
import { Texte } from './Texte';

type Props = {
  /** Dernière mise à jour des données affichées (`dataUpdatedAt` du cache), en millisecondes. */
  misAJourLe?: number | null;
  fuseau: string;
  /** Couleur de la phrase sous le repère : celle du texte doux du bandeau qui l'accueille. */
  couleurTexte?: string;
  /** Force l'affichage (tests, maintenance). */
  visible?: boolean;
};

/**
 * Hors connexion, dans le bandeau de l'écran : un repère ocre (une attente) qui donne l'heure de la
 * dernière mise à jour, puis le rappel que l'appel passe sans internet. Rien ne tourne.
 */
export function BandeauHorsConnexion({ misAJourLe, fuseau, couleurTexte, visible }: Props) {
  const enLigne = useEnLigne();
  const { couleurs: c } = useTheme();
  if (!(visible ?? !enLigne)) return null;
  // dataUpdatedAt vaut 0 tant que rien n'a été chargé.
  const quand = misAJourLe ? momentPasse(new Date(misAJourLe), fuseau) : null;
  return (
    <View testID="bandeau-hors-connexion" accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.bloc}>
      <View style={[styles.repere, { backgroundColor: c.attenteFond }]}>
        <IconeSansReseau size={14} color={c.attenteTexte} />
        <Texte variante="libelleFort" couleur={c.attenteTexte} style={styles.texte}>
          {quand ? t('horsConnexion.miseAJour', { quand }) : t('horsConnexion.titre')}
        </Texte>
      </View>
      <Texte variante="petit" couleur={couleurTexte ?? c.texteSecondaire}>
        {t('horsConnexion.appels')}
      </Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { gap: 6, alignItems: 'flex-start' },
  repere: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 28, paddingHorizontal: 10, paddingVertical: 4, borderRadius: rayons.repere },
  texte: { flexShrink: 1 },
});
