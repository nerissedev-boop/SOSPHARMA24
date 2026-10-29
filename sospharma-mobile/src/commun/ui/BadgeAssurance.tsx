import { StyleSheet, View } from 'react-native';

import { t } from '../lib/i18n';
import { rayons } from '../theme/rayons';
import { useTheme } from '../theme/Theme';
import { IconeCoche } from './icones/trait';
import { Texte } from './Texte';

/**
 * Badge vert « ✓ Votre assurance » (maquette Garde « cartes arrondies ») : la pharmacie accepte
 * au moins une des assurances enregistrées sur le téléphone (`accepte_mes_assurances === true`).
 * petit : lignes de liste (20 px) ; sinon carte « La plus proche » (22 px).
 */
export function BadgeAssurance({ petit = false, testID }: { petit?: boolean; testID?: string }) {
  const { couleurs: c } = useTheme();
  return (
    <View testID={testID} style={[styles.badge, petit ? styles.petit : styles.normal, { backgroundColor: c.vertClair }]}>
      <IconeCoche size={petit ? 10 : 12} color={c.vertTexte} strokeWidth={3.4} />
      <Texte variante={petit ? 'miniFort' : 'libelleFort'} couleur={c.vertTexte} numberOfLines={1}>
        {t('commun.votreAssurance')}
      </Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: rayons.pilule, flexShrink: 1 },
  normal: { height: 22, paddingHorizontal: 8, gap: 4 },
  petit: { height: 20, paddingHorizontal: 7, gap: 3 },
});
