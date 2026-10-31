import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ombres } from '../theme/ombres';
import { useTheme } from '../theme/Theme';
import { IconeChevronDroite } from './icones/trait';
import { useBarreBas } from './margeBas';
import { Texte } from './Texte';

/** Pied d'écran fixe avec ombre douce vers le haut (Filtres, Signaler, Contact). */
export function PiedFixe({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { couleurs: c, estNuit } = useTheme();
  // Marge propre de 16 au-dessus de la barre de navigation (28 sans barre).
  const barre = useBarreBas();
  return (
    <View
      style={[
        styles.pied,
        { backgroundColor: c.fond, paddingBottom: barre > 0 ? barre + 16 : 28 },
        !estNuit && ombres.barre,
        style,
      ]}
    >
      {children}
    </View>
  );
}

type PropsLigneMenu = {
  libelle: string;
  sousTitre?: string;
  valeur?: string;
  onPress?: () => void;
  droite?: ReactNode;
  chevron?: boolean;
  testID?: string;
};

/** Ligne de réglage du profil (52 px mini, sans séparateur). */
export function LigneMenu({ libelle, sousTitre, valeur, onPress, droite, chevron = true, testID }: PropsLigneMenu) {
  const { couleurs: c } = useTheme();
  const contenu = (
    <>
      <View style={styles.textesMenu}>
        <Texte variante="corps" style={styles.libelleMenu}>
          {libelle}
        </Texte>
        {sousTitre ? (
          <Texte variante="libelle" couleur={c.texteSecondaire}>
            {sousTitre}
          </Texte>
        ) : null}
      </View>
      {valeur ? (
        // Valeur longue (plusieurs assurances) : une ligne, coupée, sans écraser le libellé.
        <Texte variante="boutonPetit" couleur={c.texteSecondaire} numberOfLines={1} style={styles.valeurMenu}>
          {valeur}
        </Texte>
      ) : null}
      {droite}
      {onPress && chevron ? <IconeChevronDroite size={16} color={c.texteTertiaire} /> : null}
    </>
  );
  if (!onPress) {
    return (
      <View style={[styles.ligneMenu, sousTitre ? styles.ligneHaute : null]} testID={testID}>
        {contenu}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[libelle, valeur].filter(Boolean).join(', ')}
      style={({ pressed }) => [styles.ligneMenu, sousTitre ? styles.ligneHaute : null, { opacity: pressed ? 0.7 : 1 }]}
    >
      {contenu}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pied: { paddingTop: 12, paddingHorizontal: 20, gap: 10 },
  ligneMenu: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  ligneHaute: { minHeight: 58 },
  textesMenu: { flex: 1, gap: 2 },
  libelleMenu: { lineHeight: 20 },
  valeurMenu: { flexShrink: 1, maxWidth: '45%', textAlign: 'right' },
});
