import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ombres, rayons, useTheme } from '@/commun/theme';
import { Texte } from '@/commun/ui';

type Props = {
  titre: string;
  /** Lignes du groupe (`LigneMenu`) : un filet de 1 px est posé entre deux lignes. */
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Groupe de réglages du Profil (piste A, 11 nov.) : titre en petites capitales grises, puis les
 * lignes dans une carte blanche arrondie. Les filets sont des aplats de 1 px (pas de bordure).
 */
export function GroupeReglages({ titre, children, style, testID }: Props) {
  const { couleurs: c, estNuit } = useTheme();
  const lignes = Children.toArray(children);
  return (
    <View style={[styles.groupe, style]} testID={testID}>
      <Texte variante="petitFort" titre couleur={c.texteSecondaire} style={styles.titre}>
        {titre}
      </Texte>
      <View style={[styles.carte, { backgroundColor: c.carte }, !estNuit && ombres.carte]}>
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
  // Le titre s'aligne à 20 du bord (gouttière de l'app) ; la carte, elle, s'élargit à 16.
  titre: { paddingHorizontal: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  carte: { paddingHorizontal: 16, borderRadius: rayons.grandeCarte },
  filet: { height: 1 },
});
