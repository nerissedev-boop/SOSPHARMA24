import { StyleSheet, View } from 'react-native';

import { t } from '../lib/i18n';
import { useEnLigne } from '../lib/reseau';
import { useTheme } from '../theme/Theme';
import { Texte } from './Texte';

type Props = {
  /** Date du tour de garde enregistré, déjà formatée (« 17 oct. »). */
  dateGarde?: string | null;
  /** Force l'affichage (tests, maintenance). */
  visible?: boolean;
};

/** « Hors connexion, liste de garde du 17 oct. enregistrée » : aplat, sans bordure. */
export function BandeauHorsConnexion({ dateGarde, visible }: Props) {
  const enLigne = useEnLigne();
  const { couleurs: c } = useTheme();
  if (!(visible ?? !enLigne)) return null;
  return (
    <View
      testID="bandeau-hors-connexion"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.bandeau, { backgroundColor: c.bandeauInfo }]}
    >
      <View style={[styles.point, { backgroundColor: c.texteTertiaire }]} />
      <Texte variante="petitFort" couleur={c.bandeauInfoTexte} style={styles.texte}>
        {dateGarde ? t('horsConnexion.bandeau', { date: dateGarde }) : t('horsConnexion.bandeauSansDate')}
      </Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  bandeau: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  point: { width: 8, height: 8, borderRadius: 4 },
  texte: { flex: 1 },
});
