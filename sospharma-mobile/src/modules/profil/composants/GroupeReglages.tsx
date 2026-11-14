import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { rayons, useTheme } from '@/commun/theme';
import { Texte } from '@/commun/ui';

type Props = {
  titre: string;
  /** Lignes du groupe (`LigneMenu`) : un filet de 1 px est posé entre deux lignes. */
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Groupe de réglages du Profil (refonte v2) : titre en casse normale, puis les lignes dans une
 * surface blanche à plat. Les filets sont des aplats de 1 px (pas de bordure).
 */
export function GroupeReglages({ titre, children, style, testID }: Props) {
  const { couleurs: c } = useTheme();
  const lignes = Children.toArray(children);
  return (
    <View style={[styles.groupe, style]} testID={testID}>
      <Texte variante="section" titre style={styles.titre}>
        {titre}
      </Texte>
      <View style={[styles.carte, { backgroundColor: c.carte }]}>
        {lignes.map((ligne, rang) => (
          <Fragment key={rang}>
            {rang > 0 ? <View style={[styles.filet, { backgroundColor: c.separateur }]} /> : null}
            {ligne}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  groupe: { gap: 8 },
  // Le titre s'aligne sur le texte des lignes (16 + 4) ; la surface, elle, s'élargit à 16.
  titre: { paddingHorizontal: 4 },
  carte: { paddingHorizontal: 16, borderRadius: rayons.surface },
  filet: { height: 1 },
});
