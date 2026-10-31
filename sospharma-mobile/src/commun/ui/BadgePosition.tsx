import { StyleSheet, View } from 'react-native';

import { t } from '../lib/i18n';
import { rayons } from '../theme/rayons';
import { useTheme } from '../theme/Theme';
import { IconeLieu } from './icones/trait';
import { Texte } from './Texte';

/**
 * Badge ocre « Position à confirmer » : pharmacie de garde publiée sans position GPS (absente
 * d'OpenStreetMap, pas encore relevée). Ni distance, ni carte, ni itinéraire : on l'appelle.
 * petit : lignes de liste (20 px) ; sinon carte « La plus proche » et fiche (22 px).
 */
export function BadgePosition({ petit = false, testID }: { petit?: boolean; testID?: string }) {
  const { couleurs: c } = useTheme();
  return (
    <View testID={testID} style={[styles.badge, petit ? styles.petit : styles.normal, { backgroundColor: c.ocreClair }]}>
      <IconeLieu size={petit ? 10 : 12} color={c.ocreTexte} strokeWidth={2.6} />
      <Texte variante={petit ? 'miniFort' : 'libelleFort'} couleur={c.ocreTexte} numberOfLines={1}>
        {t('commun.positionAConfirmer')}
      </Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: rayons.pilule, flexShrink: 1 },
  normal: { height: 22, paddingHorizontal: 8, gap: 4 },
  petit: { height: 20, paddingHorizontal: 7, gap: 3 },
});
